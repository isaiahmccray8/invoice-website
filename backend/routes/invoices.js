const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Helper function to generate random invoice number
function generateInvoiceNumber() {
  return 'INV-' + Math.floor(100000 + Math.random() * 900000);
}

// Helper function to get invoice with items
async function getInvoiceWithItems(invoiceId) {
  const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) return null;

  const items = await db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoiceId);
  return { ...invoice, items };
}

// PUBLIC ROUTES

// Get all invoices (public - for displaying on view invoices page)
router.get('/public/list', async (req, res, next) => {
  try {
    const invoices = await db.prepare(`
      SELECT id, invoiceNumber, clientName, dueDate, status, totalWithFee
      FROM invoices
      WHERE status != 'draft'
      ORDER BY createdAt DESC
    `).all();
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// OWNER ROUTES

// Get all invoices (owner only)
router.get('/owner/list', verifyToken, async (req, res, next) => {
  try {
    const invoices = await db.prepare(`
      SELECT * FROM invoices
      WHERE userId = ?
      ORDER BY createdAt DESC
    `).all(req.user.id);

    // Add items to each invoice
    const invoicesWithItems = await Promise.all(invoices.map(async (invoice) => {
      const items = await db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoice.id);
      return { ...invoice, items };
    }));

    res.json(invoicesWithItems);
  } catch (error) {
    next(error);
  }
});

// Get single invoice by ID (public - no auth needed)
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await getInvoiceWithItems(req.params.id);

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
    const { clientName, clientEmail, items, dueDate, notes } = req.body;

    if (!clientName || !clientEmail || !items || !dueDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate totals
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += item.quantity * item.rate;
    });

    const tax = 0;
    const total = subtotal + tax;
    const paymentFee = total * 0.03;
    const totalWithFee = total + paymentFee;

    const invoiceId = uuidv4();
    const invoiceNumber = generateInvoiceNumber();
    const now = Date.now();

    // Insert invoice
    await db.prepare(`
      INSERT INTO invoices (id, userId, invoiceNumber, clientName, clientEmail, subtotal, tax, total, paymentFee, totalWithFee, dueDate, status, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, req.user.id, invoiceNumber, clientName, clientEmail, subtotal, tax, total, paymentFee, totalWithFee, dueDate, 'draft', notes || null, now, now);

    // Insert invoice items
    for (const item of items) {
      const itemId = uuidv4();
      const amount = item.quantity * item.rate;
      await db.prepare(`
        INSERT INTO invoice_items (id, invoiceId, description, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, invoiceId, item.description, item.quantity, item.rate, amount);
    }

    const invoice = await getInvoiceWithItems(invoiceId);
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    next(error);
  }
});

// Update invoice
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { clientName, clientEmail, items, dueDate, notes, status } = req.body;

    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Only allow editing if not paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot edit a paid invoice' });
    }

    let subtotal = invoice.subtotal;
    let tax = invoice.tax;
    let total = invoice.total;
    let paymentFee = invoice.paymentFee;
    let totalWithFee = invoice.totalWithFee;

    // Recalculate totals if items changed
    if (items) {
      subtotal = 0;
      items.forEach((item) => {
        subtotal += item.quantity * item.rate;
      });
      tax = 0;
      total = subtotal + tax;
      paymentFee = total * 0.03;
      totalWithFee = total + paymentFee;

      // Delete old items and insert new ones
      await db.prepare('DELETE FROM invoice_items WHERE invoiceId = ?').run(req.params.id);
      for (const item of items) {
        const itemId = uuidv4();
        const amount = item.quantity * item.rate;
        await db.prepare(`
          INSERT INTO invoice_items (id, invoiceId, description, quantity, rate, amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(itemId, req.params.id, item.description, item.quantity, item.rate, amount);
      }
    }

    const now = Date.now();
    await db.prepare(`
      UPDATE invoices
      SET clientName = ?, clientEmail = ?, subtotal = ?, tax = ?, total = ?, paymentFee = ?, totalWithFee = ?, dueDate = ?, notes = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      clientName || invoice.clientName,
      clientEmail || invoice.clientEmail,
      subtotal,
      tax,
      total,
      paymentFee,
      totalWithFee,
      dueDate || invoice.dueDate,
      notes !== undefined ? notes : invoice.notes,
      status || invoice.status,
      now,
      req.params.id
    );

    const updatedInvoice = await getInvoiceWithItems(req.params.id);
    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
});

// Delete invoice
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Delete invoice items first (foreign key constraint)
    await db.prepare('DELETE FROM invoice_items WHERE invoiceId = ?').run(req.params.id);

    // Delete invoice
    await db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
