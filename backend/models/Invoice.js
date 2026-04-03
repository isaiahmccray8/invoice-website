const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    shareToken: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    clientName: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
      required: true,
    },
    items: [
      {
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentFee: {
      type: Number,
      default: 0,
    },
    totalWithFee: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paymentMethods: {
      stripe: { type: Boolean, default: true },
      paypal: { type: Boolean, default: true },
    },
    notes: String,
    terms: String,
    stripeCheckoutId: String,
    paypalPaymentId: String,
    paidAt: Date,
    paidAmount: Number,
    paymentMethod: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Generate random invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    // Generate random 6-digit invoice number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.invoiceNumber = `INV-${randomNum}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
