const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { verifyToken } = require('../middleware/auth');

// PUBLIC: list non-draft invoices
router.get('/public/list', async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ status: { $ne: 'draft' } })
      .select('invoiceNumber clientName dueDate status totalWithFee')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// OWNER: list own invoices
router.get('/owner/list', verifyToken, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// Get single invoice by ID (public)
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { clientName, clientEmail, items, issueDate, dueDate, notes } = req.body;

    if (!clientName || !clientEmail || !items || !dueDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let subtotal = 0;
    const processedItems = items.map((item) => {
      const amount = item.quantity * item.rate;
      subtotal += amount;
      return { ...item, amount };
    });

    const tax = 0;
    const total = subtotal + tax;
    const paymentFee = total * 0.03;
    const totalWithFee = total + paymentFee;

    const invoice = await Invoice.create({
      userId: req.user.id,
      clientName,
      clientEmail,
      items: processedItems,
      subtotal,
      tax,
      total,
      paymentFee,
      totalWithFee,
      issueDate: issueDate || Date.now(),
      dueDate,
      notes,
      status: 'draft',
    });

    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (error) {
    next(error);
  }
});

// Update invoice
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot edit a paid invoice' });
    }

    const { clientName, clientEmail, items, dueDate, notes, status } = req.body;

    if (items) {
      let subtotal = 0;
      invoice.items = items.map((item) => {
        const amount = item.quantity * item.rate;
        subtotal += amount;
        return { ...item, amount };
      });
      invoice.subtotal = subtotal;
      invoice.tax = 0;
      invoice.total = subtotal;
      invoice.paymentFee = subtotal * 0.03;
      invoice.totalWithFee = subtotal + invoice.paymentFee;
    }

    if (clientName) invoice.clientName = clientName;
    if (clientEmail) invoice.clientEmail = clientEmail;
    if (dueDate) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (status) invoice.status = status;

    await invoice.save();
    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    next(error);
  }
});

// Delete invoice
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
