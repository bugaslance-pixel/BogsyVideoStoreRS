// =============================================
// BVS - Bogsy Video Store | API-backed Logic
// =============================================

// ---- LOCAL CACHE (populated from API) ----
let customerLibrary  = [];
let videoLibrary     = [];
let archivedLibrary  = [];
let rentalRecords    = [];

// #12: track whether each dataset is still fresh
let _cacheValid = false;

// Mark cache dirty so next navigation triggers a real API reload
function invalidateCache() {
    _cacheValid = false;
}

let editingVideoId    = null;
let editingCustomerId = null;

// ---- HELPERS ----

function today() {
    return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

function daysBetween(from, to) {
    const a = new Date(from);
    const b = new Date(to);
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

async function apiFetch(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}

// #11: unwrap paginated response — accepts both plain array and { data: [...] }
function unwrap(response) {
    return Array.isArray(response) ? response : (response.data ?? []);
}

// #16: local fallback image — no external dependency
const NO_POSTER = '/images/no-poster.svg';

function mapVideo(v) {
    return {
        id:         v.videoId,
        title:      v.title,
        category:   v.category.trim(),
        days:       v.maxRentDays,
        stock:      v.stock,
        rented:     v.rentedCount,
        price:      v.price,
        poster:     v.posterUrl || NO_POSTER,
        isArchived: v.isArchived
    };
}

// ---- AUTH ----

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;

    try {
        await apiFetch('/Home/Login', 'POST', { username, password });
        invalidateCache(); // fresh data on login
        showAppAfterLogin();
        notify(`Welcome back, ${username}!`);
    } catch (err) {
        notify(err.message || 'Invalid username or password.', 'error');
    }
}

function showAppAfterLogin() {
    const loginPage   = document.getElementById('login-page');
    const sidebar     = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (!loginPage || !sidebar || !mainContent) return;

    loginPage.style.opacity = '0';
    setTimeout(() => {
        loginPage.style.display   = 'none';
        sidebar.style.display     = 'block';
        mainContent.style.display = 'block';
        showPage('dashboard');
    }, 300);
}

async function handleLogout() {
    await apiFetch('/Home/Logout', 'POST').catch(() => {});
    invalidateCache();
    const loginPage   = document.getElementById('login-page');
    const sidebar     = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (!loginPage || !sidebar || !mainContent) return;

    sidebar.style.display     = 'none';
    mainContent.style.display = 'none';
    loginPage.style.display   = 'flex';
    setTimeout(() => loginPage.style.opacity = '1', 50);
}

// ---- NAVIGATION ----

function showPage(id) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));

    const section = document.getElementById(id);
    if (!section) return;
    section.classList.add('active');

    const btn = Array.from(document.querySelectorAll('.sidebar .nav-link'))
        .find(b => b.getAttribute('onclick')?.includes(`showPage('${id}')`));
    if (btn) btn.classList.add('active');

    if (id === 'dashboard') renderGrids();
    if (id === 'videos')    renderLibrary();
    if (id === 'archived')  renderArchivedLibrary();
    if (id === 'customers') renderCustomers();
    if (id === 'rent')      { populateRentCustomerSelect(); populateRentVideoSelect(); setTodayDates(); }
    if (id === 'return')    { setReturnDateToday(); loadActiveRentals(); }
    if (id === 'reports')   renderInventoryReport();
}

// ---- DATA LOADING (#12: smart cache) ----

