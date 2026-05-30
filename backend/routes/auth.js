const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');

// Register business owner
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, businessName, businessEmail } = req.body;

    if (!email || !password || !businessName || !businessEmail) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ email, password, businessName, businessEmail });
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, email: user.email, businessName: user.businessName, businessEmail: user.businessEmail },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, businessName: user.businessName, businessEmail: user.businessEmail },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: user._id, email: user.email, businessName: user.businessName, businessEmail: user.businessEmail });
  } catch (error) {
    next(error);
  }
});

// Admin auth - creates user if doesn't exist
router.post('/admin', async (req, res, next) => {
  try {
    const { email, password, businessName, businessEmail } = req.body;

    let user = await User.findOne({ email }).select('+password');

    if (!user) {
      user = await User.create({ email, password, businessName, businessEmail });
    }

    const token = generateToken(user);
    res.json({
      message: 'Admin access granted',
      token,
      user: { id: user._id, email: user.email, businessName: user.businessName, businessEmail: user.businessEmail },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
