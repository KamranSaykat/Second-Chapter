const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create a new book listing (Requires Auth, Multer upload)
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { title, author, edition, condition, price, department, semester } = req.body;

    if (!title || !author || !edition || !condition || price === undefined || !department || !semester) {
      return res.status(400).json({ success: false, message: 'All text fields are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a clear book photo.' });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid non-negative price.' });
    }

    const allowedConditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
    if (!allowedConditions.includes(condition)) {
      return res.status(400).json({ success: false, message: 'Invalid condition selected.' });
    }

    const photoUrl = '/uploads/' + req.file.filename;

    const result = await query.run(
      `INSERT INTO books (seller_id, title, author, edition, condition, price, department, semester, photo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.session.user.id,
        title.trim(),
        author.trim(),
        edition.trim(),
        condition,
        numPrice,
        department.trim(),
        semester.trim(),
        photoUrl
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Book listing created successfully! It is now pending admin verification.',
      bookId: result.lastID
    });
  } catch (err) {
    console.error('Create Book Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error creating book listing.' });
  }
});

// Public Marketplace: Get all APPROVED books with filtering and search
router.get('/', async (req, res) => {
  try {
    const { search, department, semester, condition, minPrice, maxPrice } = req.query;

    let sql = `
      SELECT b.*, u.full_name as seller_name, u.email as seller_email
      FROM books b
      JOIN users u ON b.seller_id = u.id
      WHERE b.status = 'approved'
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.department LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (department && department.trim() !== '') {
      sql += ` AND b.department = ?`;
      params.push(department.trim());
    }

    if (semester && semester.trim() !== '') {
      sql += ` AND b.semester = ?`;
      params.push(semester.trim());
    }

    if (condition && condition.trim() !== '') {
      sql += ` AND b.condition = ?`;
      params.push(condition.trim());
    }

    if (minPrice && !isNaN(parseFloat(minPrice))) {
      sql += ` AND b.price >= ?`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      sql += ` AND b.price <= ?`;
      params.push(parseFloat(maxPrice));
    }

    sql += ` ORDER BY b.created_at DESC`;

    const books = await query.all(sql, params);
    return res.json({ success: true, count: books.length, books });
  } catch (err) {
    console.error('Fetch Books Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch books.' });
  }
});

// User's own book listings (Student Dashboard)
router.get('/my/listings', requireAuth, async (req, res) => {
  try {
    const sql = `SELECT * FROM books WHERE seller_id = ? ORDER BY created_at DESC`;
    const books = await query.all(sql, [req.session.user.id]);
    return res.json({ success: true, books });
  } catch (err) {
    console.error('Fetch My Books Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your book listings.' });
  }
});

// Single book details by ID
router.get('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const sql = `
      SELECT b.*, u.full_name as seller_name, u.email as seller_email
      FROM books b
      JOIN users u ON b.seller_id = u.id
      WHERE b.id = ?
    `;
    const book = await query.get(sql, [bookId]);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    return res.json({ success: true, book });
  } catch (err) {
    console.error('Fetch Book Details Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch book details.' });
  }
});

module.exports = router;
