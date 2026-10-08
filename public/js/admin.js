document.addEventListener('DOMContentLoaded', async () => {
  setupAdminTabs();
  loadPendingBooks();
  loadUsers();
  loadAdminTransactions();
});

function setupAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(tc => tc.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

// 1. Load Pending Book Listings for Condition Verification
async function loadPendingBooks() {
  const container = document.getElementById('admin-pending-container');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/pending-books');
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">${escapeHtml(data.message)}</div>`;
      return;
    }

    if (!data.books || data.books.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">No pending listings waiting for verification.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="grid">
        ${data.books.map(b => `
          <div class="card">
            <img src="${escapeHtml(b.photo_url)}" alt="${escapeHtml(b.title)}" class="card-img" style="height:220px;" onerror="this.src='/uploads/default-book.svg'">
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(b.title)}</h3>
              <div class="card-author">By ${escapeHtml(b.author)} (${escapeHtml(b.edition)})</div>
              <div class="card-tags">
                <span class="tag">Seller: ${escapeHtml(b.seller_name)}</span>
                <span class="tag">${escapeHtml(b.department)}</span>
                <span class="tag">Condition: ${escapeHtml(b.condition)}</span>
              </div>
              <p style="font-size:0.9rem; margin-bottom: 15px;"><strong>Price:</strong> ${formatBDT(b.price)}</p>
              <div style="display: flex; gap: 10px; margin-top: auto;">
                <button onclick="approveBook(${b.id})" class="btn btn-sm btn-secondary" style="flex:1;">Approve</button>
                <button onclick="rejectBook(${b.id})" class="btn btn-sm btn-danger" style="flex:1;">Reject</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load pending books.</p>`;
  }
}

async function approveBook(bookId) {
  if (!confirm('Approve this listing for the public marketplace?')) return;
  try {
    const res = await fetch(`/api/admin/books/${bookId}/approve`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingBooks();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to approve book: ' + err.message);
  }
}

async function rejectBook(bookId) {
  if (!confirm('Reject/Flag this book listing?')) return;
  try {
    const res = await fetch(`/api/admin/books/${bookId}/reject`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingBooks();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to reject book: ' + err.message);
  }
}

// 2. Load Users
async function loadUsers() {
  const container = document.getElementById('admin-users-container');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();

    if (!data.success || !data.users) {
      container.innerHTML = `<p style="color: red;">Failed to load users.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td>#${u.id}</td>
                <td><strong>${escapeHtml(u.full_name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="tag" style="${u.role === 'admin' ? 'background:#fef3c7; color:#92400e;' : ''}">${escapeHtml(u.role)}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Error fetching users.</p>`;
  }
}

// 3. Load System-wide Transactions
async function loadAdminTransactions() {
  const container = document.getElementById('admin-tx-container');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/transactions');
    const data = await res.json();

    if (!data.success || !data.transactions || data.transactions.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">No system transactions recorded yet.</p>`;
      return;
    }

    let totalVolume = 0;
    let totalCommission = 0;
    data.transactions.forEach(t => {
      totalVolume += Number(t.sale_price);
      totalCommission += Number(t.platform_commission);
    });

    const summaryHtml = `
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="background: white; padding: 15px 25px; border-radius: 8px; border: 1px solid #e2e8f0; flex: 1;">
          <small style="color: #7f8c8d; text-transform: uppercase;">Total Sales Volume</small>
          <h2 style="color: #1e40af;">${formatBDT(totalVolume)}</h2>
        </div>
        <div style="background: white; padding: 15px 25px; border-radius: 8px; border: 1px solid #e2e8f0; flex: 1;">
          <small style="color: #7f8c8d; text-transform: uppercase;">Platform Revenue (5%)</small>
          <h2 style="color: #0d9488;">${formatBDT(totalCommission)}</h2>
        </div>
      </div>
    `;

    const tableHtml = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>TX ID</th>
              <th>Book Title</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Sale Price</th>
              <th>Commission (5%)</th>
              <th>Seller Net (95%)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.map(t => `
              <tr>
                <td>#TX-${t.id}</td>
                <td><strong>${escapeHtml(t.book_title)}</strong></td>
                <td>${escapeHtml(t.buyer_name)}</td>
                <td>${escapeHtml(t.seller_name)}</td>
                <td>${formatBDT(t.sale_price)}</td>
                <td style="color:#d97706; font-weight:600;">${formatBDT(t.platform_commission)}</td>
                <td style="color:#059669; font-weight:600;">${formatBDT(t.seller_amount)}</td>
                <td>${new Date(t.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = summaryHtml + tableHtml;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Error fetching system transactions.</p>`;
  }
}
