const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { verifyToken } = require('../middleware/auth');

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

// Get Stripe publishable key
router.get('/stripe/key', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return res.status(500).json({ message: 'Stripe configuration missing' });
  }
  res.json({ publishableKey });
});

// Create Stripe checkout session
router.post('/stripe/checkout', async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for invoice from ${invoice.clientName}`,
            },
            unit_amount: Math.round(invoice.totalWithFee * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}`,
      customer_email: invoice.clientEmail,
      metadata: { invoiceId: invoice._id.toString() },
    });

    res.json({ sessionId: session.id, clientSecret: session.client_secret });
  } catch (error) {
    next(error);
  }
});

// Verify Stripe checkout session
router.post('/stripe/verify', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID not found in session' });
    }

    if (session.payment_status === 'paid') {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice && invoice.status !== 'paid') {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        invoice.paidAmount = invoice.totalWithFee;
        invoice.paymentMethod = 'stripe';
        await invoice.save();

        await Payment.create({
          invoiceId: invoice._id,
          userId: invoice.userId,
          amount: invoice.totalWithFee,
          paymentMethod: 'stripe',
          transactionId: session.payment_intent,
          stripeSessionId: session.id,
          status: 'success',
          clientEmail: invoice.clientEmail,
          clientName: invoice.clientName,
          paidAt: new Date(),
        });
      }

      res.json({ message: 'Payment verified', invoiceId, paymentStatus: 'paid' });
    } else {
      res.status(400).json({ message: 'Payment not completed', paymentStatus: session.payment_status });
    }
  } catch (error) {
    next(error);
  }
});

// Create PayPal payment
router.post('/paypal/checkout', async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const paymentJson = {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment-success?invoice=${invoiceId}&method=paypal`,
        cancel_url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}`,
      },
      transactions: [
        {
          amount: {
            currency: 'USD',
            total: invoice.totalWithFee.toFixed(2),
          },
          description: `Invoice ${invoice.invoiceNumber}`,
          invoice_number: invoice.invoiceNumber,
        },
      ],
    };

    paypal.payment.create(paymentJson, (error, payment) => {
      if (error) {
        return next(error);
      }
      const redirectUrl = payment.links.find((l) => l.rel === 'approval_url').href;
      res.json({ redirectUrl, paymentId: payment.id });
    });
  } catch (error) {
    next(error);
  }
});

// Execute PayPal payment
router.post('/paypal/execute', async (req, res, next) => {
  try {
    const { paymentId, payerId, invoiceId } = req.body;

    paypal.payment.execute(paymentId, { payer_id: payerId }, async (error, payment) => {
      if (error) {
        return next(error);
      }

      if (payment.state === 'approved') {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
          invoice.paidAmount = invoice.totalWithFee;
          invoice.paymentMethod = 'paypal';
          await invoice.save();

          await Payment.create({
            invoiceId: invoice._id,
            userId: invoice.userId,
            amount: invoice.totalWithFee,
            paymentMethod: 'paypal',
            transactionId: payment.id,
            paypalPaymentId: payment.id,
            paypalExecutionId: payerId,
            status: 'success',
            clientEmail: invoice.clientEmail,
            clientName: invoice.clientName,
            paidAt: new Date(),
          });
        }

        res.json({ message: 'Payment successful', paymentId: payment.id });
      } else {
        res.status(400).json({ message: 'Payment not approved' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice && invoice.status !== 'paid') {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
          invoice.paidAmount = invoice.totalWithFee;
          invoice.paymentMethod = 'stripe';
          await invoice.save();

          await Payment.create({
            invoiceId: invoice._id,
            userId: invoice.userId,
            amount: invoice.totalWithFee,
            paymentMethod: 'stripe',
            transactionId: session.payment_intent,
            stripeSessionId: session.id,
            status: 'success',
            clientEmail: invoice.clientEmail,
            clientName: invoice.clientName,
            paidAt: new Date(),
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