// Loads all data from API only if cache is stale; otherwise reuses in-memory arrays.
async function loadAllData(forceRefresh = false) {
    if (_cacheValid && !forceRefresh) return; // #12: skip API calls if cache is fresh

    try {
        // #11: fetch first page with a large pageSize to load all records in one shot
        const [customers, videos, archived, rentals] = await Promise.all([
            apiFetch('/api/customers?pageSize=200'),
            apiFetch('/api/videos?pageSize=100'),
            apiFetch('/api/videos/archived?pageSize=100'),
            apiFetch('/api/rentals?pageSize=500')
        ]);

        // #11: unwrap paginated responses
        customerLibrary = unwrap(customers).map(c => ({
            id:      c.customerId,
            name:    c.fullName,
            address: c.address,
            contact: c.contact
        }));

        videoLibrary    = unwrap(videos).map(mapVideo);
        archivedLibrary = unwrap(archived).map(mapVideo);

        rentalRecords   = unwrap(rentals).map(r => ({
            id:         r.rentalId,
            customerId: r.customerId,
            customer:   r.customer,
            videoId:    r.videoId,
            videoTitle: r.videoTitle,
            category:   r.category,
            price:      r.rentFee,
            rentDate:   r.rentDate,
            dueDate:    r.dueDate,
            returnDate: r.returnDate,
            penalty:    r.penalty,
            status:     r.status
        }));

        _cacheValid = true; // #12: mark cache as fresh
        updateOverdueBadge(); // #13: refresh overdue badge after every data load
    } catch (err) {
        notify('Failed to load data: ' + err.message, 'error');
    }
}

// ---- OVERDUE BADGE (#13) ----

