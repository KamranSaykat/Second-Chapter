const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing email
    const existingUser = await query.get("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query.run(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
      [full_name.trim(), cleanEmail, passwordHash]
    );

    const user = {
      id: result.lastID,
      full_name: full_name.trim(),
      email: cleanEmail,
      role: 'student'
    };

    req.session.user = user;
    return res.status(201).json({ success: true, message: 'Registration successful!', user });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRow = await query.get("SELECT * FROM users WHERE email = ?", [cleanEmail]);

    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const sessionUser = {
      id: userRow.id,
      full_name: userRow.full_name,
      email: userRow.email,
      role: userRow.role
    };

    req.session.user = sessionUser;
    return res.json({ success: true, message: 'Login successful!', user: sessionUser });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Check Session Status
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false, user: null });
});

module.exports = router;
