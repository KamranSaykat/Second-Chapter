const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const requestRoutes = require('./routes/request.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Initialize DB Promise
const dbReady = initDB();

// Wait for DB ready middleware for incoming API calls
app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database initialization failed.' });
  }
});

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'second-chapter-campus-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

// Serve Static Assets (CSS, JS, Uploaded Photos)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// HTML Page Routes
const viewsDir = path.join(__dirname, '../views');

app.get('/', (req, res) => res.sendFile(path.join(viewsDir, 'index.html')));
app.get('/marketplace', (req, res) => res.sendFile(path.join(viewsDir, 'marketplace.html')));
app.get('/book-details', (req, res) => res.sendFile(path.join(viewsDir, 'book-details.html')));
app.get('/login', (req, res) => res.sendFile(path.join(viewsDir, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(viewsDir, 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(viewsDir, 'dashboard.html')));
app.get('/create-listing', (req, res) => res.sendFile(path.join(viewsDir, 'create-listing.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(viewsDir, 'admin.html')));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

module.exports = app;
