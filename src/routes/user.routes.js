const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Get transaction history for current student (both sales and purchases)
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const sql = `
      SELECT t.*, b.title as book_title, b.photo_url as book_photo,
             buyer.full_name as buyer_name, seller.full_name as seller_name
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN users buyer ON t.buyer_id = buyer.id
      JOIN users seller ON t.seller_id = seller.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.created_at DESC
    `;
    const transactions = await query.all(sql, [userId, userId]);

    // Format role specific details
    const formatted = transactions.map(tx => {
      const isSeller = tx.seller_id === userId;
      return {
        ...tx,
        user_role_in_tx: isSeller ? 'Seller' : 'Buyer',
        net_amount: isSeller ? tx.seller_amount : tx.sale_price
      };
    });

    return res.json({ success: true, transactions: formatted });
  } catch (err) {
    console.error('Fetch User Transactions Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction history.' });
  }
});

module.exports = router;
