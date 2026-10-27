/**
 * WAFARTHA SAH - MAIN PUBLIC WEBSITE SCRIPT (app.js)
 * يدير عرض المنتجات، البحث المباشر، الفلاتر، العداد التنازلي، المفضلة، وشريط الإعلانات.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.db) {
    await window.db.initPromise;
  }
  initStoreApp();
});

function initStoreApp() {
  applySiteSettings();
  initAnnouncementTicker();
  initCountdownTimer();
  renderStoreBadges();
  renderCategoriesGrid();
  renderAllProductSections();
  initSearch();
  initFavoritesSystem();
  updateFavoritesBadge();
  initProductCountBanner();
  initAdminTrigger();
}

// ----------------------------------------------------
// 1. تطبيق إعدادات الموقع
// ----------------------------------------------------
function applySiteSettings() {
  const settings = window.db.getSettings();
  if (!settings) return;

  // تحديث النصوص
  const titleEl = document.getElementById('heroTitleText');
  const subtitleEl = document.getElementById('heroSubtitleText');
  const siteBrandName = document.getElementById('siteBrandName');
  if (titleEl && settings.heroTitle) titleEl.innerHTML = formatHeroTitle(settings.heroTitle);
  if (subtitleEl && settings.heroSubtitle) subtitleEl.textContent = settings.heroSubtitle;
  if (siteBrandName && settings.siteName) siteBrandName.textContent = settings.siteName;

  // روابط التواصل الاجتماعي — تُخفى الأيقونة إذا لم يكن هناك رابط حقيقي
  if (settings.socialLinks) {
    const socials = [
      ['socialWhatsapp', settings.socialLinks.whatsapp],
      ['socialTelegram', settings.socialLinks.telegram],
      ['socialInstagram', settings.socialLinks.instagram],
      ['socialTwitter', settings.socialLinks.twitter],
      ['socialFacebook', settings.socialLinks.facebook],
    ];
    socials.forEach(([id, url]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!url || url === '#' || url === '') {
        el.style.display = 'none';
        el.removeAttribute('href');
        return;
      }
      el.href = url;
    });
  }
}

function formatHeroTitle(title) {
  // تلوين الكلمة الأخيرة باللون البرتقالي الجذاب
  const words = title.split(' ');
  if (words.length > 1) {
    const last = words.pop();
    return `${words.join(' ')} <span>${last}</span>`;
  }
  return `<span>${title}</span>`;
}

// ----------------------------------------------------
// 2. عدّاد إجمالي المنتجات في الشريط الأخضر العلوي
// ----------------------------------------------------
function updateProductCountBanner() {
  const valueEl = document.getElementById('productCountValue');
  if (!valueEl || !window.db) return;

  let total = 0;
  try {
    total = window.db.getProducts().length;
  } catch (err) {
    return;
  }

  const formatted = total.toLocaleString('en-US');
  if (valueEl.textContent !== formatted) {
    valueEl.textContent = formatted;
  }
}

function initProductCountBanner() {
  updateProductCountBanner();
  // يُحدَّث تلقائيًا دون الحاجة لإعادة تحميل الصفحة
  setInterval(updateProductCountBanner, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateProductCountBanner();
  });
  window.addEventListener('storage', updateProductCountBanner);
}

window.refreshProductCount = updateProductCountBanner;

// ----------------------------------------------------
// 3. شريط الإعلانات الترويجي
// ----------------------------------------------------
function initAnnouncementTicker() {
  const settings = window.db.getSettings();
  const tickerContainer = document.getElementById('announcementTicker');
  if (!tickerContainer) return;

  const text = settings.announcementText || '🔥 عروض حصرية على Amazon • تخفيضات ضخمة على Noon • أسعار لا تُصدق على Temu 💰';

  // تكرار النص لملء الشريط المتحرك بانسيابية
  tickerContainer.innerHTML = `
    <div class="ticker-item">${text}</div>
    <div class="ticker-item">${text}</div>
    <div class="ticker-item">${text}</div>
  `;
}

// ----------------------------------------------------
// 3. عداد عروض اليوم التنازلي (Countdown Timer)
// ----------------------------------------------------
function initCountdownTimer() {
  // تم إزالة عداد الوقت التنازلي بناءً على طلب المستخدم
}

// ----------------------------------------------------
// 4. عرض شعارات المتاجر الرسمية بدقة من assets/images/stores
// ----------------------------------------------------
const STORE_LOGOS_MAP = {
  amazon: 'assets/images/stores/amazon.svg',
  noon: 'assets/images/stores/noon.svg',
  temu: 'assets/images/stores/temu.svg',
  shein: 'assets/images/stores/shein.svg',
  trendyol: 'assets/images/stores/trendyol.svg',
  namshi: 'assets/images/stores/namshi.svg',
  fordel: 'assets/images/stores/fordel.svg',
  fordeal: 'assets/images/stores/fordel.svg',
  theluxury: 'assets/images/stores/theluxury.svg',
  aliexpress: 'assets/images/stores/aliexpress.svg',
  'the luxury': 'assets/images/stores/theluxury.svg'
};

const STORE_NAMES_MAP = {
  amazon: 'أمازون (Amazon)',
  aliexpress: 'علي إكسبريس (AliExpress)',
  noon: 'نون (Noon)',
  temu: 'تيمو (Temu)',
  shein: 'شي إن (SHEIN)',
  trendyol: 'ترينديول (Trendyol)',
  namshi: 'نمشي (Namshi)',
  fordel: 'فورديل (Fordeal)',
  fordeal: 'فورديل (Fordeal)',
  theluxury: 'ذا لاكجري كلوزيت (The Luxury)',
  'the luxury': 'ذا لاكجري كلوزيت (The Luxury)'
};

function getStoreLogoUrl(storeId) {
  if (!storeId) return '';
  return STORE_LOGOS_MAP[storeId.toLowerCase()] || '';
}

function createStoreBadgeHTML(storeId) {
  const storeName = STORE_NAMES_MAP[storeId] || storeId.toUpperCase();
  const logoUrl = getStoreLogoUrl(storeId);

  if (!logoUrl) {
    return `<span class="store-badge">${escapeHtml(storeName)}</span>`;
  }

  return `
    <span class="store-badge store-logo-badge" title="${escapeHtml(storeName)}" aria-label="${escapeHtml(storeName)}">
      <img src="${encodeURI(logoUrl)}" alt="${escapeHtml(storeName)}" class="store-product-logo">
    </span>
  `;
}

function renderStoreBadges() {
  const storesGrid = document.getElementById('storesGrid');
  if (!storesGrid) return;

  const allStores = [
    { id: 'amazon', name: 'أمازون (Amazon)', image: 'assets/images/stores/amazon.svg' },
    { id: 'noon', name: 'نون (Noon)', image: 'assets/images/stores/noon.svg' },
    { id: 'temu', name: 'تيمو (Temu)', image: 'assets/images/stores/temu.svg' },
    { id: 'aliexpress', name: 'علي إكسبريس (AliExpress)', image: 'assets/images/stores/aliexpress.svg?v=20261026ae3' },
    { id: 'shein', name: 'شي إن (SHEIN)', image: 'assets/images/stores/shein.svg' },
    { id: 'trendyol', name: 'ترينديول (Trendyol)', image: 'assets/images/stores/trendyol.svg' },
    { id: 'namshi', name: 'نمشي (Namshi)', image: 'assets/images/stores/namshi.svg' },
    { id: 'fordel', name: 'فورديل (Fordeal)', image: 'assets/images/stores/fordel.svg' },
    { id: 'theluxury', name: 'ذا لاكجري كلوزيت (The Luxury Closet)', image: 'assets/images/stores/theluxury.svg' }
  ];

  // احسب عدد المنتجات لكل متجر
  const activeProducts = window.db.getProducts({ onlyActive: true });
  const storeCounts = {};
  activeProducts.forEach(p => {
    if (p.store) {
      storeCounts[p.store] = (storeCounts[p.store] || 0) + 1;
    }
  });

  const stores = allStores.filter(s => (storeCounts[s.id] || 0) > 0);

  if (stores.length === 0) {
    const section = storesGrid.closest('section');
    if (section) section.style.display = 'none';
    const navStoreLink = document.querySelector('.banner-section-menu a[href="#stores"]');
    if (navStoreLink) navStoreLink.style.display = 'none';
    return;
  }

  function formatCountText(n) {
    if (!n || n <= 0) return '0 منتج';
    if (n >= 3 && n <= 10) return `${n} منتجات`;
    return `${n} منتج`;
  }

  function createStoreBtn(s) {
    const count = storeCounts[s.id] || 0;
    const countLabel = formatCountText(count);
    return `
      <button class="store-icon-btn" onclick="filterByStore('${s.id}')" title="${s.name} — ${countLabel}" aria-label="${s.name}">
        <div class="store-badge-card store-card-${s.id}">
          <img src="${encodeURI(s.image)}" alt="${s.name}" class="store-logo-img" loading="lazy">
        </div>
        <span class="store-product-count">${countLabel}</span>
      </button>
    `;
  }

  const itemsHTML = stores.map(createStoreBtn).join('');

  if (stores.length === 1) {
    storesGrid.innerHTML = `
      <div style="text-align:center; padding: 4px 0 8px;">
        <h2 class="section-title">المتاجر العالمية بين يديك</h2>
        <p style="color: var(--text-medium); margin-top: 6px;">تسوق من متجرك المفضل</p>
      </div>
      <div style="display:flex; justify-content:center; padding: 8px 0;">
        ${createStoreBtn(stores[0])}
      </div>
    `;
    return;
  }

  storesGrid.innerHTML = `
    <div class="stores-marquee-wrapper">
      <div class="stores-marquee-row">
        <div class="stores-heading">
          <h2 class="section-title">المتاجر العالمية بين يديك</h2>
          <p>تسوق من متاجرك المفضلة</p>
        </div>
        <div class="stores-marquee-window">
          <div class="stores-marquee-track">
            <div class="stores-marquee-group">
              ${itemsHTML.repeat(3)}
            </div>
            <div class="stores-marquee-group" aria-hidden="true">
              ${itemsHTML.repeat(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.filterByStore = function (storeId) {
  const displayName = STORE_NAMES_MAP[storeId] || storeId.toUpperCase();
  const prods = window.db.getProducts({ store: storeId });
  showFilterResults(`منتجات متجر ${displayName}`, prods);
};

// ----------------------------------------------------
// 5. أيقونات فئات المتجر
// ----------------------------------------------------
const CATEGORY_ICONS = {
  cat_001: '<rect x="15" y="5" width="18" height="38" rx="4"/><path d="M21 10h6M21 37h6"/><circle cx="24" cy="23" r="6"/><path d="m21.5 23 1.7 1.7 3.5-3.8"/>',
  cat_002: '<path d="M8 28c5 0 8-5 10-13l5 4c3 3 6 5 11 6l5 2a4 4 0 0 1-1 8H13a5 5 0 0 1-5-5z"/><path d="M18 15 15 11M24 19l-2 5M31 23l-2 4"/>',
  cat_003: '<path d="m18 7 6 3 6-3 7 5-5 7-3-2 2 25H17l2-25-3 2-5-7z"/><path d="M18 23h12M21 30h6"/>',
  cat_011: '<path d="m16 8 8 4 8-4 8 6-5 8-4-2v22H17V20l-4 2-5-8z"/><path d="m21 13 3 4 3-4M24 17v17l-3-3 3-3 3 3-3 3"/>',
  cat_012: '<circle cx="24" cy="24" r="15"/><circle cx="18" cy="20" r="2"/><circle cx="30" cy="20" r="2"/><path d="M18 29c1.5-3 4-4 6-4s4.5 1 6 4M14 11l-4-4M34 11l4-4M9 25H5M39 25h4"/>',
  cat_008: '<path d="M10 17h28l-3 25H13z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/><path d="M17 25v2M31 25v2"/>',
  cat_007: '<rect x="17" y="3" width="14" height="42" rx="6"/><rect x="12" y="12" width="24" height="24" rx="8"/><circle cx="24" cy="24" r="5"/><path d="M24 21v3l2 1"/>',
  cat_009: '<path d="M24 42S7 31 7 18a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 13-17 24-17 24Z"/><circle cx="24" cy="22" r="5"/><path d="m22 22 2-2 2 2-2 2z"/>',
  cat_010: '<path d="M24 42S10 35 10 23a9 9 0 0 1 14-7 9 9 0 0 1 14 7c0 12-14 19-14 19Z"/><path d="M24 8V4M9 13l-3-3M39 13l3-3M7 25H3M45 25h-4M24 25l4-5"/>',
  cat_005: '<path d="m5 22 19-16 19 16"/><path d="M10 19v23h28V19M20 42V28h8v14"/><path d="M31 25h3"/>',
  cat_006: '<circle cx="24" cy="24" r="18"/><path d="M24 6v36M6 24h36"/><path d="m11 11 26 26M37 11 11 37"/>',
  cat_004: '<path d="M19 7h10l-1 6 5 6v20a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V19l5-6z"/><path d="M19 7h10M15 22h18"/><path d="M21 29h6"/>'
};

function renderCategoriesGrid() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  const categories = window.db.getCategories(true);
  container.onclick = event => {
    const button = event.target.closest('.category-card');
    if (!button) return;
    const category = categories.find(item => item.id === button.dataset.categoryId);
    if (category) {
      if (category.id === 'cat_010') {
        const target = document.getElementById('all-products');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.href = 'pages/categories.html';
        }
      } else {
        window.filterByCategory(category.id, category.name);
      }
    }
  };
  container.innerHTML = categories.map(category => {
    const imgSrc = `assets/images/categories/${escapeHtml(category.id)}.svg?v=2`;
    return `
      <button class="category-card" type="button" data-category-id="${escapeHtml(category.id)}" title="${escapeHtml(category.name)}" aria-label="${escapeHtml(category.name)}">
        <img src="${imgSrc}" alt="${escapeHtml(category.name)}" class="category-card-img" loading="lazy">
      </button>
    `;
  }).join('');
}

window.filterByCategory = function (catId, catName) {
  const prods = window.db.getProducts({ category: catId });
  showFilterResults(`قسم: ${catName}`, prods);
};

// ----------------------------------------------------
// 6. عرض أقسام المنتجات المتنوعة
// ----------------------------------------------------
function renderAllProductSections() {
  const allProds = window.db.getProducts({ onlyActive: true });

  // 1. عروض اليوم
  const todayDeals = allProds.filter(p => p.tag === 'today_deal');
  renderProductGrid('todayDealsGrid', todayDeals.length > 0 ? todayDeals : allProds.slice(0, 4));

  // 2. أقل من 50 ريال
  const under50 = allProds.filter(p => p.tag === 'under50' || p.currentPrice < 50);
  renderProductGrid('under50Grid', under50);

  // 3. من 50 إلى 100 ريال
  const range50_100 = allProds.filter(p => p.tag === 'range50_100' || (p.currentPrice >= 50 && p.currentPrice <= 100));
  renderProductGrid('range50to100Grid', range50_100);

  // 4. من 100 إلى 500 ريال
  const range100_500 = allProds.filter(p => p.tag === 'range100_500' || (p.currentPrice > 100 && p.currentPrice <= 500));
  renderProductGrid('range100to500Grid', range100_500);

  // 5. من 500 إلى 1000 ريال - أجهزة وإلكترونيات فاخرة حصراً
  const range500_1000 = allProds.filter(p => {
    const isElectronics = p.category === 'cat_001' || p.category === 'cat_007';
    const isFashionOrBag = p.category === 'cat_002' || (p.name && /حقيبة|شنطة|فستان|حذاء|قميص|عطر|سيروم/i.test(p.name));
    if (isFashionOrBag) return false;
    return isElectronics && (p.tag === 'range500_1000' || (p.currentPrice >= 500 && p.currentPrice <= 1000));
  });
  renderProductGrid('range500to1000Grid', range500_1000);

  // 6. من 1000 إلى أكثر
  const range1000_plus = allProds.filter(p => p.tag === 'range1000_plus' || p.currentPrice > 1000);
  renderProductGrid('range1000PlusGrid', range1000_plus);

  // 7. الأكثر طلباً
  const bestSellers = allProds.filter(p => p.tag === 'best_seller');
  renderProductGrid('bestSellersGrid', bestSellers.length > 0 ? bestSellers : allProds.filter(p => p.discount >= 60).slice(0, 4));

  // 8. وصل حديثاً
  const newArrivals = allProds.filter(p => p.tag === 'new_arrival');
  renderProductGrid('newArrivalsGrid', newArrivals.length > 0 ? newArrivals : [...allProds].reverse().slice(0, 4));
}

function renderProductGrid(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #888;">
        لا توجد منتجات متوفرة في هذا القسم حالياً
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => createProductCardHTML(p)).join('');
}

function createProductCardHTML(p) {
  const savedAmount = Math.max(0, p.originalPrice - p.currentPrice);
  const isFav = window.db.isFavorite(p.id);

  return `
    <div class="product-card" id="card-${p.id}">
      <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); handleToggleFav('${p.id}')" title="أضف للمفضلة">
        ${isFav ? '❤️' : '🤍'}
      </button>

      <div class="product-card-top">
        ${createStoreBadgeHTML(p.store)}
      </div>

      <div class="product-image-wrap" onclick="openProductDetailModal('${p.id}')">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='assets/images/logos/favicon.svg';">
      </div>

      <div class="product-info">
        <h3 class="product-name" onclick="openProductDetailModal('${p.id}')" title="${escapeHtml(p.name)}">
          ${escapeHtml(p.name)}
        </h3>

        <div class="product-pricing">
          ${savedAmount > 0 ? `<div class="price-original">${p.originalPrice} ريال</div>` : ''}
          <div class="price-current">
            ${p.currentPrice} <span class="currency">ريال</span>
          </div>
          ${savedAmount > 0 ? `<div class="price-saved">💰 وفّرت ${savedAmount} ريال</div>` : ''}
        </div>

        <a href="${p.storeLink || '#'}" target="_blank" rel="noopener noreferrer" class="product-cta" onclick="handleStoreClick('${p.store}')">
          <span>شاهد العرض</span>
          <span>←</span>
        </a>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 7. البحث والتصفية
// ----------------------------------------------------
function initSearch() {
  const headerSearch = document.getElementById('headerSearchInput');
  const bannerSearchForm = document.getElementById('bannerSearchForm');
  const heroSearch = document.getElementById('heroSearchInput');
  const heroSearchBtn = document.getElementById('heroSearchBtn');

  function doSearch(query) {
    if (!query || !query.trim()) {
      hideFilterResults();
      return;
    }
    const results = window.db.getProducts({ search: query.trim() });
    showFilterResults(`نتائج البحث عن: "${query}"`, results);
  }

  if (headerSearch) {
    headerSearch.addEventListener('input', (e) => doSearch(e.target.value));
  }

  if (bannerSearchForm && headerSearch) {
    bannerSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      doSearch(headerSearch.value);
    });
  }

  if (heroSearch) {
    heroSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSearch(heroSearch.value);
    });
  }

  if (heroSearchBtn && heroSearch) {
    heroSearchBtn.addEventListener('click', () => doSearch(heroSearch.value));
  }
}

function showFilterResults(title, products) {
  let section = document.getElementById('searchResultsSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'searchResultsSection';
    section.className = 'section';
    const mainAnchor = document.getElementById('mainContentAnchor');
    if (mainAnchor) {
      mainAnchor.parentNode.insertBefore(section, mainAnchor);
    } else {
      document.body.appendChild(section);
    }
  }

  section.style.display = 'block';
  section.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">${escapeHtml(title)} (${products.length})</h2>
      <button class="see-all-btn" onclick="hideFilterResults()">إغلاق النتائج ✕</button>
    </div>
    <div class="products-grid">
      ${products.length > 0 ? products.map(p => createProductCardHTML(p)).join('') : '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">لم يتم العثور على منتجات مطابقة</div>'}
    </div>
  `;

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.hideFilterResults = function () {
  const section = document.getElementById('searchResultsSection');
  if (section) section.style.display = 'none';
};

// ----------------------------------------------------
// 8. نظام المفضلة والتنبيهات
// ----------------------------------------------------
function initFavoritesSystem() {
  const favNavBtn = document.getElementById('favNavBtn');
  const favHeaderBtn = document.getElementById('favHeaderBtn');
  const menuToggle = document.getElementById('bannerMenuToggle');
  const sectionMenu = document.getElementById('bannerSectionMenu');

  if (favNavBtn) favNavBtn.addEventListener('click', (e) => { e.preventDefault(); openFavoritesModal(); });
  if (favHeaderBtn) favHeaderBtn.addEventListener('click', (e) => { e.preventDefault(); openFavoritesModal(); });

  if (menuToggle && sectionMenu) {
    const closeMenu = () => {
      sectionMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      sectionMenu.hidden = isOpen;
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    sectionMenu.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!sectionMenu.hidden && !e.target.closest('.site-header')) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }
}

window.handleToggleFav = function (prodId) {
  const res = window.db.toggleFavorite(prodId);
  updateFavoritesBadge();

  // تحديث حالة الأزرار على البطاقات الظاهرة
  const btns = document.querySelectorAll(`#card-${prodId} .fav-btn`);
  btns.forEach(b => {
    b.classList.toggle('active', res.added);
    b.innerHTML = res.added ? '❤️' : '🤍';
  });

  showToast(res.added ? '❤️ تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة');
};

function updateFavoritesBadge() {
  const favs = window.db.getFavorites();
  const badges = document.querySelectorAll('.fav-count-badge');
  badges.forEach(b => {
    b.textContent = favs.length;
    b.style.display = favs.length > 0 ? 'flex' : 'none';
  });
}

function openFavoritesModal() {
  const favIds = window.db.getFavorites();
  const favProducts = favIds.map(id => window.db.getProductById(id)).filter(Boolean);

  let modal = document.getElementById('favoritesModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'favoritesModal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
      <div class="admin-modal" style="max-width: 700px;">
        <div class="admin-modal-header">
          <h3>قائمة المفضلة الخاصة بك ❤️</h3>
          <button class="modal-close-btn" onclick="document.getElementById('favoritesModal').classList.remove('active')">✕</button>
        </div>
        <div class="admin-modal-body" id="favModalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const body = document.getElementById('favModalBody');
  if (favProducts.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤍</div>
        <h3>قائمة المفضلة فارغة حالياً</h3>
        <p>تصفح المنتجات واضغط على أيقونة القلب لحفظ عروضك المفضلة هنا للرجوع إليها لاحقاً.</p>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="products-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
        ${favProducts.map(p => createProductCardHTML(p)).join('')}
      </div>
    `;
  }

  modal.classList.add('active');
}

// ----------------------------------------------------
// 9. نافذة تفاصيل المنتج
// ----------------------------------------------------
window.openProductDetailModal = function (prodId) {
  const p = window.db.getProductById(prodId);
  if (!p) return;

  const cat = window.db.getCategoryById(p.category);
  const saved = Math.max(0, p.originalPrice - p.currentPrice);

  let modal = document.getElementById('productDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'productDetailModal';
    modal.className = 'admin-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="admin-modal" style="max-width: 600px;">
      <div class="admin-modal-header">
        ${createStoreBadgeHTML(p.store)}
        <button class="modal-close-btn" onclick="document.getElementById('productDetailModal').classList.remove('active')">✕</button>
      </div>
      <div class="admin-modal-body" style="padding: 24px; text-align: center;">
        <div style="height: 240px; margin-bottom: 20px; display:flex; align-items:center; justify-content:center;">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" style="max-height: 100%; max-width: 100%; object-fit: contain; border-radius: 12px;">
        </div>

        <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin-bottom: 12px; line-height: 1.4;">
          ${escapeHtml(p.name)}
        </h2>

        ${p.description ? `<p style="color: var(--text-medium); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.6;">${escapeHtml(p.description)}</p>` : ''}

        <div style="background: var(--light-bg); padding: 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-around; margin-bottom: 24px;">
          ${saved > 0 ? `
          <div>
            <div style="font-size: 0.8rem; color: #888;">السعر الأصلي</div>
            <div style="font-size: 1rem; text-decoration: line-through; color: #888;">${p.originalPrice} ريال</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--secondary); font-weight: 700;">نسبة التخفيض</div>
            <div style="font-size: 1.3rem; font-weight: 900; color: var(--secondary);">-${p.discount}%</div>
          </div>` : ''}
          <div>
            <div style="font-size: 0.8rem; color: var(--accent-dark); font-weight: 700;">السعر الحالي</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: var(--accent-dark);">${p.currentPrice} ريال</div>
          </div>
        </div>

        ${saved > 0 ? `<div style="color: #00c853; font-weight: 700; margin-bottom: 20px;">🎉 توفير حقيقي: ${saved} ريال سعودي</div>` : ''}

        <div style="display:flex; gap:12px;">
          <button class="btn-secondary" style="flex:1;" onclick="handleToggleFav('${p.id}')">
            ❤️ إضافة للمفضلة
          </button>
          <a href="${p.storeLink || '#'}" target="_blank" rel="noopener noreferrer" class="product-cta" style="flex:2; padding: 14px; font-size: 1rem;">
            <span>شراء العرض من ${p.store.toUpperCase()}</span>
            <span>←</span>
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
};

function handleStoreClick(store) {
  // تتبع النقرات الترويجية
  console.log(`Outbound click to: ${store}`);
}

// رسائل Toast
function showToast(msg) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// زر الصلاحيات في الفوتر (التنقل برمجياً بدون إظهار أي رابط في شريط المتصفح السفلي)
function initAdminTrigger() {
  const adminBtn = document.getElementById('adminDiscreteBtn');
  if (!adminBtn) return;

  adminBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'admin/index.html';
  });

  adminBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = 'admin/index.html';
    }
  });
}
