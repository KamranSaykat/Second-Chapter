const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

// All admin routes require admin authorization middleware
router.use(requireAdmin);

// View all pending book listings for condition & detail inspection
router.get('/pending-books', async (req, res) => {
  try {
    const sql = `
      SELECT b.*, u.full_name as seller_name, u.email as seller_email
      FROM books b
      JOIN users u ON b.seller_id = u.id
      WHERE b.status = 'pending'
      ORDER BY b.created_at ASC
    `;
    const books = await query.all(sql);
    return res.json({ success: true, count: books.length, books });
  } catch (err) {
    console.error('Admin Pending Books Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending books.' });
  }
});

// Approve a book listing
router.post('/books/:id/approve', async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await query.get('SELECT * FROM books WHERE id = ?', [bookId]);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    await query.run('UPDATE books SET status = "approved" WHERE id = ?', [bookId]);
    return res.json({ success: true, message: `Book "${book.title}" has been approved for the public marketplace.` });
  } catch (err) {
    console.error('Approve Book Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve book.' });
  }
});

// Reject/Flag a book listing
router.post('/books/:id/reject', async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await query.get('SELECT * FROM books WHERE id = ?', [bookId]);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    await query.run('UPDATE books SET status = "rejected" WHERE id = ?', [bookId]);
    return res.json({ success: true, message: `Book "${book.title}" has been rejected.` });
  } catch (err) {
    console.error('Reject Book Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject book.' });
  }
});

// View all users
router.get('/users', async (req, res) => {
  try {
    const sql = `SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC`;
    const users = await query.all(sql);
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Admin Users Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// View all system transactions
router.get('/transactions', async (req, res) => {
  try {
    const sql = `
      SELECT t.*, b.title as book_title,
             buyer.full_name as buyer_name, buyer.email as buyer_email,
             seller.full_name as seller_name, seller.email as seller_email
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN users buyer ON t.buyer_id = buyer.id
      JOIN users seller ON t.seller_id = seller.id
      ORDER BY t.created_at DESC
    `;
    const transactions = await query.all(sql);
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('Admin Transactions Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin transactions.' });
  }
});

module.exports = router;
