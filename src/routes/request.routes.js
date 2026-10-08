const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Create a Purchase Request (Buyer)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { book_id } = req.body;
    const buyer_id = req.session.user.id;

    if (!book_id) {
      return res.status(400).json({ success: false, message: 'Book ID is required.' });
    }

    // 1. Fetch book
    const book = await query.get('SELECT * FROM books WHERE id = ?', [book_id]);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    // 2. Check if book is approved
    if (book.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved books can receive purchase requests.' });
    }

    // 3. Business rule: User cannot buy their own book
    if (book.seller_id === buyer_id) {
      return res.status(400).json({ success: false, message: 'You cannot purchase your own textbook listing.' });
    }

    // 4. Business rule: Duplicate active purchase requests must be prevented
    const existingReq = await query.get(
      'SELECT id FROM purchase_requests WHERE book_id = ? AND buyer_id = ? AND status = "pending"',
      [book_id, buyer_id]
    );
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have an active pending purchase request for this book.' });
    }

    // Insert purchase request
    const result = await query.run(
      'INSERT INTO purchase_requests (book_id, buyer_id, status) VALUES (?, ?, "pending")',
      [book_id, buyer_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Purchase request sent successfully to the seller.',
      requestId: result.lastID
    });
  } catch (err) {
    console.error('Create Request Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit purchase request.' });
  }
});

// Incoming Purchase Requests for Seller (Seller Dashboard)
router.get('/incoming', requireAuth, async (req, res) => {
  try {
    const seller_id = req.session.user.id;
    const sql = `
      SELECT pr.*, b.title as book_title, b.price as book_price, b.photo_url as book_photo, b.status as book_status,
             u.full_name as buyer_name, u.email as buyer_email
      FROM purchase_requests pr
      JOIN books b ON pr.book_id = b.id
      JOIN users u ON pr.buyer_id = u.id
      WHERE b.seller_id = ?
      ORDER BY pr.created_at DESC
    `;
    const requests = await query.all(sql, [seller_id]);
    return res.json({ success: true, requests });
  } catch (err) {
    console.error('Fetch Incoming Requests Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incoming requests.' });
  }
});

// Outgoing Purchase Requests by Buyer (Buyer Dashboard)
router.get('/outgoing', requireAuth, async (req, res) => {
  try {
    const buyer_id = req.session.user.id;
    const sql = `
      SELECT pr.*, b.title as book_title, b.price as book_price, b.photo_url as book_photo, b.status as book_status,
             u.full_name as seller_name, u.email as seller_email
      FROM purchase_requests pr
      JOIN books b ON pr.book_id = b.id
      JOIN users u ON b.seller_id = u.id
      WHERE pr.buyer_id = ?
      ORDER BY pr.created_at DESC
    `;
    const requests = await query.all(sql, [buyer_id]);
    return res.json({ success: true, requests });
  } catch (err) {
    console.error('Fetch Outgoing Requests Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your purchase requests.' });
  }
});

// Accept Purchase Request (Seller) -> Creates Transaction & Calculates 5% Commission
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const seller_id = req.session.user.id;

    // 1. Fetch purchase request
    const pr = await query.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    if (!pr) {
      return res.status(404).json({ success: false, message: 'Purchase request not found.' });
    }
    if (pr.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This purchase request is no longer pending.' });
    }

    // 2. Fetch book & verify ownership
    const book = await query.get('SELECT * FROM books WHERE id = ?', [pr.book_id]);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Associated book not found.' });
    }
    if (book.seller_id !== seller_id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to accept requests for this book.' });
    }
    if (book.status === 'sold') {
      return res.status(400).json({ success: false, message: 'This book has already been sold.' });
    }

    // 3. Financial calculations on Backend (Strictly backend calculation)
    const sale_price = Number(book.price);
    const platform_commission = Number((sale_price * 0.05).toFixed(2));
    const seller_amount = Number((sale_price * 0.95).toFixed(2));

    // 4. Update request status to 'accepted'
    await query.run('UPDATE purchase_requests SET status = "accepted" WHERE id = ?', [requestId]);

    // 5. Mark book as 'sold'
    await query.run('UPDATE books SET status = "sold" WHERE id = ?', [book.id]);

    // 6. Auto-decline any other pending requests for this same book
    await query.run(
      'UPDATE purchase_requests SET status = "declined" WHERE book_id = ? AND id != ? AND status = "pending"',
      [book.id, requestId]
    );

    // 7. Insert Transaction Record
    const txResult = await query.run(
      `INSERT INTO transactions (request_id, book_id, buyer_id, seller_id, sale_price, platform_commission, seller_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [requestId, book.id, pr.buyer_id, seller_id, sale_price, platform_commission, seller_amount]
    );

    return res.json({
      success: true,
      message: 'Purchase request accepted! Book marked as sold and transaction recorded.',
      transaction: {
        id: txResult.lastID,
        sale_price,
        platform_commission,
        seller_amount
      }
    });
  } catch (err) {
    console.error('Accept Request Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to accept purchase request.' });
  }
});

// Decline Purchase Request (Seller)
router.post('/:id/decline', requireAuth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const seller_id = req.session.user.id;

    const pr = await query.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    if (!pr) {
      return res.status(404).json({ success: false, message: 'Purchase request not found.' });
    }
    if (pr.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This purchase request is no longer pending.' });
    }

    const book = await query.get('SELECT * FROM books WHERE id = ?', [pr.book_id]);
    if (!book || book.seller_id !== seller_id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to decline requests for this book.' });
    }

    await query.run('UPDATE purchase_requests SET status = "declined" WHERE id = ?', [requestId]);

    return res.json({ success: true, message: 'Purchase request declined.' });
  } catch (err) {
    console.error('Decline Request Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to decline purchase request.' });
  }
});

module.exports = router;
