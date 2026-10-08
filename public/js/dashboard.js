document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadMyListings();
  loadIncomingRequests();
  loadOutgoingRequests();
  loadTransactionHistory();
});

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

// 1. My Book Listings
async function loadMyListings() {
  const container = document.getElementById('my-listings-container');
  if (!container) return;

  try {
    const res = await fetch('/api/books/my/listings');
    const data = await res.json();

    if (!data.success || !data.books || data.books.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">You haven't listed any textbooks yet. <a href="/create-listing">Create a listing now</a>.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Book</th>
              <th>Details</th>
              <th>Price</th>
              <th>Status</th>
              <th>Date Listed</th>
            </tr>
          </thead>
          <tbody>
            ${data.books.map(b => `
              <tr>
                <td style="display: flex; align-items: center; gap: 12px;">
                  <img src="${escapeHtml(b.photo_url)}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='/uploads/default-book.svg'">
                  <strong>${escapeHtml(b.title)}</strong>
                </td>
                <td>${escapeHtml(b.department)} | ${escapeHtml(b.semester)} (${escapeHtml(b.condition)})</td>
                <td style="font-weight: 700; color: #0d9488;">${formatBDT(b.price)}</td>
                <td><span class="badge badge-${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></td>
                <td>${new Date(b.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load listings.</p>`;
  }
}

// 2. Incoming Sales Requests
async function loadIncomingRequests() {
  const container = document.getElementById('incoming-requests-container');
  if (!container) return;

  try {
    const res = await fetch('/api/requests/incoming');
    const data = await res.json();

    if (!data.success || !data.requests || data.requests.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">No incoming purchase requests yet.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Buyer</th>
              <th>Book Price</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.requests.map(r => `
              <tr>
                <td><strong>${escapeHtml(r.book_title)}</strong></td>
                <td>${escapeHtml(r.buyer_name)}<br><small style="color:#7f8c8d;">${escapeHtml(r.buyer_email)}</small></td>
                <td>${formatBDT(r.book_price)}</td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td><span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
                <td>
                  ${r.status === 'pending' ? `
                    <button onclick="handleAcceptRequest(${r.id})" class="btn btn-sm btn-secondary">Accept</button>
                    <button onclick="handleDeclineRequest(${r.id})" class="btn btn-sm btn-danger" style="margin-left: 5px;">Decline</button>
                  ` : `<span style="color:#7f8c8d; font-size:0.85rem;">Processed</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load incoming requests.</p>`;
  }
}

// Accept purchase request
async function handleAcceptRequest(requestId) {
  if (!confirm('Are you sure you want to accept this purchase request? This will record the sale and mark your book as SOLD.')) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/accept`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(`Success! ${data.message}\nSale Price: ${formatBDT(data.transaction.sale_price)}\nPlatform Commission (5%): ${formatBDT(data.transaction.platform_commission)}\nYour Net Earnings (95%): ${formatBDT(data.transaction.seller_amount)}`);
      location.reload();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to accept request: ' + err.message);
  }
}

// Decline purchase request
async function handleDeclineRequest(requestId) {
  if (!confirm('Are you sure you want to decline this purchase request?')) return;

  try {
    const res = await fetch(`/api/requests/${requestId}/decline`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert('Purchase request declined.');
      location.reload();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to decline request: ' + err.message);
  }
}

// 3. Outgoing Purchase Requests
async function loadOutgoingRequests() {
  const container = document.getElementById('outgoing-requests-container');
  if (!container) return;

  try {
    const res = await fetch('/api/requests/outgoing');
    const data = await res.json();

    if (!data.success || !data.requests || data.requests.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">You haven't requested any books yet. <a href="/marketplace">Browse Marketplace</a></p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Book</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Date Requested</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.requests.map(r => `
              <tr>
                <td><strong>${escapeHtml(r.book_title)}</strong></td>
                <td>${escapeHtml(r.seller_name)}<br><small style="color:#7f8c8d;">${escapeHtml(r.seller_email)}</small></td>
                <td>${formatBDT(r.book_price)}</td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td><span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load your purchase requests.</p>`;
  }
}

// 4. Student Transaction History
async function loadTransactionHistory() {
  const container = document.getElementById('transactions-container');
  if (!container) return;

  try {
    const res = await fetch('/api/user/transactions');
    const data = await res.json();

    if (!data.success || !data.transactions || data.transactions.length === 0) {
      container.innerHTML = `<p style="padding: 20px; color: #7f8c8d;">No completed transactions yet.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Book Title</th>
              <th>Your Role</th>
              <th>Buyer / Seller</th>
              <th>Sale Price</th>
              <th>Commission (5%)</th>
              <th>Seller Payout (95%)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.map(t => `
              <tr>
                <td>#TX-${t.id}</td>
                <td><strong>${escapeHtml(t.book_title)}</strong></td>
                <td><span class="tag" style="background:#e0f2fe; color:#0369a1;">${t.user_role_in_tx}</span></td>
                <td>${t.user_role_in_tx === 'Seller' ? 'Buyer: ' + escapeHtml(t.buyer_name) : 'Seller: ' + escapeHtml(t.seller_name)}</td>
                <td>${formatBDT(t.sale_price)}</td>
                <td style="color:#d97706;">${formatBDT(t.platform_commission)}</td>
                <td style="font-weight:700; color:#059669;">${formatBDT(t.seller_amount)}</td>
                <td>${new Date(t.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load transaction history.</p>`;
  }
}
