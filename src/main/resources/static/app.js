/**
 * StockWise Pro - Smart Inventory & POS Billing ERP
 * Core Single Page Application (SPA) Engine
 * Author: Kavita Kirikiri
 */

// Global State
const API_BASE = '/api';
let currentUser = null;
let productsCache = [];
let activeCart = [];
let salesTrendChart = null;
let categoryDoughnutChart = null;
let html5QrCodeScanner = null;
let activeCompletedBill = null;
let activeCategoryFilter = 'ALL';
let isLowStockOnlyFilter = false;

// Beep Audio Synth for Barcode Scanning
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}

// Format Currency to Indian Rupee (INR)
function formatINR(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white',
    warning: 'bg-amber-600 text-white',
  };
  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info',
    warning: 'fa-solid fa-triangle-exclamation',
  };

  toast.className = `${bgColors[type] || bgColors.info} px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} text-base"></i>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// API Request Wrapper
async function apiRequest(path, options = {}) {
  const url = API_BASE + path;
  const config = {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    let errMsg = 'Operation failed';
    try {
      const data = await response.json();
      errMsg = data.message || data.error || errMsg;
    } catch {
      // not json
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ==================== AUTHENTICATION & INITIALIZATION ====================

async function initApp() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  try {
    const me = await apiRequest('/auth/me');
    currentUser = me;
    onLoginSuccess(me);
  } catch (err) {
    showLoginView();
  }
}

function updateLiveClock() {
  const clockEl = document.getElementById('liveClock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('appView').classList.add('hidden');
}

function onLoginSuccess(user) {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  document.getElementById('userNameText').textContent = user.username.toUpperCase();
  document.getElementById('userRoleBadge').textContent = user.role.toUpperCase();
  document.getElementById('userAvatarText').textContent = user.username.slice(0, 2).toUpperCase();

  setupNavigation();
  loadDashboardData();
  loadProductsCatalog();
  loadCustomersData();
  loadSuppliersData();
  loadSalesHistory();
}

function fillCreds(u, p) {
  document.getElementById('username').value = u;
  document.getElementById('password').value = p;
  document.getElementById('loginError').textContent = '';
}

document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Signing in...</span>`;

  try {
    const user = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    currentUser = user;
    showToast(`Welcome back, ${user.username}!`, 'success');
    onLoginSuccess(user);
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Sign In to Terminal</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
  }
};

document.getElementById('logoutBtn').onclick = async () => {
  try {
    await fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {}
  currentUser = null;
  location.reload();
};

// ==================== NAVIGATION ENGINE ====================

function setupNavigation() {
  document.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.onclick = () => {
      showPage(btn.dataset.page);
    };
  });

  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle('hidden');
    };
  }
}

function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach((sec) => sec.classList.add('hidden'));
  document.querySelectorAll('button[data-page]').forEach((btn) => {
    if (btn.dataset.page === pageId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
  }

  // Auto Refresh per tab
  if (pageId === 'dashboard') loadDashboardData();
  if (pageId === 'billing') renderPosGrid();
  if (pageId === 'products') loadProductsCatalog();
  if (pageId === 'sales') loadSalesHistory();
  if (pageId === 'analytics') loadAnalyticsData();
}

// ==================== 1. DASHBOARD MODULE ====================

async function loadDashboardData() {
  try {
    const summary = await apiRequest('/dashboard/summary');

    document.getElementById('kpiTodaySales').textContent = formatINR(summary.todaySales);
    document.getElementById('kpiTotalSales').textContent = formatINR(summary.totalSales);
    document.getElementById('kpiBillCount').textContent = `${summary.billCount} bills generated`;
    document.getElementById('kpiProductCount').textContent = summary.productCount;
    document.getElementById('kpiValuation').textContent = formatINR(summary.retailValuation);
    document.getElementById('kpiLowStock').textContent = summary.lowStockCount;

    const lowBadge = document.getElementById('lowStockBadge');
    if (summary.lowStockCount > 0) {
      lowBadge.classList.remove('hidden');
    } else {
      lowBadge.classList.add('hidden');
    }

    // Load Charts & Analytics
    const analytics = await apiRequest('/dashboard/analytics');
    renderSalesTrendChart(analytics.dailyRevenue);
    renderCategoryDoughnutChart(analytics.categories);

    // Load Low Stock Table
    const lowStockList = await apiRequest('/products/low-stock');
    renderDashboardLowStock(lowStockList);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderSalesTrendChart(dailyData = {}) {
  const ctx = document.getElementById('salesTrendChart');
  if (!ctx) return;

  const labels = Object.keys(dailyData).map((d) => {
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
  });
  const values = Object.values(dailyData);

  if (salesTrendChart) salesTrendChart.destroy();

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  salesTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: values,
          borderColor: '#4f46e5',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#4f46e5',
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Revenue: ${formatINR(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => '₹' + v
          }
        }
      }
    }
  });
}

function renderCategoryDoughnutChart(categories = {}) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  const labels = Object.keys(categories);
  const values = Object.values(categories);

  if (categoryDoughnutChart) categoryDoughnutChart.destroy();

  categoryDoughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#ffffff',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
      },
      cutout: '68%'
    }
  });
}

