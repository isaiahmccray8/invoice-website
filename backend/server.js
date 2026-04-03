require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// SQLite is ready (initialized in config/database.js)

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use(errorHandler);

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;
