/**
 * Legal Sthal - Frontend Authentication State Store (authState.js)
 * Manages in-memory auth state and secure session synchronization.
 * 
 * SECURITY CONTRACT:
 * - Frontend state is strictly a UI cache; the backend is the authoritative source of truth.
 * - Never persists passwords, password hashes, salts, reset tokens, or bootstrap secrets.
 * - Opaque session token is persisted in sessionStorage (or localStorage if 'remember me' is selected).
 * - Multi-tab synchronization is supported via window 'storage' events.
 */

import { CONFIG } from '../config.js';

class AuthState {
  constructor() {
    this.token = null;
    this.user = null;
    this.authenticated = false;
    this.firstLogin = false;
    this.listeners = [];

    // Initialize state from storage
    this.initFromStorage();

    // Listen for cross-tab storage changes (e.g. logout in another tab)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === CONFIG.SESSION_STORAGE_KEY) {
          if (!e.newValue && this.authenticated) {
            // Logged out in another tab
            this.clear(false);
          } else if (e.newValue && e.newValue !== this.token) {
            this.initFromStorage();
          }
        }
      });
    }
  }

  /**
   * Initializes state from browser storage.
   */
  initFromStorage() {
    try {
      const storedToken = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY) ||
                          localStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
      const storedUser = sessionStorage.getItem(CONFIG.AUTH_USER_STORAGE_KEY) ||
                         localStorage.getItem(CONFIG.AUTH_USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);
        this.authenticated = true;
        this.firstLogin = !!(this.user && this.user.firstLogin);
      } else {
        this.token = null;
        this.user = null;
        this.authenticated = false;
        this.firstLogin = false;
      }
    } catch (e) {
      this.clear(false);
    }
  }

  /**
   * Sets the authenticated session returned by the authoritative backend.
   * @param {string} token - The raw opaque session token.
   * @param {Object} user - Authenticated user descriptor { userId, role, email, name, firstLogin, clientId }.
   * @param {boolean} rememberMe - Whether to persist across browser restarts (localStorage vs sessionStorage).
   */
  setSession(token, user, rememberMe = true) {
    if (!token || !user) return;

    this.token = token;
    // Sanitized user object: guarantee no password/hash fields can ever be stored
    this.user = {
      id: user.userId || user.id,
      userId: user.userId || user.id,
      loginId: user.loginId || user.email,
      email: user.email || '',
      name: user.name || user.companyName || '',
      companyName: user.companyName || user.name || '',
      contactPerson: user.contactPerson || user.name || '',
      role: String(user.role || 'CLIENT').toUpperCase(),
      clientId: user.clientId || null,
      firstLogin: !!user.firstLogin
    };
    this.authenticated = true;
    this.firstLogin = !!user.firstLogin;

    const userJson = JSON.stringify(this.user);
    if (rememberMe) {
      localStorage.setItem(CONFIG.SESSION_STORAGE_KEY, token);
      localStorage.setItem(CONFIG.AUTH_USER_STORAGE_KEY, userJson);
    }
    // Always keep in sessionStorage for the active tab
    sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, token);
    sessionStorage.setItem(CONFIG.AUTH_USER_STORAGE_KEY, userJson);

    this.notify();
  }

  /**
   * Updates authoritative user profile in state (e.g. after getMe or password change).
   */
  updateUser(userUpdates) {
    if (!this.user) return;
    this.user = Object.assign({}, this.user, userUpdates);
    if (userUpdates.firstLogin !== undefined) {
      this.firstLogin = !!userUpdates.firstLogin;
    }
    const userJson = JSON.stringify(this.user);
    if (localStorage.getItem(CONFIG.SESSION_STORAGE_KEY)) {
      localStorage.setItem(CONFIG.AUTH_USER_STORAGE_KEY, userJson);
    }
    sessionStorage.setItem(CONFIG.AUTH_USER_STORAGE_KEY, userJson);
    this.notify();
  }

  /**
   * Clears all session credentials and reset authentication state.
   */
  clear(notifyListeners = true) {
    this.token = null;
    this.user = null;
    this.authenticated = false;
    this.firstLogin = false;

    try {
      sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
      sessionStorage.removeItem(CONFIG.AUTH_USER_STORAGE_KEY);
      localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
      localStorage.removeItem(CONFIG.AUTH_USER_STORAGE_KEY);
    } catch (e) {}

    if (notifyListeners) {
      this.notify();
    }
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return this.authenticated && !!this.token;
  }

  isFirstLogin() {
    return this.isAuthenticated() && this.firstLogin;
  }

  getRole() {
    return this.user ? String(this.user.role || '').toUpperCase() : null;
  }

  isAdmin() {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_MEMBER';
  }

  isClient() {
    return this.getRole() === 'CLIENT';
  }

  isSuperAdmin() {
    return this.getRole() === 'SUPER_ADMIN';
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this); } catch (e) {}
    });
  }
}

export const authState = new AuthState();