function renderDashboardLowStock(list) {
  const container = document.getElementById('dashboardLowStockContainer');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-circle-check text-emerald-500 text-2xl mb-2 block"></i>
        <span>All inventory products are well above minimum buffer thresholds!</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
          <th class="py-3 px-4">Product Name</th>
          <th class="py-3 px-4">Category</th>
          <th class="py-3 px-4">Current Stock</th>
          <th class="py-3 px-4">Min Buffer</th>
          <th class="py-3 px-4">Wholesale Supplier</th>
          <th class="py-3 px-4 text-right">Quick Restock</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${list.map(p => `
          <tr class="hover:bg-slate-50/50 transition">
            <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(p.name)}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">${escapeHtml(p.category || 'General')}</span></td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">${p.quantity} units</span></td>
            <td class="py-3 px-4 font-mono text-slate-600">${p.minStock}</td>
            <td class="py-3 px-4 text-slate-500">${escapeHtml(p.supplierName || '—')}</td>
            <td class="py-3 px-4 text-right">
              <button onclick="quickRestock(${p.id}, 10)" class="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-bold text-[11px] border border-brand-200 transition">
                +10 Units
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function quickRestock(id, amount) {
  try {
    await apiRequest(`/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason: 'RESTOCK_RESTOCK' })
    });
    showToast(`Added ${amount} units to stock!`, 'success');
    loadDashboardData();
    loadProductsCatalog();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== 2. POS BILLING TERMINAL ====================

async function renderPosGrid() {
  try {
    productsCache = await apiRequest('/products');
    renderCategoryChips();
    filterPosGrid();
  } catch (err) {
    console.error('Failed to load POS products:', err);
  }
}

function renderCategoryChips() {
  const container = document.getElementById('posCategoryChips');
  if (!container) return;

  const categories = ['ALL', ...new Set(productsCache.map(p => p.category).filter(Boolean))];
  container.innerHTML = categories.map(c => `
    <button onclick="filterPosCategory('${escapeHtml(c)}')" 
      class="category-chip ${activeCategoryFilter === c ? 'active' : ''}">
      ${c === 'ALL' ? 'All Items' : escapeHtml(c)}
    </button>
  `).join('');
}

function filterPosCategory(category) {
  activeCategoryFilter = category;
  renderCategoryChips();
  filterPosGrid();
}

function filterPosGrid() {
  const grid = document.getElementById('posProductGrid');
  const search = (document.getElementById('posSearchInput')?.value || '').toLowerCase().trim();
  if (!grid) return;

  let filtered = productsCache.filter(p => {
    const matchesCat = activeCategoryFilter === 'ALL' || p.category === activeCategoryFilter;
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search) || 
      (p.barcode && p.barcode.toLowerCase().includes(search)) ||
      (p.category && p.category.toLowerCase().includes(search));
    return matchesCat && matchesSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-magnifying-glass text-3xl mb-2 text-slate-300 block"></i>
        <span>No matching products found. Try another search or barcode!</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const inStock = p.quantity > 0;
    const inCart = activeCart.find(x => x.productId === p.id);
    const cartQty = inCart ? inCart.quantity : 0;

    return `
      <div onclick="${inStock ? `addToCart(${p.id})` : ''}"
        class="group bg-white p-3 rounded-xl border border-slate-200 hover:border-brand-400 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden select-none ${!inStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}">
        
        ${cartQty > 0 ? `
          <span class="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shadow">
            ${cartQty}
          </span>
        ` : ''}

        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(p.category || 'Item')}</span>
            ${p.barcode ? `<span class="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 rounded"><i class="fa-solid fa-barcode text-[8px] mr-1"></i>${escapeHtml(p.barcode)}</span>` : ''}
          </div>
          <h4 class="text-xs font-bold text-slate-900 group-hover:text-brand-600 line-clamp-2 transition leading-snug">
            ${escapeHtml(p.name)}
          </h4>
        </div>

        <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span class="text-sm font-black text-slate-900 font-mono">${formatINR(p.price)}</span>
          <span class="text-[10px] font-bold ${p.quantity <= p.minStock ? 'text-rose-600' : 'text-slate-400'}">
            ${p.quantity} in stock
          </span>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('posSearchInput')?.addEventListener('input', () => {
  filterPosGrid();
});

function addToCart(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const existing = activeCart.find(x => x.productId === productId);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > product.quantity) {
    showToast(`Insufficient stock for ${product.name}! Only ${product.quantity} available.`, 'error');
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    activeCart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      availableStock: product.quantity,
    });
  }

  playBeepSound();
  renderCartDrawer();
  filterPosGrid();
}

function updateCartQuantity(productId, delta) {
  const item = activeCart.find(x => x.productId === productId);
  if (!item) return;

  if (item.quantity + delta <= 0) {
    activeCart = activeCart.filter(x => x.productId !== productId);
  } else if (item.quantity + delta > item.availableStock) {
    showToast(`Stock limit reached (${item.availableStock} max)`, 'warning');
    return;
  } else {
    item.quantity += delta;
  }

  renderCartDrawer();
  filterPosGrid();
}

function removeCartItem(productId) {
  activeCart = activeCart.filter(x => x.productId !== productId);
  renderCartDrawer();
  filterPosGrid();
}

function clearCart() {
  activeCart = [];
  renderCartDrawer();
  filterPosGrid();
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;

  if (!activeCart.length) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 text-xs">
        <i class="fa-solid fa-basket-shopping text-3xl mb-2 text-slate-300 block"></i>
        <span>Cart is empty. Tap products or scan barcode to add!</span>
      </div>
    `;
    calculateBillTotals();
    return;
  }

  container.innerHTML = activeCart.map(item => `
    <div class="py-2 flex items-center justify-between gap-2 text-xs">
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-800 truncate">${escapeHtml(item.name)}</p>
        <p class="text-[11px] text-slate-400 font-mono">${formatINR(item.price)} each</p>
      </div>

      <!-- Stepper -->
      <div class="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        <button onclick="updateCartQuantity(${item.productId}, -1)" class="w-5 h-5 rounded hover:bg-white text-slate-600 flex items-center justify-center font-bold">
          -
        </button>
        <span class="w-6 text-center font-bold font-mono text-slate-900">${item.quantity}</span>
        <button onclick="updateCartQuantity(${item.productId}, 1)" class="w-5 h-5 rounded hover:bg-white text-slate-600 flex items-center justify-center font-bold">
          +
        </button>
      </div>

      <div class="text-right min-w-[70px]">
        <p class="font-black text-slate-900 font-mono">${formatINR(item.price * item.quantity)}</p>
        <button onclick="removeCartItem(${item.productId})" class="text-[10px] text-rose-500 hover:text-rose-700">Remove</button>
      </div>
    </div>
  `).join('');

  calculateBillTotals();
}

