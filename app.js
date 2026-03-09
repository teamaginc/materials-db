// ============================================================
// TeamAg Materials Review Database — Application Logic
// ============================================================

let currentSort = { field: 'name', dir: 'asc' };
let activeFilters = { category: 'all', status: 'all', useType: 'all', manufacturer: 'all', brand: 'all', substance: 'all', source: 'all', search: '' };

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  populateUseTypes();
  populateManufacturers();
  populateBrands();
  bindFilters();
  updateStats();
  renderTable();
});

// ---- Stats ----
function updateStats() {
  document.getElementById('stat-total').textContent = MATERIALS.length;
  document.getElementById('stat-allowed').textContent = MATERIALS.filter(m => m.status === 'allowed').length;
  document.getElementById('stat-restricted').textContent = MATERIALS.filter(m => m.status === 'restricted').length;
  document.getElementById('stat-prohibited').textContent = MATERIALS.filter(m => m.status === 'prohibited').length;
  document.getElementById('stat-crops').textContent = MATERIALS.filter(m => m.category === 'crops').length;
  document.getElementById('stat-livestock').textContent = MATERIALS.filter(m => m.category === 'livestock').length;
  document.getElementById('stat-processing').textContent = MATERIALS.filter(m => m.category === 'processing').length;
}

// ---- Populate Use Type Dropdown ----
function populateUseTypes() {
  const types = [...new Set(MATERIALS.map(m => m.useType))].sort();
  const sel = document.getElementById('useTypeFilter');
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

// ---- Populate Manufacturer Dropdown ----
function populateManufacturers() {
  const mfrs = [...new Set(MATERIALS.map(m => m.manufacturer).filter(Boolean))].sort();
  const sel = document.getElementById('manufacturerFilter');
  mfrs.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

// ---- Populate Brand Dropdown ----
function populateBrands() {
  const brands = [...new Set(MATERIALS.map(m => m.brand).filter(Boolean))].sort();
  const sel = document.getElementById('brandFilter');
  brands.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

// ---- Filter Binding ----
function bindFilters() {
  // Button group filters
  document.querySelectorAll('.btn-group').forEach(group => {
    group.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterId = group.id;
        const value = btn.dataset.value;
        if (filterId === 'categoryFilter') activeFilters.category = value;
        if (filterId === 'statusFilter') activeFilters.status = value;
        if (filterId === 'substanceFilter') activeFilters.substance = value;
        renderTable();
      });
    });
  });

  // Use type select
  document.getElementById('useTypeFilter').addEventListener('change', e => {
    activeFilters.useType = e.target.value;
    renderTable();
  });

  // Manufacturer select
  document.getElementById('manufacturerFilter').addEventListener('change', e => {
    activeFilters.manufacturer = e.target.value;
    renderTable();
  });

  // Brand select
  document.getElementById('brandFilter').addEventListener('change', e => {
    activeFilters.brand = e.target.value;
    renderTable();
  });

  // Source select
  document.getElementById('sourceFilter').addEventListener('change', e => {
    activeFilters.source = e.target.value;
    renderTable();
  });

  // Search
  let debounce;
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      activeFilters.search = e.target.value.toLowerCase().trim();
      renderTable();
    }, 200);
  });
}

// ---- Filtering ----
function getFiltered() {
  return MATERIALS.filter(m => {
    if (activeFilters.category !== 'all' && m.category !== activeFilters.category) return false;
    if (activeFilters.status !== 'all' && m.status !== activeFilters.status) return false;
    if (activeFilters.useType !== 'all' && m.useType !== activeFilters.useType) return false;
    if (activeFilters.manufacturer !== 'all' && m.manufacturer !== activeFilters.manufacturer) return false;
    if (activeFilters.brand !== 'all' && m.brand !== activeFilters.brand) return false;
    if (activeFilters.substance !== 'all') {
      if (activeFilters.substance === 'synthetic' && !m.synthetic) return false;
      if (activeFilters.substance === 'nonsynthetic' && m.synthetic) return false;
    }
    if (activeFilters.source !== 'all' && m.source) {
      if (!m.source.includes(activeFilters.source)) return false;
    }
    if (activeFilters.search) {
      const s = activeFilters.search;
      const haystack = (m.name + ' ' + m.description + ' ' + m.cfr + ' ' + m.useType + ' ' + m.restrictions + ' ' + (m.brand || '') + ' ' + (m.manufacturer || '')).toLowerCase();
      if (!haystack.includes(s)) return false;
    }
    return true;
  });
}

