/**
 * WAFARTHA SAH - Database & State Management Layer (db.js)
 * يدير التخزين المحلي (localStorage + IndexedDB للصور)
 * ويوفر دوال CRUD كاملة للمنتجات، الأقسام، المستخدمين، والإعدادات.
 */

const DB_KEY = 'wafartha_sah_db_v1';
const DB_VERSION = 1;

class StoreDB {
  constructor() {
    this.data = null;
    this.isReady = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      // 1. فحص التخزين المحلي أولاً للسرعة
      const localData = localStorage.getItem(DB_KEY);
      if (localData) {
        try { this.data = JSON.parse(localData); } catch (err) { this.data = null; }
      }

      // 2. جلب أحدث البيانات دائماً من ملف db.json المرفوع على السيرفر
      try {
        const basePath = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pages/') ? '../' : './';
        const res = await fetch(${basePath}data/db.json?t=);
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData && remoteData.products) {
            if (!this.data || !this.data.products) {
              this.data = remoteData;
            } else {
              // دمج أي منتجات جديدة مرفوعة تلقائياً مع الكاش المحلي
              const existingIds = new Set(this.data.products.map(p => p.id));
              const newItems = remoteData.products.filter(p => !existingIds.has(p.id));
              if (newItems.length > 0) {
                this.data.products = [...newItems, ...this.data.products];
              }
              if (remoteData.categories) this.data.categories = remoteData.categories;
              if (remoteData.stores) this.data.stores = remoteData.stores;
            }
            this.migrateUsers();
            this.migrateCategories();
            this.migrateProducts();
            this.save();
          }
        }
      } catch (fetchErr) {
        console.warn('Could not fetch latest db.json, using local', fetchErr);
        if (!this.data) {
          this.data = this.getDefaultSchema();
          this.save();
        }
      }

      this.isReady = true;
      return this.data;
    } catch (e) {
      console.error('Database initialization error:', e);
      this.data = this.getDefaultSchema();
      this.isReady = true;
      return this.data;
    }
  }

  migrateUsers() {
    if (!this.data) return;
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }

    // فحص ما إذا كان المستخدم mohmd موجوداً، إن لم يكن موجوداً يتم إضافته أو تحديث الحساب الرئيسي
    const hasMohmd = this.data.users.some(u => (u.username || '').toLowerCase() === 'mohmd');
    if (!hasMohmd) {
      const oldAdminIdx = this.data.users.findIndex(u => u.email === 'admin@wafartha.com' || u.id === 'usr_001');
      if (oldAdminIdx !== -1) {
        this.data.users[oldAdminIdx].name = "محمد (المدير الرئيسي)";
        this.data.users[oldAdminIdx].username = "mohmd";
        this.data.users[oldAdminIdx].password = "ٍخةش_1993@";
        this.data.users[oldAdminIdx].role = "super_admin";
        this.data.users[oldAdminIdx].isActive = true;
      } else {
        this.data.users.unshift({
          id: "usr_001",
          name: "محمد (المدير الرئيسي)",
          username: "mohmd",
          password: "ٍخةش_1993@",
          role: "super_admin",
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
      this.save();
    }

    // التأكد من أن جميع المستخدمين لديهم حقل username
    let modified = false;
    this.data.users.forEach(u => {
      if (!u.username) {
        u.username = u.email ? u.email.split('@')[0] : ('user_' + u.id);
        modified = true;
      }
    });
    if (modified) this.save();
  }

  migrateCategories() {
    if (!this.data) return;
    if (!Array.isArray(this.data.categories)) {
      this.data.categories = [];
    }

    const officialCats = [
      { id: "cat_001", name: "الإلكترونيات", image: "assets/images/categories/cat_001.svg?v=2", icon: "💻", color: "#1e3c72", order: 1, isActive: true },
      { id: "cat_002", name: "الأزياء والموضة", image: "assets/images/categories/cat_002.svg?v=2", icon: "👗", color: "#e91e63", order: 2, isActive: true },
      { id: "cat_003", name: "المنزل والمطبخ", image: "assets/images/categories/cat_003.svg?v=2", icon: "🏠", color: "#10b981", order: 3, isActive: true },
      { id: "cat_004", name: "الجمال والعناية", image: "assets/images/categories/cat_004.svg?v=2", icon: "💄", color: "#ec4899", order: 4, isActive: true },
      { id: "cat_005", name: "الرياضة واللياقة", image: "assets/images/categories/cat_005.svg?v=2", icon: "⚽", color: "#0284c7", order: 5, isActive: true },
      { id: "cat_006", name: "الأطفال والرضع", image: "assets/images/categories/cat_006.svg?v=2", icon: "🧸", color: "#06b6d4", order: 6, isActive: true },
      { id: "cat_007", name: "الساعات والمجوهرات", image: "assets/images/categories/cat_007.svg?v=2", icon: "⌚", color: "#795548", order: 7, isActive: true },
      { id: "cat_008", name: "الصحة والعناية الشخصية", image: "assets/images/categories/cat_008.svg?v=2", icon: "🧴", color: "#14b8a6", order: 8, isActive: true },
      { id: "cat_009", name: "السفر والرحلات", image: "assets/images/categories/cat_009.svg?v=2", icon: "🧳", color: "#f59e0b", order: 9, isActive: true },
      { id: "cat_010", name: "المزيد", image: "assets/images/categories/cat_010.svg?v=2", icon: "🎮", color: "#8b5cf6", order: 10, isActive: true }
    ];

    // مزامنة الفئات لضمان اعتماد التصنيفات العشرة وصورها
    const needsSync = !this.data.categories.length || this.data.categories.length !== 10 || this.data.categories[0].name !== 'الإلكترونيات';
    if (needsSync) {
      this.data.categories = officialCats;
      this.save();
    } else {
      // التأكد من وجود روابط الصور
      let updated = false;
      this.data.categories.forEach(c => {
        const off = officialCats.find(o => o.id === c.id);
        if (off) {
          if (c.image !== off.image || c.name !== off.name) {
            c.image = off.image;
            c.name = off.name;
            updated = true;
          }
        }
      });
      if (updated) this.save();
    }
  }

  migrateProducts() {
    if (!this.data || !Array.isArray(this.data.products)) return;
    const has1000Plus = this.data.products.some(p => p.tag === 'range1000_plus' || p.currentPrice >= 1000);
    if (!has1000Plus) {
      this.data.products.push({
        id: "prod_009",
        name: "شاشة ذكية 65 بوصة 4K Ultra HD مع نظام أندرويد",
        description: "شاشة عملاقة سينمائية بتقنية HDR10 ومعدل تحديث 120Hz وصوت محيطي Dolby Atmos",
        originalPrice: 3200,
        currentPrice: 1450,
        discount: 55,
        category: "cat_001",
        store: "amazon",
        storeLink: "https://amazon.com",
        image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80",
        tag: "range1000_plus",
        isActive: true,
        createdAt: new Date().toISOString()
      });
      this.save();
    }

    const hasBestSeller = this.data.products.some(p => p.tag === 'best_seller');
    if (!hasBestSeller) {
      this.data.products.push({
        id: "prod_011",
        name: "ماكينة قهوة إسبريسو وكابتشينو احترافية بقوة 20 بار",
        description: "تحضير فوري للقهوة برغوة حليب كريمية غنية ومضخة إيطالية متطورة",
        originalPrice: 890,
        currentPrice: 299,
        discount: 66,
        category: "cat_005",
        store: "amazon",
        storeLink: "https://amazon.com",
        image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&q=80",
        tag: "best_seller",
        isActive: true,
        createdAt: new Date().toISOString()
      });
      this.save();
    }

    const hasNewArrival = this.data.products.some(p => p.tag === 'new_arrival');
    if (!hasNewArrival) {
      this.data.products.push({
        id: "prod_012",
        name: "نظارة شمسية بولارايزد عصرية بإطار كلاسيكي",
        description: "حماية UV400 كاملة من أشعة الشمس مع عدسات استقطاب عالية الوضوح",
        originalPrice: 350,
        currentPrice: 89,
        discount: 75,
        category: "cat_009",
        store: "temu",
        storeLink: "https://temu.com",
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
        tag: "new_arrival",
        isActive: true,
        createdAt: new Date().toISOString()
      });
      this.save();
    }

    const defaultImages = {
      prod_001: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
      prod_002: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
      prod_003: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
      prod_004: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80",
      prod_005: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
      prod_006: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
      prod_007: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
      prod_008: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=500&q=80"
    };
    let fixedProdImages = false;
    this.data.products.forEach(p => {
      if (p.image && p.image.startsWith('assets/images/products/') && defaultImages[p.id]) {
        p.image = defaultImages[p.id];
        fixedProdImages = true;
      }
    });
    if (fixedProdImages) this.save();
  }

  getDefaultSchema() {
    return {
      settings: {
        siteName: "صيدها صح",
        siteTagline: "قبل لا تروح عليك!",
        announcementText: "🔥 صيدها صح • عروض حصرية على Amazon • تخفيضات ضخمة على Noon • أسعار لا تُصدق على Temu وAliExpress 💰",
        heroTitle: "صيدها صح",
        heroSubtitle: "كل اللي تدور عليه.. في مكان واحد !",
        dealEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        currency: "ريال",
        socialLinks: {
          whatsapp: "https://wa.me/",
          telegram: "https://t.me/",
          instagram: "https://instagram.com/",
          twitter: "https://twitter.com/",
          facebook: "https://facebook.com/"
        }
      },
      categories: [
        { id: "cat_001", name: "الإلكترونيات", image: "assets/images/categories/cat_001.svg?v=2", icon: "💻", color: "#1e3c72", order: 1, isActive: true },
        { id: "cat_002", name: "الأزياء والموضة", image: "assets/images/categories/cat_002.svg?v=2", icon: "👗", color: "#e91e63", order: 2, isActive: true },
        { id: "cat_003", name: "المنزل والمطبخ", image: "assets/images/categories/cat_003.svg?v=2", icon: "🏠", color: "#10b981", order: 3, isActive: true },
        { id: "cat_004", name: "الجمال والعناية", image: "assets/images/categories/cat_004.svg?v=2", icon: "💄", color: "#ec4899", order: 4, isActive: true },
        { id: "cat_005", name: "الرياضة واللياقة", image: "assets/images/categories/cat_005.svg?v=2", icon: "⚽", color: "#0284c7", order: 5, isActive: true },
        { id: "cat_006", name: "الأطفال والرضع", image: "assets/images/categories/cat_006.svg?v=2", icon: "🧸", color: "#06b6d4", order: 6, isActive: true },
        { id: "cat_007", name: "الساعات والمجوهرات", image: "assets/images/categories/cat_007.svg?v=2", icon: "⌚", color: "#795548", order: 7, isActive: true },
        { id: "cat_008", name: "الصحة والعناية الشخصية", image: "assets/images/categories/cat_008.svg?v=2", icon: "🧴", color: "#14b8a6", order: 8, isActive: true },
        { id: "cat_009", name: "السفر والرحلات", image: "assets/images/categories/cat_009.svg?v=2", icon: "🧳", color: "#f59e0b", order: 9, isActive: true },
        { id: "cat_010", name: "المزيد", image: "assets/images/categories/cat_010.svg?v=2", icon: "🎮", color: "#8b5cf6", order: 10, isActive: true }
      ],
      products: [
        {
          id: "prod_001",
          name: "سماعة رأس بلوتوث احترافية مع عزل ضوضاء فعال",
          description: "صوت استريو نقي، بطارية تدوم 40 ساعة، ميكروفون مدمج عالي الوضوح.",
          originalPrice: 450,
          currentPrice: 72,
          discount: 84,
          category: "cat_001",
          store: "temu",
          storeLink: "https://temu.com",
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
          tag: "today_deal",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_002",
          name: "ساعة ذكية بشاشة AMOLED ومستشعر نبضات وضغط",
          description: "مقاومة للماء، تتبع الأنشطة الرياضية، تدعم المكالمات عبر البلوتوث.",
          originalPrice: 800,
          currentPrice: 120,
          discount: 85,
          category: "cat_007",
          store: "aliexpress",
          storeLink: "https://aliexpress.com",
          image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
          tag: "today_deal",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_003",
          name: "حذاء رياضي مبطن مريح للجري والمشي الطويل",
          description: "تصميم انسيابي مع تهوية ممتازة ونعل مطاطي مانع للانزلاق.",
          originalPrice: 350,
          currentPrice: 48,
          discount: 86,
          category: "cat_002",
          store: "noon",
          storeLink: "https://noon.com",
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
          tag: "under50",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_004",
          name: "عطر فرنسي كلاسيكي فاخر للرجال والنساء 100 مل",
          description: "مزيج ساحر من العود والزهور الشرقية بثبات فائق يدوم طويلاً.",
          originalPrice: 600,
          currentPrice: 85,
          discount: 86,
          category: "cat_004",
          store: "amazon",
          storeLink: "https://amazon.com",
          image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80",
          tag: "range50_100",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_005",
          name: "فستان أنيق بنقشة عصرية وقماش خفيف مريح",
          description: "قصة مميزة ملائمة للمناسبات والخروجات اليومية، قماش عالي الجودة.",
          originalPrice: 380,
          currentPrice: 42,
          discount: 89,
          category: "cat_003",
          store: "shein",
          storeLink: "https://shein.com",
          image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
          tag: "under50",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_006",
          name: "حقيبة يد جلدية فاخرة متعددة الجيوب بتصميم تركي",
          description: "جلد ناعم مقاوم للخدوش مع حزام كتف إضافي قابل للتعديل.",
          originalPrice: 1200,
          currentPrice: 650,
          discount: 46,
          category: "cat_008",
          store: "trendyol",
          storeLink: "https://trendyol.com",
          image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
          tag: "range500_1000",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_007",
          name: "هاتف ذكي بكاميرا رباعية 108MP وبطارية ضخمة 6000mAh",
          description: "شاشة فائقة السرعة 120Hz ومعالج ألعاب قوي وسريع الشحن 67W.",
          originalPrice: 2100,
          currentPrice: 780,
          discount: 63,
          category: "cat_001",
          store: "amazon",
          storeLink: "https://amazon.com",
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
          tag: "range500_1000",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_008",
          name: "مكيف هواء صحراوي متنقل مدمج ومرطب للجو",
          description: "تبريد سريع وهادئ مع 3 سرعات وخزان ماء ثلجي واستهلاك اقتصادي.",
          originalPrice: 420,
          currentPrice: 79,
          discount: 81,
          category: "cat_005",
          store: "temu",
          storeLink: "https://temu.com",
          image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80",
          tag: "range50_100",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_009",
          name: "شاشة ذكية 65 بوصة 4K Ultra HD مع نظام أندرويد",
          description: "شاشة عملاقة سينمائية بتقنية HDR10 ومعدل تحديث 120Hz وصوت محيطي Dolby Atmos",
          originalPrice: 3200,
          currentPrice: 1450,
          discount: 55,
          category: "cat_001",
          store: "amazon",
          storeLink: "https://amazon.com",
          image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80",
          tag: "range1000_plus",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_010",
          name: "لابتوب ألترا بوك فائق النحافة مع معالج حديث",
          description: "شاشة IPS مذهلة، ذاكرة 16GB، وقرص SSD 512GB فائق السرعة",
          originalPrice: 3800,
          currentPrice: 1850,
          discount: 51,
          category: "cat_001",
          store: "noon",
          storeLink: "https://noon.com",
          image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80",
          tag: "range1000_plus",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_011",
          name: "ماكينة قهوة إسبريسو وكابتشينو احترافية بقوة 20 بار",
          description: "تحضير فوري للقهوة برغوة حليب كريمية غنية ومضخة إيطالية متطورة",
          originalPrice: 890,
          currentPrice: 299,
          discount: 66,
          category: "cat_005",
          store: "amazon",
          storeLink: "https://amazon.com",
          image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&q=80",
          tag: "best_seller",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_012",
          name: "نظارة شمسية بولارايزد عصرية بإطار كلاسيكي",
          description: "حماية UV400 كاملة من أشعة الشمس مع عدسات استقطاب عالية الوضوح",
          originalPrice: 350,
          currentPrice: 89,
          discount: 75,
          category: "cat_009",
          store: "temu",
          storeLink: "https://temu.com",
          image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
          tag: "new_arrival",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      users: [
        {
          id: "usr_001",
          name: "محمد (المدير الرئيسي)",
          username: "mohmd",
          password: "ٍخةش_1993@",
          role: "super_admin",
          isActive: true,
          createdAt: "2024-01-01"
        },
        {
          id: "usr_002",
          name: "مشرف المنتجات",
          username: "editor",
          password: "editor123",
          role: "moderator",
          isActive: true,
          createdAt: "2024-01-10"
        }
      ]
    };
  }

  save() {
    if (!this.data) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Storage quota exceeded or error saving DB:', e);
    }
  }

  // ================== PRODUCTS CRUD ==================
  getProducts(filters = {}) {
    let prods = [...(this.data?.products || [])];
    if (filters.onlyActive !== false) {
      prods = prods.filter(p => p.isActive);
    }
    if (filters.category) {
      prods = prods.filter(p => p.category === filters.category);
    }
    if (filters.store) {
      prods = prods.filter(p => p.store.toLowerCase() === filters.store.toLowerCase());
    }
    if (filters.tag) {
      prods = prods.filter(p => p.tag === filters.tag);
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (filters.minPrice !== undefined) {
      prods = prods.filter(p => p.currentPrice >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      prods = prods.filter(p => p.currentPrice <= filters.maxPrice);
    }
    return prods;
  }

  getProductById(id) {
    return this.data?.products.find(p => p.id === id) || null;
  }

  addProduct(product) {
    const newProduct = {
      id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      name: product.name,
      description: product.description || '',
      originalPrice: Number(product.originalPrice) || 0,
      currentPrice: Number(product.currentPrice) || 0,
      discount: Math.round(((Number(product.originalPrice) - Number(product.currentPrice)) / (Number(product.originalPrice) || 1)) * 100),
      category: product.category,
      store: product.store || 'amazon',
      storeLink: product.storeLink || '#',
      image: product.image || 'https://via.placeholder.com/300x300?text=منتج',
      tag: product.tag || 'general',
      isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
      createdAt: new Date().toISOString()
    };
    this.data.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(id, updates) {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const originalPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : this.data.products[index].originalPrice;
    const currentPrice = updates.currentPrice !== undefined ? Number(updates.currentPrice) : this.data.products[index].currentPrice;
    const discount = Math.round(((originalPrice - currentPrice) / (originalPrice || 1)) * 100);

    this.data.products[index] = {
      ...this.data.products[index],
      ...updates,
      originalPrice,
      currentPrice,
      discount: discount > 0 ? discount : 0,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.products[index];
  }

  deleteProduct(id) {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    const deleted = this.data.products.length < before;
    if (deleted) this.save();
    return deleted;
  }

  // ================== CATEGORIES CRUD ==================
  getCategories(onlyActive = true) {
    let cats = [...(this.data?.categories || [])];
    if (onlyActive) cats = cats.filter(c => c.isActive);
    return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getCategoryById(id) {
    return this.data?.categories.find(c => c.id === id) || null;
  }

  addCategory(category) {
    const newCat = {
      id: 'cat_' + Date.now().toString(36),
      name: category.name,
      icon: category.icon || '🛍️',
      color: category.color || '#1e3c72',
      order: (this.data.categories.length + 1),
      isActive: category.isActive !== undefined ? Boolean(category.isActive) : true
    };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  updateCategory(id, updates) {
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.data.categories[index] = { ...this.data.categories[index], ...updates };
    this.save();
    return this.data.categories[index];
  }

  deleteCategory(id) {
    const before = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    const deleted = this.data.categories.length < before;
    if (deleted) this.save();
    return deleted;
  }

  // ================== USERS & ADMINS CRUD ==================
  getUsers() {
    return this.data?.users || [];
  }

  getUserById(id) {
    return this.data?.users.find(u => u.id === id) || null;
  }

  addUser(user) {
    const cleanUsername = (user.username || '').toLowerCase().trim();
    if (!cleanUsername) throw new Error('اسم المستخدم مطلوب');

    const exists = this.data.users.some(u => (u.username || '').toLowerCase().trim() === cleanUsername);
    if (exists) throw new Error(`اسم المستخدم "${user.username}" مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر`);

    const newUser = {
      id: 'usr_' + Date.now().toString(36),
      name: (user.name || '').trim(),
      username: cleanUsername,
      password: user.password,
      role: user.role || 'moderator', // 'super_admin' or 'moderator'
      isActive: user.isActive !== undefined ? Boolean(user.isActive) : true,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id, updates) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    if (updates.username) {
      const cleanUsername = updates.username.toLowerCase().trim();
      const userExists = this.data.users.some(u => u.id !== id && (u.username || '').toLowerCase().trim() === cleanUsername);
      if (userExists) throw new Error(`اسم المستخدم "${updates.username}" مسجل لمشرف آخر`);
      updates.username = cleanUsername;
    }

    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  deleteUser(id) {
    const before = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    const deleted = this.data.users.length < before;
    if (deleted) this.save();
    return deleted;
  }

  // ================== SETTINGS ==================
  getSettings() {
    return this.data?.settings || {};
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  // ================== BACKUP & RESTORE ==================
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.products || !parsed.categories || !parsed.users) {
        throw new Error('الملف غير مطابق لهيكل قاعدة البيانات الصحيحة');
      }
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      throw new Error('خطأ في قراءة ملف JSON: ' + e.message);
    }
  }

  resetToDefault() {
    this.data = this.getDefaultSchema();
    this.save();
    return this.data;
  }

  // ================== FAVORITES (Browser-based) ==================
  getFavorites() {
    try {
      return JSON.parse(localStorage.getItem('wafartha_favs') || '[]');
    } catch {
      return [];
    }
  }

  toggleFavorite(productId) {
    let favs = this.getFavorites();
    const idx = favs.indexOf(productId);
    let added = false;
    if (idx === -1) {
      favs.push(productId);
      added = true;
    } else {
      favs.splice(idx, 1);
      added = false;
    }
    localStorage.setItem('wafartha_favs', JSON.stringify(favs));
    return { added, count: favs.length, favs };
  }

  isFavorite(productId) {
    return this.getFavorites().includes(productId);
  }
}

// Global Singleton
window.db = new StoreDB();