function calculateBillTotals() {
  const subtotal = activeCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountInput = Number(document.getElementById('billDiscountInput')?.value || 0);
  const discount = Math.min(discountInput, subtotal);
  const taxable = subtotal - discount;

  const gstPercent = Number(document.getElementById('billGstSelect')?.value || 5);
  const gstAmount = taxable * (gstPercent / 100);
  const grandTotal = taxable + gstAmount;

  document.getElementById('billSubtotalText').textContent = formatINR(subtotal);
  document.getElementById('billGstAmountText').textContent = `+${formatINR(gstAmount)}`;
  document.getElementById('billGrandTotalText').textContent = formatINR(grandTotal);

  return { subtotal, discount, gstPercent, gstAmount, grandTotal };
}

async function processCheckout() {
  if (!activeCart.length) {
    showToast('Cart is empty. Add products before checking out!', 'warning');
    return;
  }

  const customerName = document.getElementById('billCustomerName')?.value.trim() || 'Walk-in Customer';
  const customerPhone = document.getElementById('billCustomerPhone')?.value.trim() || '';
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'UPI';
  const totals = calculateBillTotals();

  // If UPI, launch dynamic QR modal first
  if (payMethod === 'UPI') {
    openUpiModal(totals.grandTotal, customerName, customerPhone);
    return;
  }

  // Else direct complete
  await submitBillToServer(customerName, customerPhone, payMethod);
}

async function submitBillToServer(customerName, customerPhone, paymentMethod) {
  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Processing Bill...</span>`;

  try {
    const discount = Number(document.getElementById('billDiscountInput')?.value || 0);
    const gstPercent = Number(document.getElementById('billGstSelect')?.value || 5);

    const payload = {
      customerName,
      customerPhone,
      paymentMethod,
      discount,
      gstPercent,
      items: activeCart.map(x => ({ productId: x.productId, quantity: x.quantity }))
    };

    const bill = await apiRequest('/bills', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    activeCompletedBill = bill;

    // Celebratory Confetti!
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }

    showToast(`Bill #${bill.id} created successfully! Total: ${formatINR(bill.total)}`, 'success');

    // Reset Form
    activeCart = [];
    document.getElementById('billCustomerName').value = '';
    document.getElementById('billCustomerPhone').value = '';
    document.getElementById('billDiscountInput').value = '0';
    renderCartDrawer();

    // Reload Data
    renderPosGrid();
    loadDashboardData();
    loadSalesHistory();

    // Open Thermal Receipt Slip Modal for printing & WhatsApp
    openReceiptModal(bill);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-circle-check text-sm"></i><span>Complete Bill & Generate Receipt</span>`;
  }
}

// ==================== 3. DYNAMIC UPI QR PAYMENT GATEWAY ====================

