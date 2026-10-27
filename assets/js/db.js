/**
 * WAFARTHA SAH - Database & State Management Layer (db.js)
 * يدير التخزين المحلي (localStorage + IndexedDB للصور)
 * ويوفر دوال CRUD كاملة للمنتجات، الأقسام، المستخدمين، والإعدادات.
 */

const DB_KEY = 'saydhasah_clean_v8';
const DB_VERSION = 8;

class StoreDB {
  constructor() {
    this.data = null;
    this.isReady = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      // تنظيف الكاش القديم المتضارب
      ['wafartha_sah_db_v1', 'saydhasah_db_v1', 'saydhasah_db_v2', 'saydhasah_db_v3', 'saydhasah_db_v4', 'saydhasah_db_v5', 'saydhasah_clean_v7'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // جلب البيانات دائماً من ملف data/db.json المرفوع على السيرفر
      const basePath = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pages/') ? '../' : './';
      try {
        const res = await fetch(basePath + 'data/db.json?t=' + Date.now());
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData && Array.isArray(remoteData.products) && remoteData.products.length > 0) {
            this.data = remoteData;
            this.migrateUsers();
            this.migrateCategories();
            this.save();
            this.isReady = true;
            return this.data;
          }
        }
      } catch (fetchErr) {
        console.warn('Could not fetch latest db.json, using local or default', fetchErr);
      }

      const localData = localStorage.getItem(DB_KEY);
      if (localData) {
        try { this.data = JSON.parse(localData); } catch (err) { this.data = null; }
      }

      if (!this.data) {
        this.data = this.getDefaultSchema();
        this.save();
      }

