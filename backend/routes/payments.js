const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Configure PayPal
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

    let invoice;
    if (invoiceId) {
      invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    }

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Create Stripe session
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
      metadata: {
        invoiceId: invoice.id,
      },
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

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID not found in session' });
    }

    // Check if payment was successful
    if (session.payment_status === 'paid') {
      // Update invoice status if not already paid
      const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      if (invoice && invoice.status !== 'paid') {
        const now = Date.now();
        await db.prepare(`
          UPDATE invoices
          SET status = ?, updatedAt = ?
          WHERE id = ?
        `).run('paid', now, invoiceId);

        // Create payment record
        const paymentId = uuidv4();
        await db.prepare(`
          INSERT INTO payments (id, invoiceId, userId, amount, paymentMethod, transactionId, status, clientEmail, clientName, paidAt, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(paymentId, invoiceId, invoice.userId, invoice.totalWithFee, 'stripe', session.payment_intent, 'success', invoice.clientEmail, invoice.clientName, now, now);
      }

      res.json({
        message: 'Payment verified',
        invoiceId: invoiceId,
        paymentStatus: 'paid'
      });
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

    let invoice;
    if (invoiceId) {
      invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    }

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const paymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal',
        payer_info: {
          email: invoice.clientEmail,
          first_name: invoice.clientName.split(' ')[0],
          last_name: invoice.clientName.split(' ')[1] || '',
        },
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment-success?invoice=${invoiceId}&method=paypal`,
        cancel_url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}`,
      },
      transactions: [
        {
          amount: {
            currency: 'USD',
            total: invoice.totalWithFee.toFixed(2),
            details: {
              subtotal: invoice.total.toFixed(2),
              fee: invoice.paymentFee.toFixed(2),
            },
          },
          description: `Invoice ${invoice.invoiceNumber}`,
          invoice_number: invoice.invoiceNumber,
        },
      ],
    };

    paypal.payment.create(paymentJson, async (error, payment) => {
      if (error) {
        console.error('PayPal error:', error);
        return res.status(400).json({ message: 'PayPal error', error });
      } else {
        // Get redirect URL
        const redirectUrl = payment.links.find((link) => link.rel === 'approval_url').href;
        res.json({ redirectUrl, paymentId: payment.id });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Execute PayPal payment
router.post('/paypal/execute', async (req, res, next) => {
  try {
    const { paymentId, payerId, invoiceId } = req.body;

    const executePaymentJson = {
      payer_id: payerId,
    };

    paypal.payment.execute(paymentId, executePaymentJson, async (error, payment) => {
      if (error) {
        console.error('PayPal execute error:', error);
        return res.status(400).json({ message: 'Payment execution failed' });
      } else {
        if (payment.state === 'approved') {
          // Update invoice
          const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
          if (invoice) {
            const now = Date.now();
            await db.prepare(`
              UPDATE invoices
              SET status = ?, updatedAt = ?
              WHERE id = ?
            `).run('paid', now, invoiceId);

            // Create payment record
            const paymentRecord = {
              id: uuidv4(),
              invoiceId: invoice.id,
              userId: invoice.userId,
              amount: invoice.totalWithFee,
              paymentMethod: 'paypal',
              transactionId: payment.id,
              status: 'success',
              clientEmail: invoice.clientEmail,
              clientName: invoice.clientName,
              paidAt: now,
              createdAt: now,
            };

            await db.prepare(`
              INSERT INTO payments (id, invoiceId, userId, amount, paymentMethod, transactionId, status, clientEmail, clientName, paidAt, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(paymentRecord.id, paymentRecord.invoiceId, paymentRecord.userId, paymentRecord.amount, paymentRecord.paymentMethod, paymentRecord.transactionId, paymentRecord.status, paymentRecord.clientEmail, paymentRecord.clientName, paymentRecord.paidAt, paymentRecord.createdAt);
          }

          res.json({
            message: 'Payment successful',
            paymentId: payment.id,
          });
        } else {
          res.status(400).json({ message: 'Payment not approved' });
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook handler
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        // Update invoice
        const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
        if (invoice) {
          const now = Date.now();
          await db.prepare(`
            UPDATE invoices
            SET status = ?, updatedAt = ?
            WHERE id = ?
          `).run('paid', now, invoiceId);

          // Create payment record
          const paymentId = uuidv4();
          await db.prepare(`
            INSERT INTO payments (id, invoiceId, userId, amount, paymentMethod, transactionId, status, clientEmail, clientName, paidAt, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(paymentId, invoice.id, invoice.userId, invoice.totalWithFee, 'stripe', session.payment_intent, 'success', invoice.clientEmail, invoice.clientName, now, now);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