function openUpiModal(amount, customerName, customerPhone) {
  const modal = document.getElementById('upiPaymentModal');
  const qrContainer = document.getElementById('upiQrcodeContainer');
  if (!modal || !qrContainer) return;

  document.getElementById('upiModalAmount').textContent = formatINR(amount);
  qrContainer.innerHTML = '';

  // Format Official NPCI UPI Deep Link String
  // upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=NOTE&cu=INR
  const upiId = 'kavita.store@upi';
  const merchantName = encodeURIComponent('StockWise Supermarket');
  const note = encodeURIComponent('Invoice Checkout');
  const upiUrl = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amount.toFixed(2)}&tn=${note}&cu=INR`;

  new QRCode(qrContainer, {
    text: upiUrl,
    width: 180,
    height: 180,
    colorDark: '#0f172a',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  modal.classList.remove('hidden');
}

function closeUpiModal() {
  document.getElementById('upiPaymentModal')?.classList.add('hidden');
}

async function confirmUpiSuccess() {
  closeUpiModal();
  const customerName = document.getElementById('billCustomerName')?.value.trim() || 'Walk-in Customer';
  const customerPhone = document.getElementById('billCustomerPhone')?.value.trim() || '';
  await submitBillToServer(customerName, customerPhone, 'UPI');
}

// ==================== 4. LIVE CAMERA BARCODE SCANNER ====================

function openBarcodeScannerModal() {
  const modal = document.getElementById('barcodeScannerModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  try {
    if (typeof Html5Qrcode !== 'undefined') {
      html5QrCodeScanner = new Html5Qrcode("reader");
      const config = { fps: 15, qrbox: { width: 250, height: 160 } };

      html5QrCodeScanner.start(
        { facingMode: "environment" },
        config,
        onBarcodeScanSuccess,
        onBarcodeScanFailure
      ).catch(err => {
        console.warn('Camera start warning (using simulated input):', err);
      });
    }
  } catch (err) {
    console.warn('Html5Qrcode scanner failed to initialize:', err);
  }
}

function closeBarcodeScannerModal() {
  const modal = document.getElementById('barcodeScannerModal');
  if (modal) modal.classList.add('hidden');

  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().then(() => {
      html5QrCodeScanner.clear();
      html5QrCodeScanner = null;
    }).catch(() => {});
  }
}

function onBarcodeScanSuccess(decodedText) {
  playBeepSound();
  closeBarcodeScannerModal();
  handleBarcodeScanned(decodedText.trim());
}

function onBarcodeScanFailure(error) {
  // Silent scan frame
}

function handleManualBarcode() {
  const input = document.getElementById('manualBarcodeInput');
  const code = (input?.value || '').trim();
  if (!code) return;
  closeBarcodeScannerModal();
  handleBarcodeScanned(code);
  input.value = '';
}

async function handleBarcodeScanned(barcode) {
  try {
    const product = await apiRequest(`/products/by-barcode/${encodeURIComponent(barcode)}`);
    showToast(`Scanned: ${product.name}`, 'success');
    showPage('billing');
    addToCart(product.id);
  } catch (err) {
    showToast(`No product found with barcode: ${barcode}`, 'warning');
  }
}

// ==================== 5. THERMAL RECEIPT SLIP & WHATSAPP SHARING ====================

function openReceiptModal(bill) {
  const modal = document.getElementById('thermalReceiptModal');
  const body = document.getElementById('receiptSlipBody');
  if (!modal || !body) return;

  activeCompletedBill = bill;

  const dateStr = new Date(bill.createdAt || Date.now()).toLocaleString('en-IN');
  const itemsHtml = (bill.items || []).map(item => `
    <div class="flex justify-between">
      <span>${escapeHtml(item.productName)} x ${item.quantity}</span>
      <span class="font-bold">${formatINR(item.amount)}</span>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="text-center pb-2 border-b border-dashed border-slate-300">
      <h2 class="text-sm font-black tracking-tight">⚡ STOCKWISE SUPERMARKET</h2>
      <p class="text-[10px] text-slate-500">Brigade Gateway, Bengaluru, KA</p>
      <p class="text-[10px] text-slate-500 font-mono">GSTIN: 29ABCDE1234F1Z5</p>
      <p class="text-[10px] text-slate-500">Phone: +91 80 4123 4567</p>
    </div>

    <div class="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
      <div class="flex justify-between"><span>INVOICE #:</span><span class="font-bold">INV-${bill.id}</span></div>
      <div class="flex justify-between"><span>DATE:</span><span>${dateStr}</span></div>
      <div class="flex justify-between"><span>CUSTOMER:</span><span>${escapeHtml(bill.customerName || 'Walk-in Customer')}</span></div>
      ${bill.customerPhone ? `<div class="flex justify-between"><span>PHONE:</span><span>${escapeHtml(bill.customerPhone)}</span></div>` : ''}
      <div class="flex justify-between"><span>CASHIER:</span><span>${(currentUser?.username || 'admin').toUpperCase()}</span></div>
      <div class="flex justify-between"><span>PAYMENT:</span><span class="font-bold text-emerald-700">${bill.paymentMethod || 'UPI'}</span></div>
    </div>

    <!-- Items -->
    <div class="py-2 border-b border-dashed border-slate-300 space-y-1.5">
      <div class="flex justify-between font-bold text-[10px] uppercase text-slate-400">
        <span>Description</span>
        <span>Amount</span>
      </div>
      ${itemsHtml}
    </div>

    <!-- Taxes & Totals -->
    <div class="space-y-1 border-b border-dashed border-slate-300 pb-2">
      <div class="flex justify-between"><span>Subtotal:</span><span>${formatINR(bill.subtotal)}</span></div>
      ${bill.discount > 0 ? `<div class="flex justify-between text-rose-600"><span>Discount:</span><span>-${formatINR(bill.discount)}</span></div>` : ''}
      <div class="flex justify-between text-slate-500"><span>CGST (${(bill.gstPercent/2).toFixed(1)}%):</span><span>${formatINR(bill.gstAmount/2)}</span></div>
      <div class="flex justify-between text-slate-500"><span>SGST (${(bill.gstPercent/2).toFixed(1)}%):</span><span>${formatINR(bill.gstAmount/2)}</span></div>
      <div class="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
        <span>TOTAL AMOUNT:</span>
        <span class="text-brand-600 font-bold">${formatINR(bill.total)}</span>
      </div>
    </div>

    <div class="text-center pt-2 space-y-1 text-[10px] text-slate-500">
      <p class="font-bold text-slate-700">Thank you for your visit! 🙏</p>
      <p>Goods once sold cannot be returned without original receipt.</p>
      <p class="font-mono text-[9px] text-slate-400">Powered by StockWise Pro ERP</p>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('thermalReceiptModal')?.classList.add('hidden');
}