function updateOverdueBadge() {
    const container = document.getElementById('overdueBadgeContainer');
    if (!container) return;

    const overdueCount = rentalRecords.filter(r => r.status === 'Overdue').length;

    if (overdueCount === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <span class="overdue-badge" title="${overdueCount} overdue rental(s)" onclick="showPage('return')" style="cursor:pointer;">
            <i class="fas fa-exclamation-circle me-1"></i>${overdueCount} Overdue
        </span>`;
}

// ---- DASHBOARD ----

async function renderGrids() {
    await loadAllData();
    const grid = document.getElementById('trending-grid');
    if (grid) grid.innerHTML = videoLibrary.slice(0, 4).map(v => generateCard(v)).join('');
    updateStats();
}

function updateStats() {
    const el = id => document.getElementById(id);
    if (el('stat-total'))     el('stat-total').innerText     = videoLibrary.length;
    if (el('stat-customers')) el('stat-customers').innerText = customerLibrary.length;
    if (el('stat-out'))       el('stat-out').innerText       = videoLibrary.reduce((a, v) => a + v.rented, 0);
    if (el('stat-in'))        el('stat-in').innerText        = videoLibrary.reduce((a, v) => a + (v.stock - v.rented), 0);
}

// ---- VIDEO LIBRARY ----

async function renderLibrary() {
    await loadAllData();
    renderLibraryGrid(videoLibrary);
}

function renderLibraryGrid(list) {
    const grid = document.getElementById('library-grid');
    if (!grid) return;
    if (list.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center w-100 mt-4">No videos found.</p>';
        return;
    }
    grid.innerHTML = list.map(v => generateCard(v, true)).join('');
}

async function renderArchivedLibrary() {
    await loadAllData();
    const grid = document.getElementById('archived-grid');
    if (!grid) return;
    if (archivedLibrary.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center w-100 mt-4">No archived videos.</p>';
        return;
    }
    grid.innerHTML = archivedLibrary.map(v => generateArchivedCard(v)).join('');
}

function generateCard(v, withAdmin = false) {
    const available = v.stock - v.rented;
    return `
        <div class="movie-card">
            <img src="${v.poster}" class="movie-poster" onerror="this.src='${NO_POSTER}'">
            <div class="movie-overlay">
                <h6 class="mb-0 text-truncate text-white fw-bold">${v.title}</h6>
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="price-tag">₱${v.price}</span>
                    <small class="text-white-50">${v.category}</small>
                </div>
                <small class="d-block mb-1 text-white-50">Max: ${v.days} day${v.days > 1 ? 's' : ''}</small>
                <small class="d-block mb-2 ${available > 0 ? 'text-success' : 'text-danger'}">${available} available / ${v.stock} total</small>
                <div class="d-flex gap-2">
                    ${withAdmin ? `
                        <button class="btn btn-sm btn-outline-light" onclick="openEditVideoModal(${v.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-warning" onclick="archiveVideo(${v.id})" title="Archive"><i class="fas fa-archive"></i></button>
                    ` : ''}
                </div>
            </div>
        </div>`;
}

function generateArchivedCard(v) {
    return `
        <div class="movie-card archived-card">
            <img src="${v.poster}" class="movie-poster" onerror="this.src='${NO_POSTER}'">
            <div class="movie-overlay">
                <span class="badge bg-warning text-dark mb-1"><i class="fas fa-archive me-1"></i>Archived</span>
                <h6 class="mb-0 text-truncate text-white fw-bold">${v.title}</h6>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="price-tag">₱${v.price}</span>
                    <small class="text-white-50">${v.category}</small>
                </div>
                <button class="btn btn-sm btn-outline-success w-100" onclick="restoreVideo(${v.id})">
                    <i class="fas fa-undo me-1"></i> Restore to Library
                </button>
            </div>
        </div>`;
}

function openEditVideoModal(id) {
    const v = videoLibrary.find(x => x.id === id);
    if (!v) return;

    editingVideoId = id;
    document.getElementById('modalTitle').innerText = 'Edit Video';
    document.getElementById('vTitle').value    = v.title;
    document.getElementById('vCategory').value = v.category;
    document.getElementById('vDays').value     = v.days;
    document.getElementById('vStock').value    = v.stock;
    updatePriceHint();

    const urlRadio = document.getElementById('posterModeUrl');
    if (urlRadio) { urlRadio.checked = true; switchPosterMode('url'); }
    document.getElementById('vPoster').value = (v.poster === NO_POSTER ? '' : v.poster) || '';
    showPosterPreview(v.poster !== NO_POSTER ? v.poster : '');

    new bootstrap.Modal(document.getElementById('videoModal')).show();
}

function saveVideo() {
    const title    = document.getElementById('vTitle')?.value?.trim();
    const category = document.getElementById('vCategory')?.value;
    const days     = parseInt(document.getElementById('vDays')?.value);
    const stock    = parseInt(document.getElementById('vStock')?.value);

    if (!title)               { notify('Movie title is required.', 'error'); return; }
    if (!['DVD','VCD'].includes(category)) { notify('Category must be DVD or VCD.', 'error'); return; }
    if (days < 1 || days > 3) { notify('Max rent days must be 1 to 3.', 'error'); return; }
    if (stock < 1)            { notify('Stock must be at least 1.', 'error'); return; }

    const mode = document.querySelector('input[name="posterMode"]:checked')?.value || 'url';

    if (mode === 'file') {
        const fileInput = document.getElementById('vPosterFile');
        const file = fileInput?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => applyVideoSave(title, category, days, stock, e.target.result);
            reader.readAsDataURL(file);
        } else {
            const existingPoster = editingVideoId !== null
                ? (videoLibrary.find(x => x.id === editingVideoId)?.poster || '')
                : '';
            applyVideoSave(title, category, days, stock, existingPoster);
        }
    } else {
        const poster = document.getElementById('vPoster')?.value?.trim() || '';
        applyVideoSave(title, category, days, stock, poster);
    }
}

async function applyVideoSave(title, category, days, stock, poster) {
    const dto = { title, category, maxRentDays: days, stock, posterUrl: poster };

    try {
        if (editingVideoId !== null) {
            await apiFetch(`/api/videos/${editingVideoId}`, 'PUT', dto);
            notify('Video updated!');
        } else {
            await apiFetch('/api/videos', 'POST', dto);
            notify('Video saved to BVS Database!');
        }

        bootstrap.Modal.getInstance(document.getElementById('videoModal'))?.hide();
        invalidateCache(); // #12: force reload after mutation
        await renderLibrary();
        updateStats();
    } catch (err) {
        notify(err.message || 'Failed to save video.', 'error');
    }
}

async function archiveVideo(id) {
    const v = videoLibrary.find(x => x.id === id);
    if (!v) return;
    if (!confirm(`Archive "${v.title}"? It will be moved to the Archived Videos list and cannot be rented.`)) return;

    try {
        await apiFetch(`/api/videos/${id}/archive`, 'PATCH');
        notify(`"${v.title}" has been archived.`);
        invalidateCache(); // #12
        await renderLibrary();
        updateStats();
    } catch (err) {
        notify(err.message || 'Failed to archive video.', 'error');
    }
}

async function restoreVideo(id) {
    const v = archivedLibrary.find(x => x.id === id);
    if (!v) return;
    if (!confirm(`Restore "${v.title}" back to the active library?`)) return;

    try {
        await apiFetch(`/api/videos/${id}/restore`, 'PATCH');
        notify(`"${v.title}" has been restored to the library!`);
        invalidateCache(); // #12
        await renderArchivedLibrary();
        updateStats();
    } catch (err) {
        notify(err.message || 'Failed to restore video.', 'error');
    }
}

function updatePriceHint() {
    const cat  = document.getElementById('vCategory')?.value;
    const hint = document.getElementById('vPriceHint');
    if (!hint) return;
    hint.innerText = cat === 'DVD' ? '₱50.00' : '₱25.00';
}

function resetVideoForm() {
    editingVideoId = null;
    document.getElementById('modalTitle').innerText = 'Add New Video';
    document.getElementById('videoForm')?.reset();
    const urlRadio = document.getElementById('posterModeUrl');
    if (urlRadio) { urlRadio.checked = true; switchPosterMode('url'); }
    hidePosterPreview();
    updatePriceHint();
}

// ---- POSTER MODE HELPERS ----

function switchPosterMode(mode) {
    const urlSection  = document.getElementById('posterUrlSection');
    const fileSection = document.getElementById('posterFileSection');
    if (!urlSection || !fileSection) return;
    if (mode === 'file') {
        urlSection.style.display  = 'none';
        fileSection.style.display = 'block';
    } else {
        urlSection.style.display  = 'block';
        fileSection.style.display = 'none';
    }
    hidePosterPreview();
}

function showPosterPreview(src) {
    const container = document.getElementById('posterPreviewContainer');
    const img       = document.getElementById('posterPreview');
    if (!container || !img || !src) { hidePosterPreview(); return; }
    img.src = src;
    container.style.display = 'block';
}

function hidePosterPreview() {
    const container = document.getElementById('posterPreviewContainer');
    if (container) container.style.display = 'none';
}

// ---- CUSTOMER LIBRARY ----

async function renderCustomers() {
    await loadAllData();
    const tbody = document.getElementById('customer-table-body');
    if (!tbody) return;

    if (customerLibrary.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No customers yet.</td></tr>';
        return;
    }

    tbody.innerHTML = customerLibrary.map(c => `
        <tr>
            <td>#${String(c.id).padStart(3,'0')}</td>
            <td>${c.name}</td>
            <td>${c.address}</td>
            <td>${c.contact}</td>
            <td>
                <button class="btn btn-sm btn-outline-light me-1" onclick="openEditCustomerModal(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger"     onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function openAddCustomerModal() {
    editingCustomerId = null;
    document.getElementById('customerModalTitle').innerText = 'Add Customer';
    document.getElementById('customerForm')?.reset();
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

function openEditCustomerModal(id) {
    const c = customerLibrary.find(x => x.id === id);
    if (!c) return;
    editingCustomerId = id;
    document.getElementById('customerModalTitle').innerText = 'Edit Customer';
    document.getElementById('cName').value    = c.name;
    document.getElementById('cAddress').value = c.address;
    document.getElementById('cContact').value = c.contact;
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

async function saveCustomer() {
    const name    = document.getElementById('cName')?.value?.trim();
    const address = document.getElementById('cAddress')?.value?.trim();
    const contact = document.getElementById('cContact')?.value?.trim();

    if (!name)    { notify('Customer name is required.', 'error'); return; }
    if (!address) { notify('Address is required.', 'error'); return; }
    if (!contact) { notify('Contact is required.', 'error'); return; }

    const dto = { fullName: name, address, contact };

    try {
        if (editingCustomerId !== null) {
            await apiFetch(`/api/customers/${editingCustomerId}`, 'PUT', dto);
            notify('Customer updated!');
        } else {
            await apiFetch('/api/customers', 'POST', dto);
            notify('Customer added!');
        }

        bootstrap.Modal.getInstance(document.getElementById('customerModal'))?.hide();
        invalidateCache(); // #12
        await renderCustomers();
        updateStats();
        refreshCustomerDropdowns();
    } catch (err) {
        notify(err.message || 'Failed to save customer.', 'error');
    }
}

async function deleteCustomer(id) {
    const c = customerLibrary.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete customer "${c.name}"?`)) return;

    try {
        await apiFetch(`/api/customers/${id}`, 'DELETE');
        notify('Customer removed.');
        invalidateCache(); // #12
        await renderCustomers();
        updateStats();
        refreshCustomerDropdowns();
    } catch (err) {
        notify(err.message || 'Failed to delete customer.', 'error');
    }
}

function refreshCustomerDropdowns() {
    const opts = '<option value="">Select Customer</option>' +
        customerLibrary.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const rentSel   = document.getElementById('rentCustomerSelect');
    const reportSel = document.getElementById('reportCustomerSelect');
    if (rentSel)   rentSel.innerHTML = opts;
    if (reportSel) {
        reportSel.innerHTML = '<option value="">Choose Customer...</option>' +
            customerLibrary.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

// ---- RENT MODULE ----

function setTodayDates() {
    const rentDateEl = document.getElementById('rentDate');
    if (rentDateEl) rentDateEl.value = today();
    updateDueDateFromVideo();
}

function populateRentCustomerSelect() {
    const sel = document.getElementById('rentCustomerSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Customer</option>' +
        customerLibrary.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateRentVideoSelect() {
    const sel = document.getElementById('rentVideoSelect');
    if (!sel) return;
    const available = videoLibrary.filter(v => v.stock > v.rented);
    sel.innerHTML = '<option value="">Select Video</option>' +
        available.map(v =>
            `<option value="${v.id}">${v.title} (${v.category} – ₱${v.price}) | ${v.stock - v.rented} left</option>`
        ).join('');
}

function updateDueDateFromVideo() {
    const sel    = document.getElementById('rentVideoSelect');
    const rentEl = document.getElementById('rentDate');
    const dueEl  = document.getElementById('dueDate');
    if (!sel || !rentEl || !dueEl) return;

    const videoId = parseInt(sel.value);
    const video   = videoLibrary.find(v => v.id === videoId);
    dueEl.value   = (video && rentEl.value) ? addDays(rentEl.value, video.days) : '';
}

async function handleRent(e) {
    e.preventDefault();

    const customerId = parseInt(document.getElementById('rentCustomerSelect')?.value);
    const videoId    = parseInt(document.getElementById('rentVideoSelect')?.value);
    const rentDate   = document.getElementById('rentDate')?.value;
    const dueDate    = document.getElementById('dueDate')?.value;

    if (!customerId) { notify('Please select a customer.', 'error'); return; }
    if (!videoId)    { notify('Please select a video.', 'error'); return; }
    if (!rentDate)   { notify('Please set a rent date.', 'error'); return; }
    if (!dueDate)    { notify('Due date is missing.', 'error'); return; }

    try {
        const result = await apiFetch('/api/rentals', 'POST', { customerId, videoId, rentDate, dueDate });
        notify(`✅ "${result.videoTitle}" rented to ${result.customerName}. Due: ${result.dueDate}`);
        invalidateCache(); // #12
        showPage('dashboard');
    } catch (err) {
        notify(err.message || 'Failed to process rental.', 'error');
    }
}

// ---- RETURN MODULE ----

function setReturnDateToday() {
    const el = document.getElementById('returnDate');
    if (el) el.value = today();
}

async function loadActiveRentals() {
    await loadAllData();
    const tbody = document.getElementById('activeRentalsTbody');
    if (!tbody) return;

    const active = rentalRecords.filter(r => r.status !== 'Returned');
    if (active.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No active rentals.</td></tr>';
        return;
    }

    tbody.innerHTML = active.map(r => {
        const badge = r.status === 'Overdue' ? 'bg-danger' : 'bg-success';
        return `<tr style="cursor:pointer" onclick="document.getElementById('returnRentalId').value='${r.id}'">
            <td>${r.id}</td>
            <td>${r.customer}</td>
            <td>${r.videoTitle}</td>
            <td>${r.dueDate}</td>
            <td><span class="badge ${badge}">${r.status}</span></td>
        </tr>`;
    }).join('');
}

async function handleReturn(e) {
    e.preventDefault();

    const rentalIdInput = document.getElementById('returnRentalId');
    const returnDateEl  = document.getElementById('returnDate');
    const rentalId      = rentalIdInput?.value?.trim().toUpperCase();
    const returnDate    = returnDateEl?.value;

    if (!rentalId)   { notify('Please enter a Rental ID.', 'error'); return; }
    if (!returnDate) { notify('Please set a return date.', 'error'); return; }

    try {
        const result = await apiFetch('/api/rentals/return', 'POST', { rentalId, returnDate });

        let msg = `✅ "${result.videoTitle}" returned by ${result.customerName}.`;
        if (result.penalty > 0)
            msg += ` Overdue by ${result.overdueDays} day(s) — Penalty: ₱${result.penalty}.`;

        notify(msg, result.penalty > 0 ? 'error' : 'success');

        const summary = document.getElementById('returnSummary');
        if (summary) {
            summary.style.display = 'block';
            summary.innerHTML = `
                <div class="alert ${result.penalty > 0 ? 'alert-danger' : 'alert-success'} mt-3">
                    <strong>Return Summary</strong><br>
                    Rental ID: ${result.rentalId}<br>
                    Customer: ${result.customerName}<br>
                    Video: ${result.videoTitle}<br>
                    Rent Fee: ₱${result.rentFee}<br>
                    ${result.penalty > 0 ? `<span class="text-danger">Overdue: ${result.overdueDays} day(s) × ₱5 = <strong>₱${result.penalty}</strong></span><br>` : ''}
                    <strong>Total Due: ₱${result.total}</strong>
                </div>`;
        }

        if (rentalIdInput) rentalIdInput.value = '';
        invalidateCache(); // #12
        await loadActiveRentals();
        updateOverdueBadge(); // #13: refresh badge after return
    } catch (err) {
        notify(err.message || 'Failed to process return.', 'error');
    }
}

// ---- REPORTS ----

async function renderInventoryReport() {
    await loadAllData();
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;
    const sorted = [...videoLibrary].sort((a, b) => a.title.localeCompare(b.title));
    tbody.innerHTML = sorted.length
        ? sorted.map(v => `
            <tr>
                <td>${v.title}</td>
                <td class="text-center">${v.category}</td>
                <td class="text-center text-success fw-bold">${v.stock - v.rented}</td>
                <td class="text-center text-warning fw-bold">${v.rented}</td>
            </tr>`).join('')
        : '<tr><td colspan="4" class="text-center text-muted">No videos.</td></tr>';

    const reportSel = document.getElementById('reportCustomerSelect');
    if (reportSel) {
        const current = reportSel.value;
        reportSel.innerHTML = '<option value="">Choose Customer...</option>' +
            customerLibrary.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        reportSel.value = current;
    }
}

function renderCustomerRentalReport() {
    const sel     = document.getElementById('reportCustomerSelect');
    const tbody   = document.getElementById('customer-rentals-body');
    const display = document.getElementById('displayCustomerName');
    const totalEl = document.getElementById('rentalReportTotal');

    if (!sel || !tbody || !display) return;

    const customerId = parseInt(sel.value);
    if (!customerId) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No customer selected.</td></tr>';
        display.innerText = 'Please select a customer';
        if (totalEl) totalEl.style.display = 'none';
        return;
    }

    const customer = customerLibrary.find(c => c.id === customerId);
    display.innerText = customer ? `Statement for: ${customer.name}` : '';

    const records = rentalRecords.filter(r => r.customerId === customerId);
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No rental records for this customer.</td></tr>';
        if (totalEl) totalEl.style.display = 'none';
        return;
    }

    let grandTotal = 0;
    tbody.innerHTML = records.map(r => {
        const total = r.price + r.penalty;
        grandTotal += total;
        const statusBadge = r.status === 'Returned' ? 'bg-secondary'
                          : r.status === 'Overdue'  ? 'bg-danger'
                          : 'bg-success';
        return `
            <tr>
                <td>${r.id}</td>
                <td>${r.videoTitle}</td>
                <td class="text-center">${r.category}</td>
                <td>${r.rentDate}</td>
                <td>${r.dueDate}</td>
                <td class="text-center">${r.penalty > 0 ? `<span class="text-danger">₱${r.penalty}</span>` : '—'}</td>
                <td class="text-center"><span class="badge ${statusBadge}">${r.status}</span></td>
            </tr>`;
    }).join('');

    if (totalEl) {
        totalEl.style.display = 'block';
        totalEl.innerHTML = `<div class="text-end mt-3 text-white fw-bold">Total Amount Due: <span class="text-warning">₱${grandTotal}</span></div>`;
    }
}

function printReport() {
    window.print();
}

// ---- SEARCH ----

function handleSearch(val) {
    const q = val.toLowerCase().trim();

    const dashGrid = document.getElementById('trending-grid');
    if (dashGrid && document.getElementById('dashboard')?.classList.contains('active')) {
        const filtered = q
            ? videoLibrary.filter(v => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q))
            : videoLibrary.slice(0, 4);
        dashGrid.innerHTML = filtered.length
            ? filtered.map(v => generateCard(v)).join('')
            : '<p class="text-muted text-center w-100 mt-4">No results found.</p>';
    }

    if (document.getElementById('videos')?.classList.contains('active')) {
        const filtered = q
            ? videoLibrary.filter(v => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q))
            : videoLibrary;
        renderLibraryGrid(filtered);
    }
}

// ---- NOTIFY TOAST ----

function notify(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.style.background = type === 'error' ? '#ef4444' : '#10b981';
    t.style.display = 'block';
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => (t.style.display = 'none'), 4000);
}

// ---- CLIENT-SIDE IDLE TIMEOUT (#9) ----
// Logs the user out after 60 minutes of no interaction.
(function () {
    const IDLE_MINUTES  = 60;
    const IDLE_MS       = IDLE_MINUTES * 60 * 1000;
    let _idleTimer      = null;

    function resetIdleTimer() {
        clearTimeout(_idleTimer);
        // Only run the timer when the user is actually logged in
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || sidebar.style.display === 'none') return;

        _idleTimer = setTimeout(async () => {
            notify('Session expired due to inactivity. Please log in again.', 'error');
            await handleLogout();
        }, IDLE_MS);
    }

    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
        document.addEventListener(evt, resetIdleTimer, { passive: true })
    );

    // Start once on load
    window.addEventListener('load', resetIdleTimer);
})();

// ---- INIT ----

window.addEventListener('load', () => {
    // Poster mode radio toggle
    document.querySelectorAll('input[name="posterMode"]').forEach(radio => {
        radio.addEventListener('change', () => switchPosterMode(radio.value));
    });

    document.getElementById('vPoster')?.addEventListener('input', function () {
        if (this.value.trim()) showPosterPreview(this.value.trim());
        else hidePosterPreview();
    });

    document.getElementById('vPosterFile')?.addEventListener('change', function () {
        const file = this.files?.[0];
        if (!file) { hidePosterPreview(); return; }
        const reader = new FileReader();
        reader.onload = e => showPosterPreview(e.target.result);
        reader.readAsDataURL(file);
    });
});