/**
 * WAFARTHA SAH - Authentication & Session Manager (auth.js)
 * يدير تسجيل دخول المشرفين، الجلسة، والتحقق من الصلاحيات.
 */

const AUTH_STORAGE_KEY = 'wafartha_admin_session';

class AuthManager {
  constructor() {
    this.session = this.loadSession();
  }

  loadSession() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  verifyPassword(userPassword, inputPassword) {
    if (userPassword === inputPassword) return true;
    // دعم الترجمة التلقائية للوحة المفاتيح العربية والإنجليزية لكلمة مرور المدير الافتراضية
    const aliases = {
      'ٍخةش_1993@': ['soma_1993@', 'Soma_1993@', 'SOMA_1993@', 'ٍخةش_1993@'],
      'soma_1993@': ['ٍخةش_1993@', 'soma_1993@', 'Soma_1993@', 'SOMA_1993@']
    };
    if (aliases[userPassword] && aliases[userPassword].includes(inputPassword)) {
      return true;
    }
    return false;
  }

  async login(identifier, password) {
    if (!window.db) throw new Error('قاعدة البيانات غير جاهزة');
    await window.db.initPromise;

    const users = window.db.getUsers();
    const cleanId = (identifier || '').toLowerCase().trim();
    
    const user = users.find(u => {
      const uName = (u.username || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();
      const isIdMatch = (uName && uName === cleanId) || (uEmail && uEmail === cleanId);
      return isIdMatch && this.verifyPassword(u.password, password);
    });

    if (!user) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw new Error('هذا الحساب معطل حالياً من قِبل الإدارة');
    }

    this.session = {
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role, // 'super_admin' or 'moderator'
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.session));
    return this.session;
  }

  logout() {
    this.session = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // توجيه لصفحة تسجيل الدخول
    const inAdminSub = window.location.pathname.includes('/admin/');
    if (inAdminSub) {
      window.location.href = 'index.html';
    } else {
      window.location.href = 'admin/index.html';
    }
  }

  isAuthenticated() {
    return !!this.session;
  }

  isSuperAdmin() {
    return this.session?.role === 'super_admin';
  }

  getUser() {
    return this.session;
  }

  /**
   * دالة حماية الصفحات الإدارية
   * إذا لم يكن مسجل دخول يتم توجيهه فوراً لصفحة الدخول
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      const isDashboard = window.location.pathname.includes('dashboard.html');
      if (isDashboard) {
        window.location.replace('index.html');
      }
    }
  }

  /**
   * إذا كان مسجل دخول وهو بصفحة login يتم توجيهه لـ dashboard
   */
  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      const isLogin = window.location.pathname.endsWith('index.html') && window.location.pathname.includes('/admin/');
      if (isLogin) {
        window.location.replace('dashboard.html');
      }
    }
  }
}

window.auth = new AuthManager();
