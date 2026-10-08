const path = require('path');
const bcrypt = require('bcryptjs');
const { initDB, query } = require('../src/config/db');

async function seed() {
  console.log('[SEED] Initializing database schema...');
  await initDB();

  console.log('[SEED] Cleaning existing seed records to ensure idempotency...');
  // Clear tables in reverse dependency order
  await query.run('DELETE FROM transactions');
  await query.run('DELETE FROM purchase_requests');
  await query.run('DELETE FROM books');
  await query.run('DELETE FROM users');

  // Reset autoincrement sequences
  await query.run('DELETE FROM sqlite_sequence');

  console.log('[SEED] Creating Demo Accounts...');
  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 1. Admin
  const adminRes = await query.run(
    "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (1, 'System Admin', 'admin@secondchapter.edu', ?, 'admin')",
    [adminPasswordHash]
  );

  // 2. Student 1 (Alice)
  const aliceRes = await query.run(
    "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (2, 'Alice Smith', 'alice@secondchapter.edu', ?, 'student')",
    [studentPasswordHash]
  );

  // 3. Student 2 (Bob)
  const bobRes = await query.run(
    "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (3, 'Bob Johnson', 'bob@secondchapter.edu', ?, 'student')",
    [studentPasswordHash]
  );

  // 4. Student 3 (Charlie)
  const charlieRes = await query.run(
    "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (4, 'Charlie Ahmed', 'charlie@secondchapter.edu', ?, 'student')",
    [studentPasswordHash]
  );

  console.log('  + Users created: Admin (admin@secondchapter.edu), Alice (alice@secondchapter.edu), Bob (bob@secondchapter.edu), Charlie (charlie@secondchapter.edu)');

  console.log('[SEED] Creating Demo Book Listings...');
  const sampleBooks = [
    {
      id: 1,
      seller_id: 2, // Alice
      title: 'Data Structures and Algorithm Analysis in C++',
      author: 'Mark Allen Weiss',
      edition: '4th Edition',
      condition: 'Like New',
      price: 1200.00,
      department: 'Computer Science',
      semester: 'Spring 2026',
      photo_url: '/uploads/default-book.svg',
      status: 'sold'
    },
    {
      id: 2,
      seller_id: 2, // Alice
      title: 'Principles of Electronics & Electrical Engineering',
      author: 'V.K. Mehta, Rohit Mehta',
      edition: '11th Edition',
      condition: 'Good',
      price: 850.00,
      department: 'Engineering',
      semester: 'Fall 2025',
      photo_url: '/uploads/default-book.svg',
      status: 'sold'
    },
    {
      id: 3,
      seller_id: 3, // Bob
      title: 'University Physics with Modern Physics',
      author: 'Hugh D. Young, Roger A. Freedman',
      edition: '15th Edition',
      condition: 'New',
      price: 2000.00,
      department: 'Physics',
      semester: 'Spring 2026',
      photo_url: '/uploads/default-book.svg',
      status: 'approved'
    },
    {
      id: 4,
      seller_id: 3, // Bob
      title: 'Microeconomic Theory & Applications',
      author: 'Dominick Salvatore',
      edition: '5th Edition',
      condition: 'Fair',
      price: 650.00,
      department: 'Business',
      semester: 'Fall 2025',
      photo_url: '/uploads/default-book.svg',
      status: 'approved'
    },
    {
      id: 5,
      seller_id: 4, // Charlie
      title: 'Organic Chemistry: Structure and Function',
      author: 'K. Peter C. Vollhardt',
      edition: '8th Edition',
      condition: 'Good',
      price: 1500.00,
      department: 'Chemistry',
      semester: 'Spring 2026',
      photo_url: '/uploads/default-book.svg',
      status: 'approved'
    },
    {
      id: 6,
      seller_id: 4, // Charlie
      title: 'Differential Equations and Linear Algebra',
      author: 'Stephen W. Goode',
      edition: '4th Edition',
      condition: 'Like New',
      price: 950.00,
      department: 'Mathematics',
      semester: 'Summer 2025',
      photo_url: '/uploads/default-book.svg',
      status: 'approved'
    },
    {
      id: 7,
      seller_id: 2, // Alice
      title: 'Software Engineering: A Practitioner\'s Approach',
      author: 'Roger S. Pressman',
      edition: '9th Edition',
      condition: 'New',
      price: 1800.00,
      department: 'Computer Science',
      semester: 'Spring 2026',
      photo_url: '/uploads/default-book.svg',
      status: 'pending'
    },
    {
      id: 8,
      seller_id: 3, // Bob
      title: 'Basic Pharmacology and Therapeutics',
      author: 'B.G. Katzung',
      edition: '12th Edition',
      condition: 'Poor',
      price: 400.00,
      department: 'Biology',
      semester: 'Spring 2025',
      photo_url: '/uploads/default-book.svg',
      status: 'rejected'
    },
    {
      id: 9,
      seller_id: 4, // Charlie
      title: 'Database System Concepts',
      author: 'Abraham Silberschatz',
      edition: '7th Edition',
      condition: 'Good',
      price: 1100.00,
      department: 'Computer Science',
      semester: 'Fall 2025',
      photo_url: '/uploads/default-book.svg',
      status: 'sold'
    }
  ];

  for (const b of sampleBooks) {
    await query.run(
      `INSERT INTO books (id, seller_id, title, author, edition, condition, price, department, semester, photo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.seller_id, b.title, b.author, b.edition, b.condition, b.price, b.department, b.semester, b.photo_url, b.status]
    );
  }
  console.log(`  + Created ${sampleBooks.length} book listings across 4 statuses (pending, approved, rejected, sold).`);

  console.log('[SEED] Creating Demo Purchase Requests & Transactions...');

  // Request 1: Bob requests Book 1 from Alice (Accepted -> Transaction 1)
  await query.run("INSERT INTO purchase_requests (id, book_id, buyer_id, status) VALUES (1, 1, 3, 'accepted')");
  const price1 = 1200.00;
  const comm1 = Number((price1 * 0.05).toFixed(2)); // 60.00
  const seller1 = Number((price1 * 0.95).toFixed(2)); // 1140.00
  await query.run(
    `INSERT INTO transactions (id, request_id, book_id, buyer_id, seller_id, sale_price, platform_commission, seller_amount)
     VALUES (1, 1, 1, 3, 2, ?, ?, ?)`,
    [price1, comm1, seller1]
  );

  // Request 2: Charlie requests Book 2 from Alice (Accepted -> Transaction 2)
  await query.run("INSERT INTO purchase_requests (id, book_id, buyer_id, status) VALUES (2, 2, 4, 'accepted')");
  const price2 = 850.00;
  const comm2 = Number((price2 * 0.05).toFixed(2)); // 42.50
  const seller2 = Number((price2 * 0.95).toFixed(2)); // 807.50
  await query.run(
    `INSERT INTO transactions (id, request_id, book_id, buyer_id, seller_id, sale_price, platform_commission, seller_amount)
     VALUES (2, 2, 2, 4, 2, ?, ?, ?)`,
    [price2, comm2, seller2]
  );

  // Request 3: Alice requests Book 9 from Charlie (Accepted -> Transaction 3)
  await query.run("INSERT INTO purchase_requests (id, book_id, buyer_id, status) VALUES (3, 9, 2, 'accepted')");
  const price3 = 1100.00;
  const comm3 = Number((price3 * 0.05).toFixed(2)); // 55.00
  const seller3 = Number((price3 * 0.95).toFixed(2)); // 1045.00
  await query.run(
    `INSERT INTO transactions (id, request_id, book_id, buyer_id, seller_id, sale_price, platform_commission, seller_amount)
     VALUES (3, 3, 9, 2, 4, ?, ?, ?)`,
    [price3, comm3, seller3]
  );

  // Request 4: Charlie requests Book 3 from Bob (Pending)
  await query.run("INSERT INTO purchase_requests (id, book_id, buyer_id, status) VALUES (4, 3, 4, 'pending')");

  // Request 5: Alice requests Book 4 from Bob (Declined)
  await query.run("INSERT INTO purchase_requests (id, book_id, buyer_id, status) VALUES (5, 4, 2, 'declined')");

  console.log('  + Created 5 purchase requests (accepted, pending, declined) and 3 completed transactions with 5% backend commission calculation.');

  console.log('\n================================================');
  console.log(' 🎉 DEMO DATA SEEDED SUCCESSFULLY IN BDT (৳)!');
  console.log('================================================\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('[SEED] Error during seeding:', err);
  process.exit(1);
});