// ---- Sorting ----
function sortTable(field) {
  if (currentSort.field === field) {
    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.dir = 'asc';
  }
  // Update header arrows
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === field) {
      th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
  renderTable();
}

function sortData(data) {
  const { field, dir } = currentSort;
  return [...data].sort((a, b) => {
    let va = a[field] || '';
    let vb = b[field] || '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ---- Render Table ----
function renderTable() {
  const filtered = sortData(getFiltered());
  const tbody = document.getElementById('tableBody');
  const noResults = document.getElementById('noResults');
  const countEl = document.getElementById('searchCount');

  countEl.textContent = filtered.length + ' of ' + MATERIALS.length + ' materials';

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  tbody.innerHTML = filtered.map(m => `
    <tr onclick="showDetail(${m.id})">
      <td class="material-name">${highlight(m.name)}</td>
      <td class="brand-mfr">${formatBrandMfr(m)}</td>
      <td><span class="badge-category cat-${m.category}">${capitalize(m.category)}</span></td>
      <td style="font-size:12px;">${m.useType}</td>
      <td><span class="badge badge-${m.status}">${statusLabel(m.status)}</span></td>
      <td><span class="badge ${m.synthetic ? 'badge-synthetic' : 'badge-nonsynthetic'}">${m.synthetic ? 'Synthetic' : 'Nonsynthetic'}</span></td>
      <td class="cfr-ref">${m.cfr}</td>
      <td class="source-tags">${formatSource(m.source)}</td>
      <td style="font-size:12px;white-space:nowrap;">${m.dateAdded || '—'}</td>
      <td><button class="btn-detail" onclick="event.stopPropagation();showDetail(${m.id})">View</button></td>
    </tr>
  `).join('');
}

// ---- Helpers ----
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function statusLabel(s) {
  if (s === 'allowed') return 'Allowed';
  if (s === 'restricted') return 'Restricted';
  return 'Prohibited';
}
function highlight(text) {
  if (!activeFilters.search) return text;
  const re = new RegExp('(' + activeFilters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function formatSource(src) {
  if (!src) return '<span class="source-tag">—</span>';
  const sources = src.split(',');
  const abbrev = { 'NOP National List': 'NOP', 'OMRI GML': 'GML', 'OMRI Products List': 'OMRI', 'WSDA': 'WSDA', 'CDFA': 'CDFA', 'Manual Entry': 'Manual' };
  const clsMap = { 'NOP National List': 'source-nop', 'OMRI GML': 'source-gml', 'OMRI Products List': 'source-omri', 'WSDA': 'source-wsda', 'CDFA': 'source-cdfa', 'Manual Entry': 'source-manual' };
  return sources.map(s => {
    const t = s.trim();
    const label = abbrev[t] || t;
    const cls = clsMap[t] || 'source-omri';
    return `<span class="source-tag ${cls}">${label}</span>`;
  }).join(' ');
}

function formatBrandMfr(m) {
  const brand = m.brand || '';
  const mfr = m.manufacturer || '';
  if (!brand && !mfr) return '<span class="mfr-only">—</span>';
  let html = '';
  if (brand) html += '<span class="brand-name">' + brand + '</span>';
  if (mfr) html += '<span class="mfr-name">' + mfr + '</span>';
  if (!brand && mfr) return '<span class="mfr-only">' + mfr + '</span>';
  return html;
}

// ---- Detail Modal ----
function showDetail(id) {
  const m = MATERIALS.find(x => x.id === id);
  if (!m) return;
  document.getElementById('modalTitle').textContent = m.name;
  const badge = document.getElementById('modalBadge');
  badge.className = 'modal-badge badge badge-' + m.status;
  badge.textContent = statusLabel(m.status);

  const categoryIcon = m.category === 'crops' ? '🌾' : m.category === 'livestock' ? '🐄' : '🏭';

  document.getElementById('modalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <label>Category</label>
        <span>${categoryIcon} ${capitalize(m.category)}</span>
      </div>
      <div class="detail-item">
        <label>Use Type</label>
        <span>${m.useType}</span>
      </div>
      <div class="detail-item">
        <label>Brand</label>
        <span>${m.brand || '—'}</span>
      </div>
      <div class="detail-item">
        <label>Manufacturer</label>
        <span>${m.manufacturer || '—'}</span>
      </div>
      <div class="detail-item">
        <label>Substance Type</label>
        <span>${m.synthetic ? 'Synthetic' : 'Nonsynthetic'}</span>
      </div>
      <div class="detail-item">
        <label>CFR Reference</label>
        <span style="font-family:monospace;">${m.cfr || '—'}</span>
      </div>
      <div class="detail-item">
        <label>Source</label>
        <span>${formatSource(m.source)}</span>
      </div>
      <div class="detail-item">
        <label>Date Added</label>
        <span>${m.dateAdded || '—'}</span>
      </div>
      <div class="detail-item">
        <label>Last Updated</label>
        <span>${m.lastUpdated || '—'}</span>
      </div>
    </div>
    <h3>Description</h3>
    <p>${m.description}</p>
    <h3>Restrictions & Annotations</h3>
    <p>${m.restrictions}</p>
    <h3>Compliance Guidance</h3>
    <p>${getGuidance(m)}</p>
    <div class="modal-actions">
      <button class="btn-edit" onclick="closeModal();showAddForm(${m.id})">Edit Material</button>
      <button class="btn-delete" onclick="deleteMaterial(${m.id})">Delete</button>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function getGuidance(m) {
  if (m.status === 'prohibited') {
    return 'This material is <strong>prohibited</strong> under the USDA National Organic Program. Use of this material will result in non-compliance. If this input has been used, consult your certifying agent regarding remediation steps and potential waiting periods before organic certification can be granted or maintained.';
  }
  if (m.status === 'restricted') {
    return 'This material is <strong>allowed with restrictions</strong>. All annotations and conditions listed above must be followed precisely. Document your use of this material including rates, dates, and purpose. Your certifying agent may require additional documentation. Review the full regulatory text at the CFR reference cited above.';
  }
  return 'This material is <strong>allowed</strong> for use in organic ' + m.category + ' production under the National List. Standard organic system plan documentation of material use is recommended. Verify that specific product formulations are reviewed and approved by your certifying agent, as commercial formulations may contain additional ingredients.';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ---- About Modal ----
function showAbout() {
  document.getElementById('aboutOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeAbout() {
  document.getElementById('aboutOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ---- Reset ----
function resetFilters() {
  activeFilters = { category: 'all', status: 'all', useType: 'all', manufacturer: 'all', brand: 'all', substance: 'all', source: 'all', search: '' };
  document.querySelectorAll('.btn-group').forEach(group => {
    group.querySelectorAll('.filter-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
    });
  });
  document.getElementById('useTypeFilter').value = 'all';
  document.getElementById('manufacturerFilter').value = 'all';
  document.getElementById('brandFilter').value = 'all';
  document.getElementById('sourceFilter').value = 'all';
  document.getElementById('searchInput').value = '';
  renderTable();
}

// ---- CSV Export ----
function exportCSV() {
  const filtered = sortData(getFiltered());
  const headers = ['Name', 'Brand', 'Manufacturer', 'Category', 'Use Type', 'Status', 'Substance Type', 'CFR Reference', 'Restrictions', 'Description', 'Source', 'Date Added', 'Last Updated'];
  const rows = filtered.map(m => [
    m.name, m.brand || '', m.manufacturer || '', capitalize(m.category), m.useType, statusLabel(m.status),
    m.synthetic ? 'Synthetic' : 'Nonsynthetic', m.cfr, m.restrictions, m.description, m.source || '', m.dateAdded || '', m.lastUpdated || ''
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"'));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TeamAg_Materials_Review_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Add / Edit Material ----
let editingId = null;

function showAddForm(id) {
  editingId = id || null;
  const form = document.getElementById('addMaterialForm');
  form.reset();

  // Populate use-type datalist with existing types
  const datalist = document.getElementById('useTypeList');
  datalist.innerHTML = '';
  [...new Set(MATERIALS.map(m => m.useType))].sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    datalist.appendChild(opt);
  });

  // Populate manufacturer datalist
  const mfrList = document.getElementById('manufacturerList');
  mfrList.innerHTML = '';
  [...new Set(MATERIALS.map(m => m.manufacturer).filter(Boolean))].sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    mfrList.appendChild(opt);
  });

  if (editingId) {
    // Edit mode — pre-fill form
    const m = MATERIALS.find(x => x.id === editingId);
    if (!m) return;
    document.getElementById('addFormTitle').textContent = 'Edit Material';
    document.getElementById('addFormSubmit').textContent = 'Save Changes';
    document.getElementById('fm-name').value = m.name;
    document.getElementById('fm-brand').value = m.brand || '';
    document.getElementById('fm-manufacturer').value = m.manufacturer || '';
    document.getElementById('fm-category').value = m.category;
    document.getElementById('fm-status').value = m.status;
    document.getElementById('fm-useType').value = m.useType;
    document.getElementById('fm-synthetic').value = String(m.synthetic);
    document.getElementById('fm-cfr').value = m.cfr || '';
    document.getElementById('fm-description').value = m.description;
    document.getElementById('fm-restrictions').value = m.restrictions || '';
  } else {
    document.getElementById('addFormTitle').textContent = 'Add New Material';
    document.getElementById('addFormSubmit').textContent = 'Add Material';
  }

  document.getElementById('addOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('fm-name').focus(), 100);
}

function closeAddForm() {
  document.getElementById('addOverlay').classList.remove('active');
  document.body.style.overflow = '';
  editingId = null;
}

function handleAddMaterial(e) {
  e.preventDefault();
  const name = document.getElementById('fm-name').value.trim();
  const brand = document.getElementById('fm-brand').value.trim();
  const manufacturer = document.getElementById('fm-manufacturer').value.trim();
  const category = document.getElementById('fm-category').value;
  const status = document.getElementById('fm-status').value;
  const useType = document.getElementById('fm-useType').value.trim();
  const synthetic = document.getElementById('fm-synthetic').value === 'true';
  const cfr = document.getElementById('fm-cfr').value.trim();
  const description = document.getElementById('fm-description').value.trim();
  const restrictions = document.getElementById('fm-restrictions').value.trim() || 'None specified.';

  if (!name || !category || !status || !useType || !description) return;

  if (editingId) {
    // Update existing
    const idx = MATERIALS.findIndex(m => m.id === editingId);
    if (idx !== -1) {
      MATERIALS[idx] = { ...MATERIALS[idx], name, brand, manufacturer, category, status, useType, synthetic, cfr, description, restrictions, lastUpdated: new Date().toISOString().slice(0, 10) };
    }
    showToast(`"${name}" updated successfully.`, 'success');
  } else {
    // Add new
    const maxId = MATERIALS.reduce((max, m) => Math.max(max, m.id), 0);
    const today = new Date().toISOString().slice(0, 10);
    MATERIALS.push({ id: maxId + 1, name, brand, manufacturer, category, useType, status, synthetic, cfr, description, restrictions, source: 'Manual Entry', dateAdded: today, lastUpdated: today });
    showToast(`"${name}" added to database.`, 'success');
  }

  // Refresh use-type dropdown if a new type was entered
  refreshUseTypes();
  updateStats();
  renderTable();
  closeAddForm();
}

function refreshUseTypes() {
  const sel = document.getElementById('useTypeFilter');
  const current = sel.value;
  const types = [...new Set(MATERIALS.map(m => m.useType))].sort();
  sel.innerHTML = '<option value="all">All Use Types</option>';
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
  sel.value = current;

  // Refresh manufacturer dropdown
  const mfrSel = document.getElementById('manufacturerFilter');
  const mfrCurrent = mfrSel.value;
  const mfrs = [...new Set(MATERIALS.map(m => m.manufacturer).filter(Boolean))].sort();
  mfrSel.innerHTML = '<option value="all">All Manufacturers</option>';
  mfrs.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    mfrSel.appendChild(opt);
  });
  mfrSel.value = mfrCurrent;

  // Refresh brand dropdown
  const brandSel = document.getElementById('brandFilter');
  const brandCurrent = brandSel.value;
  const brands = [...new Set(MATERIALS.map(m => m.brand).filter(Boolean))].sort();
  brandSel.innerHTML = '<option value="all">All Brands</option>';
  brands.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    brandSel.appendChild(opt);
  });
  brandSel.value = brandCurrent;
}

// ---- Delete Material ----
function deleteMaterial(id) {
  const m = MATERIALS.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Delete "${m.name}" from the database?`)) return;
  const idx = MATERIALS.findIndex(x => x.id === id);
  if (idx !== -1) MATERIALS.splice(idx, 1);
  showToast(`"${m.name}" removed.`, 'success');
  closeModal();
  refreshUseTypes();
  updateStats();
  renderTable();
}

// ---- Toast Notification ----
function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ---- Keyboard ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeAbout();
    closeAddForm();
  }
});
