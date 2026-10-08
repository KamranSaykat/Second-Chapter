// Main client-side script for navigation, session checks, and UI helpers
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
});

async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (data.loggedIn && data.user) {
      currentUser = data.user;
      let adminLink = '';
      if (currentUser.role === 'admin') {
        adminLink = `<li><a href="/admin" class="btn btn-sm btn-outline">Admin Portal</a></li>`;
      }

      navAuth.innerHTML = `
        ${adminLink}
        <li><a href="/create-listing" class="btn btn-sm btn-secondary">+ Sell Book</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><span class="user-badge">${escapeHtml(currentUser.full_name)}</span></li>
        <li><button onclick="handleLogout()" class="btn btn-sm btn-outline">Logout</button></li>
      `;
    } else {
      currentUser = null;
      navAuth.innerHTML = `
        <li><a href="/login" class="btn btn-sm btn-outline">Login</a></li>
        <li><a href="/register" class="btn btn-sm btn-primary">Register</a></li>
      `;
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = '/login';
    }
  } catch (err) {
    alert('Logout error: ' + err.message);
  }
}

function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${escapeHtml(message)}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBDT(amount) {
  const num = Number(amount) || 0;
  return '৳' + num.toLocaleString('en-US');
}
