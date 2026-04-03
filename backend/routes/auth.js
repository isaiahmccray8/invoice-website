const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { generateToken, verifyToken } = require('../middleware/auth');

// Register business owner
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, businessName, businessEmail } = req.body;

    // Validation
    if (!email || !password || !businessName || !businessEmail) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = uuidv4();
    const now = Date.now();

    await db.prepare(`
      INSERT INTO users (id, email, password, businessName, businessEmail, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, hashedPassword, businessName, businessEmail, now, now);

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        businessEmail: user.businessEmail
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login business owner
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        businessEmail: user.businessEmail
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      businessName: user.businessName,
      businessEmail: user.businessEmail
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