function printReceiptSlip() {
  window.print();
}

function shareActiveBillWhatsApp() {
  if (!activeCompletedBill) return;
  const bill = activeCompletedBill;

  let phone = bill.customerPhone ? bill.customerPhone.replace(/[^0-9]/g, '') : '';
  if (!phone) {
    phone = prompt('Enter customer WhatsApp mobile number (with country code, e.g. 919876543210):', '91');
    if (!phone) return;
    phone = phone.replace(/[^0-9]/g, '');
  }

  const itemsList = (bill.items || []).map(i => `• ${i.productName} x ${i.quantity} = ₹${i.amount.toFixed(2)}`).join('\n');
  const message = `🧾 *STOCKWISE SUPERMARKET INVOICE*
--------------------------------
Invoice: #INV-${bill.id}
Date: ${new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN')}
Customer: ${bill.customerName || 'Customer'}
Payment: ${bill.paymentMethod || 'UPI'}

*ITEMS:*
${itemsList}
--------------------------------
Subtotal: ₹${bill.subtotal.toFixed(2)}
GST (${bill.gstPercent}%): ₹${bill.gstAmount.toFixed(2)}
*TOTAL PAID: ₹${bill.total.toFixed(2)}*

Thank you for shopping with us! 🙏
Visit: http://localhost:8080/`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

window.downloadInvoicePDF = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/bills/${id}/pdf`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not download PDF invoice');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Invoice-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Invoice #${id} PDF downloaded!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==================== 6. PRODUCTS CATALOG MODULE ====================

async function loadProductsCatalog() {
  try {
    const search = document.getElementById('productCatalogSearch')?.value || '';
    const list = await apiRequest(`/products${search ? '?search=' + encodeURIComponent(search) : ''}`);
    renderProductsTable(list);
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

document.getElementById('productCatalogSearch')?.addEventListener('input', () => {
  loadProductsCatalog();
});

function toggleLowStockFilter() {
  isLowStockOnlyFilter = !isLowStockOnlyFilter;
  const btn = document.getElementById('lowStockFilterBtn');
  if (isLowStockOnlyFilter) {
    btn.classList.add('bg-rose-600', 'text-white');
    btn.classList.remove('bg-rose-50', 'text-rose-700');
  } else {
    btn.classList.remove('bg-rose-600', 'text-white');
    btn.classList.add('bg-rose-50', 'text-rose-700');
  }
  loadProductsCatalog();
}

function filterLowStockOnly() {
  isLowStockOnlyFilter = true;
  const btn = document.getElementById('lowStockFilterBtn');
  if (btn) {
    btn.classList.add('bg-rose-600', 'text-white');
    btn.classList.remove('bg-rose-50', 'text-rose-700');
  }
  loadProductsCatalog();
}

function renderProductsTable(list) {
  const container = document.getElementById('productCatalogTableContainer');
  if (!container) return;

  if (isLowStockOnlyFilter) {
    list = list.filter(p => p.quantity <= p.minStock);
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-boxes-stacked text-3xl mb-2 text-slate-300 block"></i>
        <span>No products found matching criteria.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
          <th class="py-3 px-4">SKU / Item</th>
          <th class="py-3 px-4">Category</th>
          <th class="py-3 px-4">Barcode</th>
          <th class="py-3 px-4">Retail Price</th>
          <th class="py-3 px-4">Cost Price</th>
          <th class="py-3 px-4">Est. Margin</th>
          <th class="py-3 px-4">Stock Status</th>
          <th class="py-3 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${list.map(p => {
          const margin = p.price > 0 ? (((p.price - (p.costPrice || p.price * 0.75)) / p.price) * 100).toFixed(0) : 0;
          const isLow = p.quantity <= p.minStock;

          return `
            <tr class="hover:bg-slate-50/60 transition">
              <td class="py-3 px-4">
                <span class="font-bold text-slate-900 block">${escapeHtml(p.name)}</span>
                <span class="text-[10px] text-slate-400">${escapeHtml(p.supplierName || 'Self Sourced')}</span>
              </td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                  ${escapeHtml(p.category || 'General')}
                </span>
              </td>
              <td class="py-3 px-4 font-mono text-slate-500">
                ${p.barcode ? `<span class="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]"><i class="fa-solid fa-barcode mr-1 text-[9px]"></i>${escapeHtml(p.barcode)}</span>` : '—'}
              </td>
              <td class="py-3 px-4 font-mono font-bold text-slate-900">${formatINR(p.price)}</td>
              <td class="py-3 px-4 font-mono text-slate-500">${formatINR(p.costPrice || p.price * 0.75)}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  ${margin}%
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isLow ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}">
                  ${p.quantity} units ${isLow ? '(LOW)' : ''}
                </span>
              </td>
              <td class="py-3 px-4 text-right space-x-1">
                <button onclick="quickRestock(${p.id}, 10)" title="Quick Restock +10" class="p-1.5 hover:bg-slate-100 text-brand-600 rounded">
                  <i class="fa-solid fa-plus-circle"></i>
                </button>
                <button onclick='editProduct(${JSON.stringify(p)})' title="Edit" class="p-1.5 hover:bg-slate-100 text-slate-600 rounded">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button onclick="deleteProduct(${p.id})" title="Delete" class="p-1.5 hover:bg-rose-50 text-rose-600 rounded">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openProductModal(p = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  if (!modal) return;

  if (p) {
    title.textContent = 'Edit Product SKU';
    document.getElementById('pModalId').value = p.id;
    document.getElementById('pModalName').value = p.name;
    document.getElementById('pModalCategory').value = p.category || '';
    document.getElementById('pModalBarcode').value = p.barcode || '';
    document.getElementById('pModalPrice').value = p.price;
    document.getElementById('pModalCostPrice').value = p.costPrice || '';
    document.getElementById('pModalQty').value = p.quantity;
    document.getElementById('pModalMinStock').value = p.minStock;
    document.getElementById('pModalSupplier').value = p.supplierName || '';
  } else {
    title.textContent = 'Add New Product SKU';
    document.getElementById('productModalForm').reset();
    document.getElementById('pModalId').value = '';
    document.getElementById('pModalMinStock').value = '5';
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.add('hidden');
}

window.editProduct = (p) => openProductModal(p);

window.deleteProduct = async (id) => {
  if (confirm('Are you sure you want to delete this product SKU?')) {
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted', 'info');
      loadProductsCatalog();
      loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

document.getElementById('productModalForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pModalId').value;
  const payload = {
    name: document.getElementById('pModalName').value.trim(),
    category: document.getElementById('pModalCategory').value.trim(),
    barcode: document.getElementById('pModalBarcode').value.trim(),
    price: Number(document.getElementById('pModalPrice').value),
    costPrice: Number(document.getElementById('pModalCostPrice').value || 0),
    quantity: Number(document.getElementById('pModalQty').value),
    minStock: Number(document.getElementById('pModalMinStock').value),
    supplierName: document.getElementById('pModalSupplier').value.trim(),
  };

  try {
    await apiRequest(`/products${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeProductModal();
    showToast(id ? 'Product updated' : 'Product created successfully', 'success');
    loadProductsCatalog();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==================== 7. SALES & INVOICES AUDIT ====================

async function loadSalesHistory() {
  try {
    const list = await apiRequest('/bills');
    renderSalesTable(list);
  } catch (err) {
    console.error('Failed to load sales history:', err);
  }
}

function renderSalesTable(bills) {
  const container = document.getElementById('salesHistoryTableContainer');
  if (!container) return;

  if (!bills.length) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300 block"></i>
        <span>No sales history recorded yet.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
          <th class="py-3 px-4">Invoice #</th>
          <th class="py-3 px-4">Date & Time</th>
          <th class="py-3 px-4">Customer</th>
          <th class="py-3 px-4">Items Count</th>
          <th class="py-3 px-4">Payment</th>
          <th class="py-3 px-4">Grand Total</th>
          <th class="py-3 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${bills.map(b => `
          <tr class="hover:bg-slate-50/60 transition">
            <td class="py-3 px-4 font-mono font-bold text-brand-600">#INV-${b.id}</td>
            <td class="py-3 px-4 text-slate-600">${new Date(b.createdAt).toLocaleString('en-IN')}</td>
            <td class="py-3 px-4 font-medium text-slate-900">${escapeHtml(b.customerName || 'Walk-in Customer')}</td>
            <td class="py-3 px-4 font-mono text-slate-600">${b.items ? b.items.length : 0} items</td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${b.paymentMethod === 'UPI' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}">
                ${b.paymentMethod || 'UPI'}
              </span>
            </td>
            <td class="py-3 px-4 font-mono font-black text-slate-900">${formatINR(b.total)}</td>
            <td class="py-3 px-4 text-right space-x-1">
              <button onclick='openReceiptModal(${JSON.stringify(b)})' title="View Thermal Slip" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition">
                <i class="fa-solid fa-receipt mr-1"></i>Slip
              </button>
              <button onclick="downloadInvoicePDF(${b.id})" title="Download Official PDF" class="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded font-semibold text-[11px] transition">
                <i class="fa-solid fa-file-pdf mr-1 text-rose-600"></i>PDF
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ==================== 8. CUSTOMERS & SUPPLIERS ====================

async function loadCustomersData() {
  try {
    const list = await apiRequest('/customers');
    const container = document.getElementById('customersTableContainer');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<div class="py-16 text-center text-slate-400 text-xs">No registered customers.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Customer Name</th>
            <th class="py-3 px-4">Phone / WhatsApp</th>
            <th class="py-3 px-4">Email</th>
            <th class="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(c => `
            <tr class="hover:bg-slate-50/60 transition">
              <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(c.name)}</td>
              <td class="py-3 px-4 font-mono text-slate-600">${escapeHtml(c.phone || '—')}</td>
              <td class="py-3 px-4 text-slate-500">${escapeHtml(c.email || '—')}</td>
              <td class="py-3 px-4 text-right">
                ${c.phone ? `
                  <a href="https://wa.me/${c.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold">
                    <i class="fa-brands fa-whatsapp mr-1"></i>Chat
                  </a>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
}

function openCustomerModal() {
  document.getElementById('customerModal')?.classList.remove('hidden');
}

function closeCustomerModal() {
  document.getElementById('customerModal')?.classList.add('hidden');
}

document.getElementById('customerModalForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('cModalName').value.trim(),
    phone: document.getElementById('cModalPhone').value.trim(),
    email: document.getElementById('cModalEmail').value.trim(),
  };

  try {
    await apiRequest('/customers', { method: 'POST', body: JSON.stringify(payload) });
    closeCustomerModal();
    showToast('Customer added successfully', 'success');
    loadCustomersData();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function loadSuppliersData() {
  try {
    const list = await apiRequest('/suppliers');
    const container = document.getElementById('suppliersTableContainer');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<div class="py-16 text-center text-slate-400 text-xs">No registered suppliers.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Company Name</th>
            <th class="py-3 px-4">Contact Phone</th>
            <th class="py-3 px-4">Email</th>
            <th class="py-3 px-4">Warehouse Address</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(s => `
            <tr class="hover:bg-slate-50/60 transition">
              <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(s.name)}</td>
              <td class="py-3 px-4 font-mono text-slate-600">${escapeHtml(s.phone || '—')}</td>
              <td class="py-3 px-4 text-slate-500">${escapeHtml(s.email || '—')}</td>
              <td class="py-3 px-4 text-slate-600">${escapeHtml(s.address || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load suppliers:', err);
  }
}

function openSupplierModal() {
  document.getElementById('supplierModal')?.classList.remove('hidden');
}

function closeSupplierModal() {
  document.getElementById('supplierModal')?.classList.add('hidden');
}

document.getElementById('supplierModalForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('sModalName').value.trim(),
    phone: document.getElementById('sModalPhone').value.trim(),
    email: document.getElementById('sModalEmail').value.trim(),
    address: document.getElementById('sModalAddress').value.trim(),
  };

  try {
    await apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(payload) });
    closeSupplierModal();
    showToast('Supplier registered', 'success');
    loadSuppliersData();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==================== 9. AI RECEIPT OCR (INTERNSHIP HIGHLIGHT) ====================

let pendingOcrItems = [];

const sampleReceipts = {
  tech: {
    supplier: 'Apex Tech Hardware Distributors',
    date: '18-Nov-2026',
    items: [
      { name: 'Wireless Optical Mouse', category: 'Electronics', barcode: '8901030382741', qty: 25, price: 499.0, costPrice: 320.0 },
      { name: 'Mechanical Gaming Keyboard', category: 'Electronics', barcode: '8901233014125', qty: 10, price: 1899.0, costPrice: 1350.0 },
      { name: 'USB-C Fast Charging Cable (1.5m)', category: 'Electronics', barcode: '8902519001432', qty: 40, price: 249.0, costPrice: 110.0 },
    ]
  },
  stationery: {
    supplier: 'Metro Paper Mills & Stationery',
    date: '18-Nov-2026',
    items: [
      { name: 'Spiral Notebook 300 Pages (A4)', category: 'Stationery', barcode: '8901058852448', qty: 50, price: 120.0, costPrice: 75.0 },
      { name: 'Gel Pen Smooth Flow (Pack of 5)', category: 'Stationery', barcode: '8903344556677', qty: 40, price: 50.0, costPrice: 28.0 },
    ]
  }
};

function loadSampleReceipt(key) {
  const data = sampleReceipts[key];
  if (!data) return;

  simulateOcrParsing(data);
}

document.getElementById('dropZone')?.addEventListener('click', () => {
  document.getElementById('receiptFileInput')?.click();
});

function handleReceiptUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const previewBox = document.getElementById('receiptPreviewBox');
    const previewImg = document.getElementById('receiptPreviewImg');
    previewImg.src = e.target.result;
    previewBox.classList.remove('hidden');

    // Simulate AI Vision OCR processing
    setTimeout(() => {
      previewBox.querySelector('div').classList.add('hidden');
      simulateOcrParsing(sampleReceipts.tech);
    }, 1200);
  };
  reader.readAsDataURL(file);
}

function simulateOcrParsing(data) {
  const statusBadge = document.getElementById('ocrStatusBadge');
  const container = document.getElementById('ocrResultsContainer');
  const actionBar = document.getElementById('ocrActionBar');

  statusBadge.textContent = 'EXTRACTED (100%)';
  statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';

  pendingOcrItems = data.items;

  container.innerHTML = `
    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
      <div class="flex justify-between">
        <span class="text-slate-500 font-semibold">Detected Vendor:</span>
        <span class="font-bold text-slate-900">${data.supplier}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-500 font-semibold">Invoice Date:</span>
        <span class="font-mono text-slate-700">${data.date}</span>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs font-bold text-slate-700">Parsed Products (${data.items.length} SKUs):</p>
      ${data.items.map(item => `
        <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs">
          <div>
            <p class="font-bold text-slate-900">${item.name}</p>
            <p class="text-[10px] text-slate-400 font-mono">Barcode: ${item.barcode} · ${item.category}</p>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              +${item.qty} units
            </span>
            <p class="font-mono text-slate-700 text-[11px] mt-0.5">Wholesale: ${formatINR(item.costPrice)}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  actionBar.classList.remove('hidden');
}

async function importOcrToInventory() {
  if (!pendingOcrItems.length) return;

  const btn = document.getElementById('importOcrBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Importing to Database...</span>`;

  try {
    for (const item of pendingOcrItems) {
      // Check if product exists
      const existing = productsCache.find(p => p.barcode === item.barcode || p.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        await apiRequest(`/products/${existing.id}/adjust-stock`, {
          method: 'POST',
          body: JSON.stringify({ amount: item.qty, reason: 'AI_OCR_IMPORT' })
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify({
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            price: item.price,
            costPrice: item.costPrice,
            quantity: item.qty,
            minStock: 5,
            supplierName: 'AI Supplier Import'
          })
        });
      }
    }

    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 50 });
    }

    showToast(`Successfully imported ${pendingOcrItems.length} items to inventory!`, 'success');
    pendingOcrItems = [];
    document.getElementById('ocrActionBar').classList.add('hidden');
    document.getElementById('ocrStatusBadge').textContent = 'IMPORTED';

    loadProductsCatalog();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrow-down-to-bracket text-sm"></i><span>Import Extracted Items to Inventory</span>`;
  }
}

// ==================== 10. FINANCIAL ANALYTICS ====================

async function loadAnalyticsData() {
  try {
    const summary = await apiRequest('/dashboard/summary');
    const analytics = await apiRequest('/dashboard/analytics');

    const retail = summary.retailValuation || 0;
    const profit = summary.projectedProfit || 0;
    const cost = retail - profit;
    const margin = retail > 0 ? ((profit / retail) * 100).toFixed(1) : 0;

    document.getElementById('analyticsRetailValuation').textContent = formatINR(retail);
    document.getElementById('analyticsCostBasis').textContent = formatINR(cost);
    document.getElementById('analyticsProjectedProfit').textContent = formatINR(profit);
    document.getElementById('analyticsMarginPercent').textContent = `${margin}%`;

    const container = document.getElementById('analyticsMovementsTableContainer');
    if (!container) return;

    const list = analytics.recentMovements || [];
    if (!list.length) {
      container.innerHTML = `<div class="py-12 text-center text-slate-400 text-xs">No stock transactions logged yet.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Timestamp</th>
            <th class="py-3 px-4">Product Name</th>
            <th class="py-3 px-4">Operation</th>
            <th class="py-3 px-4">Change Quantity</th>
            <th class="py-3 px-4">Stock After</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(m => `
            <tr class="hover:bg-slate-50/50 transition">
              <td class="py-3 px-4 text-slate-500">${new Date(m.timestamp).toLocaleString('en-IN')}</td>
              <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(m.productName)}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.operation === 'SALE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${m.operation}
                </span>
              </td>
              <td class="py-3 px-4 font-mono font-bold ${m.changeAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}">
                ${m.changeAmount > 0 ? '+' : ''}${m.changeAmount}
              </td>
              <td class="py-3 px-4 font-mono font-bold text-slate-800">${m.quantityAfter}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

// ==================== CSV EXPORT UTILITIES ====================

function exportProductsCSV() {
  if (!productsCache.length) return showToast('No products to export', 'warning');

  const headers = ['ID', 'Name', 'Category', 'Barcode', 'Price', 'CostPrice', 'Quantity', 'MinStock', 'Supplier'];
  const rows = productsCache.map(p => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    `"${(p.barcode || '')}"`,
    p.price,
    p.costPrice || 0,
    p.quantity,
    p.minStock,
    `"${(p.supplierName || '').replace(/"/g, '""')}"`
  ]);

  downloadCSV('inventory-products.csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
}

async function exportSalesCSV() {
  try {
    const bills = await apiRequest('/bills');
    if (!bills.length) return showToast('No sales records to export', 'warning');

    const headers = ['BillID', 'Date', 'CustomerName', 'CustomerPhone', 'PaymentMethod', 'Subtotal', 'Discount', 'GSTAmount', 'TotalAmount'];
    const rows = bills.map(b => [
      b.id,
      `"${b.createdAt}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${(b.customerPhone || '')}"`,
      b.paymentMethod || 'UPI',
      b.subtotal,
      b.discount,
      b.gstAmount,
      b.total
    ]);

    downloadCSV('sales-invoices.csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${filename}`, 'success');
}

// Utility: HTML Escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Launch App on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
