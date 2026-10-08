const fs = require('fs');
const path = require('path');

// Clean DB file before running integration test suite
const dbFile = path.join(__dirname, '../database.sqlite');
if (fs.existsSync(dbFile)) {
  try { fs.unlinkSync(dbFile); } catch(e) {}
}

const http = require('http');
const app = require('../src/app');

let server;
const PORT = 3009;

// Simple HTTP request helper supporting cookies/sessions
function request({ path, method = 'GET', body = null, headers = {}, cookie = '' }) {
  return new Promise((resolve, reject) => {
    const isJson = body && typeof body === 'object' && !Buffer.isBuffer(body);
    const reqHeaders = { ...headers };
    if (cookie) reqHeaders['Cookie'] = cookie;
    if (isJson) reqHeaders['Content-Type'] = 'application/json';

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let resData = '';
      const setCookieHeader = res.headers['set-cookie'];

      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(resData); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || resData,
          cookie: setCookieHeader ? setCookieHeader.map(c => c.split(';')[0]).join('; ') : cookie
        });
      });
    });

    req.on('error', reject);
    if (isJson) req.write(JSON.stringify(body));
    else if (Buffer.isBuffer(body) || typeof body === 'string') req.write(body);
    req.end();
  });
}

function createMultipartBody(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    );
  }

  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\n` +
    `Content-Type: ${fileField.contentType}\r\n\r\n` +
    `${fileField.content}\r\n`
  );

  parts.push(`--${boundary}--\r\n`);

  return { body: parts.join(''), boundary };
}

async function runTests() {
  console.log('\n================================================');
  console.log(' RUNNING SECOND CHAPTER INTEGRATION TEST SUITE (BDT / ৳)');
  console.log('================================================\n');

  // Start Server
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });
  console.log(`[TEST] Test server listening on http://localhost:${PORT}`);

  try {
    // Test 1: Admin Login
    console.log('\n--- Test 1: Admin Login ---');
    const adminLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'admin@secondchapter.edu', password: 'admin123' }
    });
    if (!adminLogin.data.success) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
    const adminCookie = adminLogin.cookie;
    console.log('✓ Admin login successful');

    // Test 2: Student Alice Registration
    console.log('\n--- Test 2: Alice Registration ---');
    const aliceReg = await request({
      path: '/api/auth/register',
      method: 'POST',
      body: { full_name: 'Alice Smith', email: 'alice@univ.edu', password: 'password123' }
    });
    if (!aliceReg.data.success) throw new Error('Alice registration failed: ' + JSON.stringify(aliceReg.data));
    const aliceCookie = aliceReg.cookie;
    console.log('✓ Alice registered & session created');

    // Test 3: Student Bob Registration
    console.log('\n--- Test 3: Bob Registration ---');
    const bobReg = await request({
      path: '/api/auth/register',
      method: 'POST',
      body: { full_name: 'Bob Johnson', email: 'bob@univ.edu', password: 'password123' }
    });
    if (!bobReg.data.success) throw new Error('Bob registration failed: ' + JSON.stringify(bobReg.data));
    const bobCookie = bobReg.cookie;
    console.log('✓ Bob registered & session created');

    // Test 4: Alice lists a book (with photo upload) in BDT (৳1,200)
    console.log('\n--- Test 4: Alice Creates Book Listing (৳1,200) ---');
    const { body: mpBody, boundary } = createMultipartBody(
      {
        title: 'Data Structures System Concepts',
        author: 'Silberschatz',
        edition: '7th Edition',
        condition: 'Like New',
        price: '1200',
        department: 'Computer Science',
        semester: 'Spring 2026'
      },
      {
        name: 'photo',
        filename: 'db-cover.png',
        contentType: 'image/png',
        content: 'FAKE_IMAGE_BYTES'
      }
    );

    const createBookRes = await request({
      path: '/api/books',
      method: 'POST',
      cookie: aliceCookie,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(mpBody)
      },
      body: mpBody
    });

    if (!createBookRes.data.success) throw new Error('Book creation failed: ' + JSON.stringify(createBookRes.data));
    const bookId = createBookRes.data.bookId;
    console.log(`✓ Alice created book listing (ID: ${bookId}), price ৳1,200, status is pending admin approval.`);

    // Test 5: Marketplace Check (Unapproved book should NOT appear)
    console.log('\n--- Test 5: Marketplace Excludes Pending Books ---');
    const mpCheck1 = await request({ path: '/api/books' });
    const foundPending = mpCheck1.data.books.some(b => b.id === bookId);
    if (foundPending) throw new Error('Pending book wrongly appeared in public marketplace!');
    console.log('✓ Pending book is hidden from public marketplace.');

    // Test 6: Admin approves book listing
    console.log('\n--- Test 6: Admin Approves Book ---');
    const approveRes = await request({
      path: `/api/admin/books/${bookId}/approve`,
      method: 'POST',
      cookie: adminCookie
    });
    if (!approveRes.data.success) throw new Error('Admin approval failed: ' + JSON.stringify(approveRes.data));
    console.log('✓ Admin approved book listing.');

    // Test 7: Marketplace Check & Filter (Approved book MUST appear)
    console.log('\n--- Test 7: Marketplace Shows Approved Book with Filter ---');
    const mpCheck2 = await request({ path: '/api/books?department=Computer+Science' });
    const foundApproved = mpCheck2.data.books.some(b => b.id === bookId);
    if (!foundApproved) throw new Error('Approved book did not appear in marketplace!');
    console.log('✓ Approved book appears in marketplace filter search.');

    // Test 8: Alice attempts to purchase HER OWN book (Business Rule Violation Test)
    console.log('\n--- Test 8: Alice Cannot Purchase Own Book ---');
    const selfPurchase = await request({
      path: '/api/requests',
      method: 'POST',
      cookie: aliceCookie,
      body: { book_id: bookId }
    });
    if (selfPurchase.data.success !== false) throw new Error('Self purchase should fail!');
    console.log(`✓ Prevented self-purchase: "${selfPurchase.data.message}"`);

    // Test 9: Bob sends valid purchase request
    console.log('\n--- Test 9: Bob Sends Purchase Request ---');
    const bobReq1 = await request({
      path: '/api/requests',
      method: 'POST',
      cookie: bobCookie,
      body: { book_id: bookId }
    });
    if (!bobReq1.data.success) throw new Error('Bob purchase request failed: ' + JSON.stringify(bobReq1.data));
    const requestId = bobReq1.data.requestId;
    console.log(`✓ Bob sent purchase request (ID: ${requestId}).`);

    // Test 10: Bob sends duplicate purchase request (Business Rule Violation Test)
    console.log('\n--- Test 10: Duplicate Purchase Request Prevention ---');
    const bobReqDup = await request({
      path: '/api/requests',
      method: 'POST',
      cookie: bobCookie,
      body: { book_id: bookId }
    });
    if (bobReqDup.data.success !== false) throw new Error('Duplicate request should fail!');
    console.log(`✓ Prevented duplicate purchase request: "${bobReqDup.data.message}"`);

    // Test 11: Alice accepts Bob's request -> Transaction & 5% Commission (BDT)
    console.log('\n--- Test 11: Alice Accepts Request & 5% Commission Calculated (BDT) ---');
    const acceptRes = await request({
      path: `/api/requests/${requestId}/accept`,
      method: 'POST',
      cookie: aliceCookie
    });
    if (!acceptRes.data.success) throw new Error('Accept request failed: ' + JSON.stringify(acceptRes.data));
    const tx = acceptRes.data.transaction;
    if (tx.sale_price !== 1200) throw new Error('Sale price mismatch');
    if (tx.platform_commission !== 60) throw new Error('5% commission mismatch (expected 60)');
    if (tx.seller_amount !== 1140) throw new Error('95% seller payout mismatch (expected 1140)');
    console.log(`✓ Request accepted! Sale Price: ৳${tx.sale_price}, 5% Commission: ৳${tx.platform_commission}, Seller Payout: ৳${tx.seller_amount}`);

    // Test 12: Verify Sold Book Protection (Bob or anyone else cannot request sold book)
    console.log('\n--- Test 12: Sold Book Purchase Protection ---');
    const soldReq = await request({
      path: '/api/requests',
      method: 'POST',
      cookie: bobCookie,
      body: { book_id: bookId }
    });
    if (soldReq.data.success !== false) throw new Error('Sold book request should fail!');
    console.log(`✓ Sold book protection verified: "${soldReq.data.message}"`);

    // Test 13: Verify User Transaction History
    console.log('\n--- Test 13: Student Transaction History ---');
    const userTx = await request({
      path: '/api/user/transactions',
      cookie: aliceCookie
    });
    if (!userTx.data.transactions || userTx.data.transactions.length !== 1) throw new Error('User transactions missing');
    console.log(`✓ Alice sees transaction record for book "${userTx.data.transactions[0].book_title}".`);

    // Test 14: Verify Admin System Transactions Report
    console.log('\n--- Test 14: Admin System Transactions Report ---');
    const adminTx = await request({
      path: '/api/admin/transactions',
      cookie: adminCookie
    });
    if (!adminTx.data.transactions || adminTx.data.transactions.length < 1) throw new Error('Admin transactions empty');
    console.log(`✓ Admin portal records system transactions and calculated revenue.`);

    console.log('\n================================================');
    console.log(' 🎉 ALL INTEGRATION TESTS PASSED PERFECTLY (BDT)!');
    console.log('================================================\n');

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  } finally {
    if (server) server.close();
  }
}

runTests();
