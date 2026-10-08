const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper promise functions for clean async/await database operations
const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};

async function initDB() {
  // Enable Foreign Keys
  await query.run('PRAGMA foreign_keys = ON;');

  // 1. Users Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Books Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      edition TEXT NOT NULL,
      condition TEXT NOT NULL CHECK(condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
      price REAL NOT NULL CHECK(price >= 0),
      department TEXT NOT NULL,
      semester TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'sold')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Purchase Requests Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Transactions Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER UNIQUE NOT NULL,
      book_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      sale_price REAL NOT NULL,
      platform_commission REAL NOT NULL,
      seller_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES purchase_requests(id),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // Seed default admin account if not exists
  try {
    const adminExists = await query.get("SELECT * FROM users WHERE email = ?", ['admin@secondchapter.edu']);
    if (!adminExists) {
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await query.run(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        ['System Admin', 'admin@secondchapter.edu', adminPasswordHash, 'admin']
      );
      console.log('[DB] Default admin account created: admin@secondchapter.edu / admin123');
    }
  } catch (err) {
    console.error('[DB] Admin seeding error:', err.message);
  }

  console.log('[DB] SQLite Database initialized successfully.');
}

module.exports = { db, query, initDB };