      this.migrateUsers();
      this.migrateCategories();
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
      {
            "id": "cat_001",
            "name": "الإلكترونيات",
            "image": "assets/images/categories/cat_001.svg?v=2",
            "icon": "💻",
            "color": "#1e3c72",
            "order": 1,
            "isActive": true
      },
      {
            "id": "cat_012",
            "name": "نساء",
            "image": "assets/images/categories/cat_012.svg?v=2",
            "icon": "👗",
            "color": "#e91e63",
            "order": 2,
            "isActive": true
      },
      {
            "id": "cat_018",
            "name": "فساتين",
            "image": "assets/images/categories/cat_018.svg?v=1",
            "icon": "💃",
            "color": "#f43f5e",
            "order": 3,
            "isActive": true
      },
      {
            "id": "cat_019",
            "name": "ملابس النوم",
            "image": "assets/images/categories/cat_019.svg?v=1",
            "icon": "🌙",
            "color": "#8b5cf6",
            "order": 4,
            "isActive": true
      },
      {
            "id": "cat_020",
            "name": "ملابس داخلية",
            "image": "assets/images/categories/cat_020.svg?v=1",
            "icon": "🩲",
            "color": "#ec4899",
            "order": 5,
            "isActive": true
      },
      {
            "id": "cat_021",
            "name": "أحذية",
            "image": "assets/images/categories/cat_021.svg?v=1",
            "icon": "👠",
            "color": "#0ea5e9",
            "order": 6,
            "isActive": true
      },
      {
            "id": "cat_022",
            "name": "حقائب وأمتعة",
            "image": "assets/images/categories/cat_022.svg?v=1",
            "icon": "👜",
            "color": "#d97706",
            "order": 7,
            "isActive": true
      },
      {
            "id": "cat_023",
            "name": "العطور",
            "image": "assets/images/categories/cat_023.svg?v=1",
            "icon": "🌸",
            "color": "#a855f7",
            "order": 8,
            "isActive": true
      },
      {
            "id": "cat_011",
            "name": "ملابس رجالي",
            "image": "assets/images/categories/cat_011.svg?v=2",
            "icon": "👔",
            "color": "#1e3c72",
            "order": 9,
            "isActive": true
      },
      {
            "id": "cat_013",
            "name": "ملابس أولاد",
            "image": "assets/images/categories/cat_013.svg?v=2",
            "icon": "👦",
            "color": "#0284c7",
            "order": 10,
            "isActive": true
      },
      {
            "id": "cat_014",
            "name": "ملابس بنات",
            "image": "assets/images/categories/cat_014.svg?v=2",
            "icon": "👧",
            "color": "#f43f5e",
            "order": 11,
            "isActive": true
      },
      {
            "id": "cat_015",
            "name": "ملابس مواليد",
            "image": "assets/images/categories/cat_015.svg?v=2",
            "icon": "👶",
            "color": "#06b6d4",
            "order": 12,
            "isActive": true
      },
      {
            "id": "cat_003",
            "name": "المنزل والمطبخ",
            "image": "assets/images/categories/cat_003.svg?v=2",
            "icon": "🏠",
            "color": "#10b981",
            "order": 13,
            "isActive": true
      },
      {
            "id": "cat_004",
            "name": "الجمال والعناية",
            "image": "assets/images/categories/cat_004.svg?v=2",
            "icon": "💄",
            "color": "#ec4899",
            "order": 14,
            "isActive": true
      },
      {
            "id": "cat_005",
            "name": "الرياضة واللياقة",
            "image": "assets/images/categories/cat_005.svg?v=2",
            "icon": "⚽",
            "color": "#0284c7",
            "order": 15,
            "isActive": true
      },
      {
            "id": "cat_006",
            "name": "الأطفال والرضع",
            "image": "assets/images/categories/cat_006.svg?v=2",
            "icon": "🧸",
            "color": "#06b6d4",
            "order": 16,
            "isActive": true
      },
      {
            "id": "cat_007",
            "name": "الساعات والمجوهرات",
            "image": "assets/images/categories/cat_007.svg?v=2",
            "icon": "⌚",
            "color": "#795548",
            "order": 17,
            "isActive": true
      },
      {
            "id": "cat_008",
            "name": "الصحة والعناية الشخصية",
            "image": "assets/images/categories/cat_008.svg?v=2",
            "icon": "🧴",
            "color": "#14b8a6",
            "order": 18,
            "isActive": true
      },
      {
            "id": "cat_009",
            "name": "السفر والرحلات",
            "image": "assets/images/categories/cat_009.svg?v=2",
            "icon": "🧳",
            "color": "#f59e0b",
            "order": 19,
            "isActive": true
      },
      {
            "id": "cat_016",
            "name": "عدد وأدوات",
            "image": "assets/images/categories/cat_016.svg?v=2",
            "icon": "🛠️",
            "color": "#f59e0b",
            "order": 20,
            "isActive": true
      },
      {
            "id": "cat_017",
            "name": "إكسسوارات سيارات",
            "image": "assets/images/categories/cat_017.svg?v=2",
            "icon": "🚗",
            "color": "#6366f1",
            "order": 21,
            "isActive": true
      },
      {
            "id": "cat_010",
            "name": "المزيد",
            "image": "assets/images/categories/cat_010.svg?v=2",
            "icon": "🎮",
            "color": "#8b5cf6",
            "order": 22,
            "isActive": true
      }
];

    // مزامنة الفئات لضمان اعتماد التصنيفات العشرة وصورها
    const needsSync = !this.data.categories.length || this.data.categories.length !== 22 || this.data.categories[0].name !== 'الإلكترونيات';
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
                "id": "prod_001",
                "name": "سماعات رأس لاسلكية فوق الأذن بإلغاء ضوضاء نشط وصوت استريو عالي الدقة",
                "description": "صوت نقي ومحيطي، وسائد أذن مريحة للاستخدام الطويل، بطارية تدوم حتى 40 ساعة تشغيل متواصل.",
                "originalPrice": 180,
                "currentPrice": 89,
                "discount": 51,
                "category": "cat_001",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=wireless+headphones&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
                "tag": "today_deal",
                "isActive": true,
                "createdAt": "2026-10-25T11:00:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_002",
                "name": "سماعات أذن أنكر ساوند كور لايف P2 لاسلكية بلوتوث 5.2 مقاومة للماء",
                "description": "ميكروفونات مدمجة بخاصية تقليل الضوضاء للمكالمات الواضحة وصوت جهوري فائق.",
                "originalPrice": 199,
                "currentPrice": 99,
                "discount": 50,
                "category": "cat_001",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=anker+soundcore+earbuds&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
                "tag": "today_deal",
                "isActive": true,
                "createdAt": "2026-10-25T11:01:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_003",
                "name": "تابلت لوحي ذكي 10.9 بوصة شاشة ريتينا مع قلم لمسي ولوحة مفاتيح",
                "description": "معالج ثماني النواة فائق السرعة، ذاكرة 128GB، بطارية تدوم طويلاً، مثالي للعمل والدراسة والترفيه.",
                "originalPrice": 1200,
                "currentPrice": 650,
                "discount": 46,
                "category": "cat_001",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=tablet&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80",
                "tag": "range500_1000",
                "isActive": true,
                "createdAt": "2026-10-25T11:02:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_004",
                "name": "هاتف ذكي بكاميرا رباعية 108MP وبطارية ضخمة 6000mAh وشحن سريع 67W",
                "description": "شاشة أموليد فائقة السرعة 120Hz ومعالج ألعاب قوي لتجربة ترفيهية استثنائية.",
                "originalPrice": 2100,
                "currentPrice": 780,
                "discount": 63,
                "category": "cat_001",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=smartphone&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
                "tag": "range500_1000",
                "isActive": true,
                "createdAt": "2026-10-25T11:03:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_005",
                "name": "شاشة ذكية 65 بوصة 4K Ultra HD مع نظام تشغيل أندرويد ودولبي أتموس",
                "description": "شاشة سينمائية عملاقة بتقنية HDR10 ومعدل تحديث 120Hz وصوت محيطي نقي وتطبيقات مدمجة.",
                "originalPrice": 3200,
                "currentPrice": 1450,
                "discount": 55,
                "category": "cat_001",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=smart+tv+4k&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80",
                "tag": "range1000_plus",
                "isActive": true,
                "createdAt": "2026-10-25T11:04:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_006",
                "name": "لابتوب ألترا بوك فائق النحافة مع معالج حديث وذاكرة 16GB وقرص SSD 512GB",
                "description": "شاشة IPS مذهلة، خفيف الوزن للعمل والجامعة، بطارية تدوم طوال اليوم وأداء عالي السرعة.",
                "originalPrice": 3800,
                "currentPrice": 1850,
                "discount": 51,
                "category": "cat_001",
                "store": "noon",
                "storeLink": "https://www.noon.com/saudi-ar/search/?q=laptop&coupon=saydha",
                "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80",
                "tag": "range1000_plus",
                "isActive": true,
                "createdAt": "2026-10-25T11:05:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_007",
                "name": "حذاء سكتشرز جو ووك رياضي أصلي مريح للمشي اليومي والجري",
                "description": "نعل مرن وممتص للصدمات يوفر دعماً فائقاً للقدم أثناء المشي والوقوف الطويل.",
                "originalPrice": 240,
                "currentPrice": 119,
                "discount": 50,
                "category": "cat_002",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=skechers+shoes&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
                "tag": "range100_500",
                "isActive": true,
                "createdAt": "2026-10-25T11:06:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_008",
                "name": "فستان صيفي أنيق بنقشة عصرية وقماش بارد خفيف",
                "description": "تصميم واسع وعملي يناسب جميع المناسبات اليومية مع خامة صيفية ناعمة ومريحة.",
                "originalPrice": 110,
                "currentPrice": 45,
                "discount": 59,
                "category": "cat_002",
                "store": "shein",
                "storeLink": "https://temu.to/k/ee56j55qh35",
                "image": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:07:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_009",
                "name": "حقيبة يد جلدية فاخرة متعددة الجيوب بتصميم تركي أنيق",
                "description": "جلد ناعم مقاوم للخدوش مع حزام كتف إضافي قابل للتعديل ومساحة واسعة.",
                "originalPrice": 380,
                "currentPrice": 185,
                "discount": 51,
                "category": "cat_002",
                "store": "noon",
                "storeLink": "https://www.noon.com/saudi-ar/search/?q=women+handbag&coupon=saydha",
                "image": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
                "tag": "range100_500",
                "isActive": true,
                "createdAt": "2026-10-25T11:08:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_010",
                "name": "نظارة شمسية بولارايزد عصرية بإطار كلاسيكي خفيف الوزن",
                "description": "حماية UV400 كاملة من أشعة الشمس مع عدسات استقطاب عالية الوضوح وضد الوهج.",
                "originalPrice": 120,
                "currentPrice": 49,
                "discount": 59,
                "category": "cat_002",
                "store": "temu",
                "storeLink": "https://temu.to/k/ee56j55qh35",
                "image": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:09:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_011",
                "name": "ماكينة تحضير قهوة إسبريسو وكابتشينو احترافية بقوة 20 بار مع مبخرة حليب",
                "description": "مضخة إيطالية احترافية 20 بار، خزان ماء سعة 1.5 لتر، ذراع تبخير ستانلس ستيل لتحضير الكابتشينو واللاتيه برغوة كريمية.",
                "originalPrice": 890,
                "currentPrice": 299,
                "discount": 66,
                "category": "cat_003",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=%D9%85%D8%A7%D9%83%D9%8A%D9%86%D8%A9+%D9%82%D9%87%D9%88%D8%A9+%D8%A7%D8%B3%D8%A8%D8%B1%D9%8A%D8%B3%D9%88&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1608354580875-30bd4168b351?w=500&q=80",
                "tag": "best_seller",
                "isActive": true,
                "createdAt": "2026-10-25T11:10:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_012",
                "name": "مقلاة هوائية رقمية سعة 4.5 لتر بدون زيت بشاشة لمس ذكية",
                "description": "طهي صحي وسريع بقوة 1500 واط مع برامج مسبقة متعددة وسلة مانعة للالتصاق سهلة التنظيف.",
                "originalPrice": 299,
                "currentPrice": 129,
                "discount": 57,
                "category": "cat_003",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=air+fryer&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1585515320310-259814833e62?w=500&q=80",
                "tag": "range100_500",
                "isActive": true,
                "createdAt": "2026-10-25T11:11:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_013",
                "name": "غلاية مياه كهربائية ستانلس ستيل سعة 1.7 لتر من فيليبس",
                "description": "تسخين فائق السرعة مع مؤشر مستوى الماء وقاعدة لاسلكية تدور 360 درجة ونظام أمان.",
                "originalPrice": 110,
                "currentPrice": 49,
                "discount": 55,
                "category": "cat_003",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=electric+kettle&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:12:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_014",
                "name": "مكيف هواء صحراوي متنقل مدمج ومرطب للجو اقتصادي الطاقة",
                "description": "تبريد سريع وهادئ مع 3 سرعات وخزان ماء ثلجي واستهلاك اقتصادي للكهرباء عبر USB.",
                "originalPrice": 160,
                "currentPrice": 79,
                "discount": 51,
                "category": "cat_003",
                "store": "temu",
                "storeLink": "https://temu.to/k/ee56j55qh35",
                "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:13:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_015",
                "name": "عطر شرقي فاخر للجنسين 100 مل بتركيبة العود والمسك الأبيض",
                "description": "ثبات يدوم طويلاً وفوحان عالي بمزيج نوتات فرنسية شرقية ساحرة تناسب جميع الأوقات.",
                "originalPrice": 180,
                "currentPrice": 69,
                "discount": 62,
                "category": "cat_004",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=perfume&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:14:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_016",
                "name": "سيروم حمض الهيالورونيك وفيتامين سي لنضارة وترطيب البشرة",
                "description": "تركيبة متطورة لمحاربة الخطوط الدقيقة وتوحيد لون البشرة وإعطائها إشراقة شبابية.",
                "originalPrice": 85,
                "currentPrice": 39,
                "discount": 54,
                "category": "cat_004",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=vitamin+c+serum&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:15:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_017",
                "name": "طقم أحزمة تمارين المقاومة الرياضية 11 قطعة مع مقابض ومثبت باب",
                "description": "مثالي للتمارين المنزلية وبناء العضلات وتأهيل المفاصل بمستويات مقاومة مختلفة حتى 150 رطل.",
                "originalPrice": 80,
                "currentPrice": 35,
                "discount": 56,
                "category": "cat_005",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=resistance+bands+set&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:16:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_018",
                "name": "بساط يوجا احترافي مانع للانزلاق بسماكة مريحة للمفاصل 6 مم",
                "description": "خامة TPE صديقة للبيئة مع خطوط توجيه المحاذاة وحزام حمل عملي للتمارين.",
                "originalPrice": 95,
                "currentPrice": 42,
                "discount": 56,
                "category": "cat_005",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=non+slip+yoga+mat&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:17:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_019",
                "name": "كرسي طعام للأطفال متعدد المستويات قابل للطي وسهل التنظيف",
                "description": "حزام أمان خماسي النقاط وصينية طعام مزدوجة قابلة للإزالة مع أرجل مانعة للانزلاق.",
                "originalPrice": 160,
                "currentPrice": 79,
                "discount": 51,
                "category": "cat_006",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=baby+high+chair&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:18:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_020",
                "name": "شاشة مراقبة الأطفال اللاسلكية الذكية برؤية ليلية وصوت ثنائي",
                "description": "مستشعر حرارة الغرفة، تشغيل التهويدات عن بعد، وتنبيهات صوتية فورية لراحة الوالدين.",
                "originalPrice": 210,
                "currentPrice": 99,
                "discount": 53,
                "category": "cat_006",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=baby+video+monitor+camera&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:19:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_021",
                "name": "ساعة ذكية بشاشة AMOLED ومستشعر نبضات القلب والأكسجين ومقاومة للماء",
                "description": "تدعم المكالمات عبر البلوتوث وتتبع النوم وأكثر من 100 وضع رياضي وبطارية تدوم 10 أيام.",
                "originalPrice": 250,
                "currentPrice": 120,
                "discount": 52,
                "category": "cat_007",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=smart+watch&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
                "tag": "range100_500",
                "isActive": true,
                "createdAt": "2026-10-25T11:20:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_022",
                "name": "ساعة كاسيو الأصلية الرقمية الكلاسيكية المقاومة للماء A158WA",
                "description": "إضاءة LED دقيقة وسوار ستانلس ستيل فضي أنيق ومنبه ومؤقت مدمج.",
                "originalPrice": 120,
                "currentPrice": 59,
                "discount": 51,
                "category": "cat_007",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=casio+watch+silver&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:21:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_023",
                "name": "طقم مجوهرات نسائي زركون لامع مطلي بالذهب عيار 18",
                "description": "عقد ناعم مع أقراط متناسقة بتصميم كلاسيكي ساحر مناسب للإهداء والمناسبات.",
                "originalPrice": 110,
                "currentPrice": 45,
                "discount": 59,
                "category": "cat_007",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=women+jewelry+set&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:22:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_024",
                "name": "مسدس تدليك العضلات الاحترافي المحمول بـ 6 سرعات و4 رؤوس تدليك",
                "description": "تخفيف آلام وتصلب العضلات بعد التمارين ببطارية ليثيوم قابلة لإعادة الشحن عبر Type-C.",
                "originalPrice": 140,
                "currentPrice": 65,
                "discount": 54,
                "category": "cat_008",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=massage+gun&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:23:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_025",
                "name": "فرشاة أسنان كهربائية صوتية ذكية مع 4 رؤوس بديلة ومؤقت ذكي",
                "description": "تنظيف عميق يصل إلى 40,000 ذبذبة بالدقيقة ومقاومة كاملة للماء IPX7.",
                "originalPrice": 115,
                "currentPrice": 55,
                "discount": 52,
                "category": "cat_008",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=electric+toothbrush&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1559591937-e62fb330bc1f?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:24:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_026",
                "name": "حقيبة ظهر ذكية متعددة الوظائف مقاومة للماء مع منفذ شحن USB",
                "description": "جيب مبطن مخصص للابتوب حتى 15.6 بوصة وسحابات ضد السرقة ومساحات تخزين واسعة.",
                "originalPrice": 120,
                "currentPrice": 52,
                "discount": 57,
                "category": "cat_009",
                "store": "noon",
                "storeLink": "https://www.noon.com/saudi-ar/luggage-and-travel-gear/backpacks/?coupon=saydha&project=PRJ639948",
                "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
                "tag": "range50_100",
                "isActive": true,
                "createdAt": "2026-10-25T11:25:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_027",
                "name": "ميزان أمتعة وحقائب رقمي محمول عالي الدقة بشاشة LCD",
                "description": "يتحمل حتى 50 كجم لتجنب رسوم الوزن الزائد في المطارات بتصميم خفيف ومدمج.",
                "originalPrice": 50,
                "currentPrice": 22,
                "discount": 56,
                "category": "cat_009",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=luggage+scale&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:26:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_028",
                "name": "مصباح مكتب ذكي LED قابل للتعديل بحماية للعين ومستويات إضاءة متعددة",
                "description": "شحن عبر USB وثلاثة درجات ألوان مختلفة مناسبة للمذاكرة والقراءة والعمل المكتبي.",
                "originalPrice": 85,
                "currentPrice": 38,
                "discount": 55,
                "category": "cat_010",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=desk+lamp+led&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:27:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_029",
                "name": "إضاءة شريطية ذكية LED بطول 5 أمتار RGB مع ريموت تحكم متعدد الألوان",
                "description": "إضاءة خلفية للغرف والشاشات مع إمكانية التثبيت السهل ومزامنة الألوان.",
                "originalPrice": 65,
                "currentPrice": 29,
                "discount": 55,
                "category": "cat_010",
                "store": "amazon",
                "storeLink": "https://www.amazon.sa/s?k=led+strip+lights&tag=amazon0137a1-21",
                "image": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:28:00.000Z",
                "currency": "SAR"
        },
        {
                "id": "prod_030",
                "name": "حامل هاتف ذكي مغناطيسي للسيارة دوران 360 درجة بقوة تثبيت فائقة",
                "description": "تثبيت محكم على فتحة المكيف بمغناطيس قوي يتحمل المطبات وحرارة الجو.",
                "originalPrice": 30,
                "currentPrice": 11.5,
                "discount": 62,
                "category": "cat_010",
                "store": "temu",
                "storeLink": "https://temu.to/k/ee56j55qh35",
                "image": "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=500&q=80",
                "tag": "under50",
                "isActive": true,
                "createdAt": "2026-10-25T11:29:00.000Z",
                "currency": "SAR"
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
