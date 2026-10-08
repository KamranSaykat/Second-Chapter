document.addEventListener('DOMContentLoaded', () => {
  const filterForm = document.getElementById('filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadMarketplaceBooks();
    });
    // Reset filters
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filterForm.reset();
        loadMarketplaceBooks();
      });
    }
  }

  loadMarketplaceBooks();
});

async function loadMarketplaceBooks() {
  const grid = document.getElementById('books-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Loading books...</div>';

  const search = document.getElementById('search-input')?.value || '';
  const department = document.getElementById('dept-select')?.value || '';
  const semester = document.getElementById('semester-select')?.value || '';
  const condition = document.getElementById('condition-select')?.value || '';
  const minPrice = document.getElementById('min-price')?.value || '';
  const maxPrice = document.getElementById('max-price')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (department) params.append('department', department);
  if (semester) params.append('semester', semester);
  if (condition) params.append('condition', condition);
  if (minPrice) params.append('minPrice', minPrice);
  if (maxPrice) params.append('maxPrice', maxPrice);

  try {
    const res = await fetch(`/api/books?${params.toString()}`);
    const data = await res.json();

    if (!data.success || !data.books || data.books.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px; background: white; border-radius: 8px;">
          <h3>No approved books found</h3>
          <p style="color: #7f8c8d; margin-top: 8px;">Try adjusting your search query or filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = data.books.map(book => `
      <div class="card">
        <img src="${escapeHtml(book.photo_url)}" alt="${escapeHtml(book.title)}" class="card-img" onerror="this.src='/uploads/default-book.svg'">
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(book.title)}</h3>
          <div class="card-author">By ${escapeHtml(book.author)} (${escapeHtml(book.edition)})</div>
          <div class="card-tags">
            <span class="tag">${escapeHtml(book.department)}</span>
            <span class="tag">Sem: ${escapeHtml(book.semester)}</span>
            <span class="tag">${escapeHtml(book.condition)}</span>
          </div>
          <div class="card-footer">
            <span class="price">${formatBDT(book.price)}</span>
            <a href="/book-details?id=${book.id}" class="btn btn-sm btn-primary">View Details</a>
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading marketplace:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Failed to load books. Please try again.</div>';
  }
}
