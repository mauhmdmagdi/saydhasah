/**
 * WAFARTHA SAH - ADMIN PANEL CONTROLLER (admin.js)
 * يدير كامل وظائف لوحة التحكم: الإحصائيات، المنتجات، الأقسام، المشرفين، الإعدادات، واستيراد/تصدير البيانات.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // التأكد من تسجيل الدخول
  if (window.auth) {
    window.auth.requireAuth();
  }

  // انتظر تهيئة قاعدة البيانات
  if (window.db) {
    await window.db.initPromise;
  }

  // بدء تشغيل اللوحة
  initAdminDashboard();
});

function initAdminDashboard() {
  renderUserProfile();
  initNavigation();
  loadOverviewStats();
  renderProductsTable();
  renderCategoriesTable();
  renderUsersTable();
  loadSettingsForm();
  initModalsAndForms();
}

// عرض بيانات المستخدم في الشريط العلوي
function renderUserProfile() {
  const user = window.auth?.getUser();
  if (!user) return;
  const nameEl = document.getElementById('adminUserName');
  const roleEl = document.getElementById('adminUserRole');
  const avatarEl = document.getElementById('adminUserAvatar');

  if (nameEl) nameEl.textContent = `${user.name} (@${user.username || 'admin'})`;
  if (roleEl) roleEl.textContent = user.role === 'super_admin' ? 'مدير رئيسي (Super Admin)' : 'مشرف محتوى (Moderator)';
  if (avatarEl) avatarEl.textContent = (user.name || 'م').charAt(0);

  // إخفاء تبويب المستخدمين للمشرف العادي
  if (user.role !== 'super_admin') {
    const usersTabBtn = document.querySelector('[data-tab="tab-users"]');
    if (usersTabBtn) usersTabBtn.style.display = 'none';
  }

  // زر تغيير كلمة المرور
  const btnChangeMyPass = document.getElementById('btnChangeMyPass');
  if (btnChangeMyPass) {
    btnChangeMyPass.addEventListener('click', () => {
      openChangePasswordModal();
    });
  }

  // زر تسجيل الخروج
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.auth.logout();
    });
  }
}

// إدارة التبويبات والتنقل
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link-item[data-tab]');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const topbarTitle = document.getElementById('topbarPageTitle');

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const targetId = link.getAttribute('data-tab');
      navLinks.forEach(item => item.classList.toggle('active', item === link));
      tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));

      const label = link.querySelector('span:last-child');
      if (topbarTitle && label) topbarTitle.textContent = label.textContent;
      if (targetId === 'tab-overview') loadOverviewStats();
      if (targetId === 'tab-products') renderProductsTable();
      if (targetId === 'tab-categories') renderCategoriesTable();
      if (targetId === 'tab-users') renderUsersTable();
      if (targetId === 'tab-settings') loadSettingsForm();
    });
  });

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const targetLink = document.querySelector(`.nav-link-item[data-tab="tab-${hash}"]`);
    if (targetLink) targetLink.click();
  }
}

// ----------------------------------------------------
// 1. الإحصائيات العامة (Overview)
// ----------------------------------------------------
function loadOverviewStats() {
  const products = window.db.getProducts({ onlyActive: false });
  const categories = window.db.getCategories(false);
  const users = window.db.getUsers();
  const deals = products.filter(p => p.tag === 'today_deal');

  const statProds = document.getElementById('statTotalProducts');
  const statCats = document.getElementById('statTotalCategories');
  const statUsers = document.getElementById('statTotalUsers');
  const statDeals = document.getElementById('statTotalDeals');

  if (statProds) statProds.textContent = products.length;
  if (statCats) statCats.textContent = categories.length;
  if (statUsers) statUsers.textContent = users.length;
  if (statDeals) statDeals.textContent = deals.length;

  // آخر 5 منتجات مضافة
  const recentProdsTbody = document.getElementById('recentProductsTableBody');
  if (recentProdsTbody) {
    const recent = [...products].slice(0, 5);
    if (recent.length === 0) {
      recentProdsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">لا توجد منتجات حالياً</td></tr>`;
    } else {
      recentProdsTbody.innerHTML = recent.map(p => `
        <tr>
          <td><img src="${p.image}" class="prod-thumb" alt="${p.name}" onerror="this.src='https://via.placeholder.com/50?text=منتج'"></td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${p.currentPrice} ريال <del style="color:#888; font-size:0.8rem;">${p.originalPrice} ريال</del></td>
          <td><span class="badge badge-store">${p.store.toUpperCase()}</span></td>
          <td><span class="badge ${p.isActive ? 'badge-active' : 'badge-inactive'}">${p.isActive ? 'نشط' : 'معطل'}</span></td>
        </tr>
      `).join('');
    }
  }
}

// ----------------------------------------------------
// 2. إدارة المنتجات (Products CRUD)
// ----------------------------------------------------
let currentProductsFilter = { search: '', category: '', store: '' };

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  const categoryFilterSelect = document.getElementById('productCategoryFilter');
  if (categoryFilterSelect && categoryFilterSelect.children.length <= 1) {
    const cats = window.db.getCategories(false);
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.name}`;
      categoryFilterSelect.appendChild(opt);
    });
  }

  let products = window.db.getProducts({ onlyActive: false });

  // تطبيق الفلترة
  if (currentProductsFilter.search) {
    const q = currentProductsFilter.search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  if (currentProductsFilter.category) {
    products = products.filter(p => p.category === currentProductsFilter.category);
  }
  if (currentProductsFilter.store) {
    products = products.filter(p => p.store === currentProductsFilter.store);
  }

  const countBadge = document.getElementById('productsCountBadge');
  if (countBadge) countBadge.textContent = `${products.length} منتج`;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 40px; color: #64748b;">
          <div style="font-size: 40px; margin-bottom: 10px;">📦</div>
          لا توجد منتجات مطابقة للبحث أو الفلتر
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const cat = window.db.getCategoryById(p.category);
    const catName = cat ? `${cat.icon} ${cat.name}` : 'غير محدد';
    const tagLabels = {
      'today_deal': '🔥 عرض اليوم',
      'under50': '⚡ أقل من 50',
      'range50_100': '💎 50-100 ريال',
      'range100_500': '⭐ 100-500 ريال',
      'range500_1000': '👑 500-1000 ريال',
      'range1000_plus': '🏆 1000+ ريال',
      'best_seller': '🔥 الأكثر طلباً',
      'new_arrival': '✨ وصل حديثاً',
      'general': 'عام'
    };

    return `
      <tr>
        <td>
          <img src="${p.image}" class="prod-thumb" alt="${escapeHtml(p.name)}" onerror="this.src='https://via.placeholder.com/50?text=منتج'">
        </td>
        <td>
          <strong style="color: var(--admin-primary); display:block; max-width: 250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.name)}</strong>
          <small style="color: #64748b;">${escapeHtml(p.description || '').substring(0, 40)}...</small>
        </td>
        <td>
          <span style="font-weight: 800; color: #e65100;">${p.currentPrice} ريال</span><br>
          <del style="color: #94a3b8; font-size: 0.8rem;">${p.originalPrice} ريال</del>
          <span style="font-size: 0.75rem; color: #e91e63; font-weight:700;">(-${p.discount}%)</span>
        </td>
        <td><span class="badge badge-category">${catName}</span></td>
        <td><span class="badge badge-store">${p.store.toUpperCase()}</span></td>
        <td><span class="badge badge-tag">${tagLabels[p.tag] || p.tag}</span></td>
        <td>
          <button class="btn-sm btn-toggle" onclick="toggleProductStatus('${p.id}')">
            <span class="badge ${p.isActive ? 'badge-active' : 'badge-inactive'}">${p.isActive ? 'نشط' : 'معطل'}</span>
          </button>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-sm btn-edit" onclick="openEditProductModal('${p.id}')">✏️ تعديل</button>
            <button class="btn-sm btn-delete" onclick="deleteProductPrompt('${p.id}')">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// تبديل حالة تفعيل المنتج
window.toggleProductStatus = function(id) {
  const p = window.db.getProductById(id);
  if (p) {
    window.db.updateProduct(id, { isActive: !p.isActive });
    renderProductsTable();
    showAdminToast(p.isActive ? 'تم تعطيل ظهور المنتج' : 'تم تفعيل ظهور المنتج');
  }
};

// حذف منتج
window.deleteProductPrompt = function(id) {
  const p = window.db.getProductById(id);
  if (!p) return;
  if (confirm(`هل أنت متأكد من حذف المنتج: "${p.name}"؟`)) {
    window.db.deleteProduct(id);
    renderProductsTable();
    loadOverviewStats();
    showAdminToast('تم حذف المنتج بنجاح', 'success');
  }
};

// ----------------------------------------------------
// 3. إدارة الأقسام (Categories CRUD)
// ----------------------------------------------------
function renderCategoriesTable() {
  const tbody = document.getElementById('categoriesTableBody');
  if (!tbody) return;

  const categories = window.db.getCategories(false);
  const countBadge = document.getElementById('categoriesCountBadge');
  if (countBadge) countBadge.textContent = `${categories.length} أقسام`;

  if (categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px;">لا توجد أقسام حالياً</td></tr>`;
    return;
  }

  tbody.innerHTML = categories.map((c, idx) => {
    const prodsCount = window.db.getProducts({ onlyActive: false, category: c.id }).length;
    return `
      <tr>
        <td style="font-size: 1.5rem; text-align: center;">${c.icon}</td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>
          <span style="display:inline-block; width:16px; height:16px; border-radius:50%; background:${c.color || '#1e3c72'}; vertical-align:middle; margin-left:6px;"></span>
          <code>${c.color || '#1e3c72'}</code>
        </td>
        <td><span class="badge badge-category">${prodsCount} منتج</span></td>
        <td>
          <button class="btn-sm btn-toggle" onclick="toggleCategoryStatus('${c.id}')">
            <span class="badge ${c.isActive ? 'badge-active' : 'badge-inactive'}">${c.isActive ? 'نشط' : 'معطل'}</span>
          </button>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-sm btn-edit" onclick="openEditCategoryModal('${c.id}')">✏️ تعديل</button>
            <button class="btn-sm btn-delete" onclick="deleteCategoryPrompt('${c.id}')">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleCategoryStatus = function(id) {
  const c = window.db.getCategoryById(id);
  if (c) {
    window.db.updateCategory(id, { isActive: !c.isActive });
    renderCategoriesTable();
    showAdminToast('تم تحديث حالة القسم');
  }
};

window.deleteCategoryPrompt = function(id) {
  const c = window.db.getCategoryById(id);
  if (!c) return;
  const prods = window.db.getProducts({ onlyActive: false, category: id });
  if (prods.length > 0) {
    if (!confirm(`هذا القسم يحتوي على ${prods.length} منتج. هل أنت متأكد من حذفه؟`)) return;
  } else {
    if (!confirm(`هل أنت متأكد من حذف قسم "${c.name}"؟`)) return;
  }
  window.db.deleteCategory(id);
  renderCategoriesTable();
  loadOverviewStats();
  showAdminToast('تم حذف القسم بنجاح', 'success');
};

// ----------------------------------------------------
// 4. إدارة المستخدمين والمشرفين (Users CRUD)
// ----------------------------------------------------
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const users = window.db.getUsers();
  const currentAdmin = window.auth.getUser();

  tbody.innerHTML = users.map(u => {
    const isMe = currentAdmin && currentAdmin.userId === u.id;
    const roleBadge = u.role === 'super_admin' ? 
      '<span class="badge" style="background:#e0e7ff; color:#1e3c72; font-weight:700;">👑 مدير رئيسي (Super Admin)</span>' : 
      '<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">🛡️ مشرف محتوى (Moderator)</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap: 10px;">
            <div class="user-avatar" style="width:36px; height:36px; font-size:0.9rem;">${(u.name || 'م').charAt(0)}</div>
            <div>
              <strong>${escapeHtml(u.name)} ${isMe ? '<small style="color:#059669; font-weight:bold;">(أنت)</small>' : ''}</strong>
              <div style="font-size:0.75rem; color:#64748b;">تاريخ الإضافة: ${u.createdAt ? u.createdAt.substring(0, 10) : '-'}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size: 0.95rem; font-weight:700; color:#1e3c72; background:#f1f5f9; padding: 3px 8px; border-radius: 4px;">@${escapeHtml(u.username || u.name)}</code></td>
        <td>${roleBadge}</td>
        <td>
          <button class="btn-sm btn-toggle" onclick="toggleUserStatus('${u.id}')" ${isMe ? 'disabled style="opacity:0.6;"' : ''}>
            <span class="badge ${u.isActive ? 'badge-active' : 'badge-inactive'}">${u.isActive ? 'نشط' : 'معطل'}</span>
          </button>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-sm btn-edit" onclick="openEditUserModal('${u.id}')">✏️ تعديل</button>
            ${!isMe ? `<button class="btn-sm btn-delete" onclick="deleteUserPrompt('${u.id}')">🗑️ حذف</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleUserStatus = function(id) {
  const u = window.db.getUserById(id);
  if (!u) return;
  const currentAdmin = window.auth.getUser();
  if (currentAdmin.userId === id) {
    alert('لا يمكنك تعطيل حسابك الحالي');
    return;
  }
  window.db.updateUser(id, { isActive: !u.isActive });
  renderUsersTable();
  showAdminToast('تم تحديث حالة المستخدم');
};

window.deleteUserPrompt = function(id) {
  const u = window.db.getUserById(id);
  if (!u) return;
  if (confirm(`هل أنت متأكد من حذف الحساب: "${u.name}" (@${u.username})؟`)) {
    try {
      window.db.deleteUser(id);
      renderUsersTable();
      loadOverviewStats();
      showAdminToast('تم حذف الحساب بنجاح', 'success');
    } catch (e) {
      alert(e.message);
    }
  }
};

// ----------------------------------------------------
// 5. إعدادات الموقع والنسخ الاحتياطي
// ----------------------------------------------------
function loadSettingsForm() {
  const settings = window.db.getSettings();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('setSiteName', settings.siteName);
  setVal('setSiteTagline', settings.siteTagline);
  setVal('setAnnouncementText', settings.announcementText);
  setVal('setHeroTitle', settings.heroTitle);
  setVal('setHeroSubtitle', settings.heroSubtitle);
  setVal('setDealEndDate', settings.dealEndDate ? settings.dealEndDate.substring(0, 16) : '');
  setVal('setSocialWhatsapp', settings.socialLinks?.whatsapp);
  setVal('setSocialTelegram', settings.socialLinks?.telegram);
  setVal('setSocialInstagram', settings.socialLinks?.instagram);
  setVal('setSocialTwitter', settings.socialLinks?.twitter);
  setVal('setSocialFacebook', settings.socialLinks?.facebook);

  const form = document.getElementById('siteSettingsForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const updated = {
        siteName: document.getElementById('setSiteName').value.trim(),
        siteTagline: document.getElementById('setSiteTagline').value.trim(),
        announcementText: document.getElementById('setAnnouncementText').value.trim(),
        heroTitle: document.getElementById('setHeroTitle').value.trim(),
        heroSubtitle: document.getElementById('setHeroSubtitle').value.trim(),
        dealEndDate: document.getElementById('setDealEndDate').value ? new Date(document.getElementById('setDealEndDate').value).toISOString() : new Date().toISOString(),
        socialLinks: {
          whatsapp: document.getElementById('setSocialWhatsapp').value.trim(),
          telegram: document.getElementById('setSocialTelegram').value.trim(),
          instagram: document.getElementById('setSocialInstagram').value.trim(),
          twitter: document.getElementById('setSocialTwitter').value.trim(),
          facebook: document.getElementById('setSocialFacebook').value.trim()
        }
      };

      window.db.updateSettings(updated);
      showAdminToast('تم حفظ إعدادات الموقع بنجاح', 'success');
    };
  }
}

// ----------------------------------------------------
// 6. النوافذ المنبثقة (Modals) والنماذج
// ----------------------------------------------------
function initModalsAndForms() {
  // فلاتر جدول المنتجات
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentProductsFilter.search = e.target.value;
      renderProductsTable();
    });
  }

  const catFilter = document.getElementById('productCategoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      currentProductsFilter.category = e.target.value;
      renderProductsTable();
    });
  }

  const storeFilter = document.getElementById('productStoreFilter');
  if (storeFilter) {
    storeFilter.addEventListener('change', (e) => {
      currentProductsFilter.store = e.target.value;
      renderProductsTable();
    });
  }

  // --- نافذة المنتج ---
  const productModal = document.getElementById('productModal');
  const btnOpenAddProduct = document.getElementById('btnOpenAddProduct');
  const productForm = document.getElementById('productForm');

  if (btnOpenAddProduct) {
    btnOpenAddProduct.addEventListener('click', () => {
      openProductModal();
    });
  }

  // حساب نسبة الخصم تلقائياً عند كتابة الأسعار
  const origPriceInput = document.getElementById('prodOriginalPrice');
  const currPriceInput = document.getElementById('prodCurrentPrice');
  const discountPreview = document.getElementById('prodDiscountPreview');

  function updateDiscountPreview() {
    const orig = Number(origPriceInput.value) || 0;
    const curr = Number(currPriceInput.value) || 0;
    if (orig > 0 && curr >= 0 && orig > curr) {
      const disc = Math.round(((orig - curr) / orig) * 100);
      discountPreview.textContent = `نسبة الخصم: ${disc}% (وفّرت ${orig - curr} ريال)`;
      discountPreview.style.color = '#e91e63';
    } else {
      discountPreview.textContent = 'أدخل السعر الأصلي والسعر المخفض لحساب التوفير';
      discountPreview.style.color = '#64748b';
    }
  }

  if (origPriceInput && currPriceInput) {
    origPriceInput.addEventListener('input', updateDiscountPreview);
    currPriceInput.addEventListener('input', updateDiscountPreview);
  }

  // رفع الصورة محلياً وتحويلها إلى Base64
  const imageFileInput = document.getElementById('prodImageFile');
  const imageUrlInput = document.getElementById('prodImageUrl');
  const imagePreview = document.getElementById('prodImagePreview');

  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('حجم الصورة كبير، يفضل اختيار صورة أقل من 2 ميجابايت لتسريع التحميل');
        }
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          imageUrlInput.value = loadEvt.target.result;
          imagePreview.src = loadEvt.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', () => {
      if (imageUrlInput.value) {
        imagePreview.src = imageUrlInput.value;
        imagePreview.style.display = 'block';
      }
    });
  }

  if (productForm) {
    productForm.onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('prodEditId').value;
      const productData = {
        name: document.getElementById('prodName').value.trim(),
        description: document.getElementById('prodDesc').value.trim(),
        originalPrice: Number(document.getElementById('prodOriginalPrice').value) || 0,
        currentPrice: Number(document.getElementById('prodCurrentPrice').value) || 0,
        category: document.getElementById('prodCategory').value,
        store: document.getElementById('prodStore').value,
        storeLink: document.getElementById('prodStoreLink').value.trim(),
        image: document.getElementById('prodImageUrl').value.trim() || 'https://via.placeholder.com/400?text=منتج',
        tag: document.getElementById('prodTag').value,
        isActive: document.getElementById('prodIsActive').checked
      };

      if (!productData.name) {
        alert('الرجاء إدخال اسم المنتج');
        return;
      }

      if (editId) {
        window.db.updateProduct(editId, productData);
        showAdminToast('تم تحديث المنتج بنجاح', 'success');
      } else {
        window.db.addProduct(productData);
        showAdminToast('تمت إضافة المنتج بنجاح', 'success');
      }

      closeModal(productModal);
      renderProductsTable();
      loadOverviewStats();
    };
  }

  // --- نافذة الأقسام ---
  const categoryModal = document.getElementById('categoryModal');
  const btnOpenAddCategory = document.getElementById('btnOpenAddCategory');
  const categoryForm = document.getElementById('categoryForm');

  if (btnOpenAddCategory) {
    btnOpenAddCategory.addEventListener('click', () => {
      openCategoryModal();
    });
  }

  if (categoryForm) {
    categoryForm.onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('catEditId').value;
      const catData = {
        name: document.getElementById('catName').value.trim(),
        icon: document.getElementById('catIcon').value.trim() || '🛍️',
        color: document.getElementById('catColor').value,
        isActive: document.getElementById('catIsActive').checked
      };

      if (!catData.name) {
        alert('الرجاء إدخال اسم القسم');
        return;
      }

      if (editId) {
        window.db.updateCategory(editId, catData);
        showAdminToast('تم تحديث القسم بنجاح', 'success');
      } else {
        window.db.addCategory(catData);
        showAdminToast('تمت إضافة القسم بنجاح', 'success');
      }

      closeModal(categoryModal);
      renderCategoriesTable();
      loadOverviewStats();
    };
  }

  // --- نافذة المستخدمين ---
  const userModal = document.getElementById('userModal');
  const btnOpenAddUser = document.getElementById('btnOpenAddUser');
  const userForm = document.getElementById('userForm');

  if (btnOpenAddUser) {
    btnOpenAddUser.addEventListener('click', () => {
      openUserModal();
    });
  }

  if (userForm) {
    userForm.onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('userEditId').value;
      const userData = {
        name: document.getElementById('userName').value.trim(),
        username: document.getElementById('userUsername').value.trim(),
        role: document.getElementById('userRole').value,
        isActive: document.getElementById('userIsActive').checked
      };

      const pass = document.getElementById('userPassword').value;
      if (pass) {
        userData.password = pass;
      }

      try {
        if (editId) {
          window.db.updateUser(editId, userData);
          showAdminToast('تم تحديث بيانات الحساب بنجاح', 'success');
        } else {
          if (!pass) {
            alert('الرجاء إدخال كلمة المرور للحساب الجديد');
            return;
          }
          userData.password = pass;
          window.db.addUser(userData);
          showAdminToast('تم إنشاء الحساب بنجاح', 'success');
        }

        closeModal(userModal);
        renderUsersTable();
        loadOverviewStats();
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // --- نموذج تغيير كلمة مرور الحساب الحالي ---
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.onsubmit = (e) => {
      e.preventDefault();
      const currentAdmin = window.auth.getUser();
      if (!currentAdmin) return;

      const newPass = document.getElementById('newPasswordInput').value;
      const confirmPass = document.getElementById('confirmPasswordInput').value;
      const errBox = document.getElementById('changePassError');
      errBox.style.display = 'none';

      if (newPass.length < 4) {
        errBox.textContent = 'كلمة المرور يجب أن لا تقل عن 4 خانات';
        errBox.style.display = 'block';
        return;
      }

      if (newPass !== confirmPass) {
        errBox.textContent = 'كلمتا المرور غير متطابقتين، يرجى إعادة التأكد';
        errBox.style.display = 'block';
        return;
      }

      try {
        window.db.updateUser(currentAdmin.userId, { password: newPass });
        closeModal(document.getElementById('changePasswordModal'));
        showAdminToast('تم تغيير كلمة مرور حسابك بنجاح!', 'success');
      } catch (err) {
        errBox.textContent = err.message || 'حدث خطأ أثناء حفظ كلمة المرور';
        errBox.style.display = 'block';
      }
    };
  }

  // --- أزرار النسخ الاحتياطي والتصدير ---
  const btnExportDB = document.getElementById('btnExportDB');
  if (btnExportDB) {
    btnExportDB.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(window.db.exportJSON());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `db_backup_${new Date().toISOString().substring(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showAdminToast('تم تصدير ملف قاعدة البيانات بنجاح', 'success');
    });
  }

  const importFileInput = document.getElementById('importDBFile');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        try {
          window.db.importJSON(loadEvt.target.result);
          showAdminToast('تمت استعادة قاعدة البيانات بنجاح!', 'success');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          alert('خطأ أثناء الاستيراد: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  const btnResetDB = document.getElementById('btnResetDB');
  if (btnResetDB) {
    btnResetDB.addEventListener('click', () => {
      if (confirm('تحذير: سيتم حذف التعديلات واستعادة البيانات الافتراضية الأولية. هل أنت متأكد؟')) {
        window.db.resetToDefault();
        showAdminToast('تمت استعادة البيانات الافتراضية');
        setTimeout(() => location.reload(), 1000);
      }
    });
  }
}

// فتح نافذة المنتج للإضافة
function openProductModal() {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  form.reset();
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodImagePreview').style.display = 'none';
  document.getElementById('prodDiscountPreview').textContent = '';
  title.textContent = 'إضافة منتج جديد';

  populateProductCategorySelect();
  openModal(modal);
}

// فتح نافذة المنتج للتعديل
window.openEditProductModal = function(id) {
  const p = window.db.getProductById(id);
  if (!p) return;

  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');

  populateProductCategorySelect();

  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodOriginalPrice').value = p.originalPrice;
  document.getElementById('prodCurrentPrice').value = p.currentPrice;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodStore').value = p.store;
  document.getElementById('prodStoreLink').value = p.storeLink;
  document.getElementById('prodImageUrl').value = p.image;
  document.getElementById('prodTag').value = p.tag || 'general';
  document.getElementById('prodIsActive').checked = p.isActive;

  const preview = document.getElementById('prodImagePreview');
  preview.src = p.image;
  preview.style.display = 'block';

  const orig = Number(p.originalPrice) || 0;
  const curr = Number(p.currentPrice) || 0;
  document.getElementById('prodDiscountPreview').textContent = `نسبة الخصم: ${p.discount}% (وفرت ${orig - curr} ريال)`;

  title.textContent = 'تعديل بيانات المنتج';
  openModal(modal);
};

function populateProductCategorySelect() {
  const select = document.getElementById('prodCategory');
  if (!select) return;
  select.innerHTML = '';
  const cats = window.db.getCategories(false);
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    select.appendChild(opt);
  });
}

// نافذة الأقسام
function openCategoryModal() {
  const modal = document.getElementById('categoryModal');
  const title = document.getElementById('categoryModalTitle');
  const form = document.getElementById('categoryForm');

  form.reset();
  document.getElementById('catEditId').value = '';
  document.getElementById('catColor').value = '#1e3c72';
  title.textContent = 'إضافة قسم جديد';
  openModal(modal);
}

window.openEditCategoryModal = function(id) {
  const c = window.db.getCategoryById(id);
  if (!c) return;

  const modal = document.getElementById('categoryModal');
  const title = document.getElementById('categoryModalTitle');

  document.getElementById('catEditId').value = c.id;
  document.getElementById('catName').value = c.name;
  document.getElementById('catIcon').value = c.icon;
  document.getElementById('catColor').value = c.color || '#1e3c72';
  document.getElementById('catIsActive').checked = c.isActive;

  title.textContent = 'تعديل القسم';
  openModal(modal);
};

// نافذة المستخدمين
function openUserModal() {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');

  form.reset();
  document.getElementById('userEditId').value = '';
  document.getElementById('userPassHelp').textContent = 'كلمة مرور مطلوبة عند إضافة حساب جديد';
  title.textContent = 'إضافة حساب مدير أو مشرف جديد';
  openModal(modal);
}

window.openEditUserModal = function(id) {
  const u = window.db.getUserById(id);
  if (!u) return;

  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');

  document.getElementById('userEditId').value = u.id;
  document.getElementById('userName').value = u.name;
  document.getElementById('userUsername').value = u.username || '';
  document.getElementById('userRole').value = u.role;
  document.getElementById('userPassword').value = '';
  document.getElementById('userIsActive').checked = u.isActive;
  document.getElementById('userPassHelp').textContent = 'اتركه فارغاً إذا كنت لا ترغب بتغيير كلمة المرور';

  title.textContent = `تعديل بيانات الحساب (@${u.username || ''})`;
  openModal(modal);
};

// نافذة تغيير كلمة مرور الحساب الحالي
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  const user = window.auth?.getUser();
  if (!user || !modal) return;

  document.getElementById('changePasswordForm').reset();
  const currentUsernameEl = document.getElementById('myCurrentUsername');
  if (currentUsernameEl) {
    currentUsernameEl.textContent = `@${user.username || 'mohmd'}`;
  }
  const errBox = document.getElementById('changePassError');
  if (errBox) errBox.style.display = 'none';

  openModal(modal);
}

// فتح وإغلاق المودال
function openModal(modal) {
  if (modal) modal.classList.add('active');
}

window.closeModal = function(modal) {
  if (modal) modal.classList.remove('active');
};

// Toast الإشعارات للوحة التحكم
function showAdminToast(message, type = 'info') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `admin-toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
