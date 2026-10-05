/**
 * Legal Sthal - Route Authentication & Authorization Guard (authGuard.js)
 * Enforces client route protection, admin role isolation, first-login mandatory setup,
 * and authenticated redirect handling.
 * 
 * Note: Frontend route guarding provides seamless UX and defense-in-depth;
 * the backend API is always authoritative for data access.
 */

import { authService } from '../services/authService.js';

export const authGuard = {
  /**
   * Evaluates if a given navigation route is accessible under current auth state.
   * @param {string} route - The route hash path (e.g. 'client/dashboard', 'admin/clients').
   * @returns {Object} { allowed: boolean, redirectTo: string|null, reason: string }
   */
  evaluateRoute(route) {
    const cleanRoute = (route || '').replace(/^#\/?/, '').split('?')[0].trim();
    const isAuth = authService.isAuthenticated();
    const isFirstLogin = authService.isFirstLogin();
    const isClient = authService.isClient();
    const isAdmin = authService.isAdmin();

    // 1. Public Auth Flow Pages (Login, Register, Reset, Forgot)
    const isAuthPage = cleanRoute === 'client/login' ||
                       cleanRoute === 'client/register' ||
                       cleanRoute === 'admin/login' ||
                       cleanRoute === 'client/forgot-password' ||
                       cleanRoute === 'client/reset-password';

    // 2. Forced First-Login Password Change Page
    const isChangePasswordPage = cleanRoute === 'client/change-password';

    // If authenticated user visits public login or register page:
    if (isAuth && (cleanRoute === 'client/login' || cleanRoute === 'client/register' || cleanRoute === 'admin/login')) {
      if (isFirstLogin) {
        return { allowed: false, redirectTo: 'client/change-password', reason: 'FIRST_LOGIN_REQUIRED' };
      }
      if (isAdmin) {
        return { allowed: false, redirectTo: 'admin/dashboard', reason: 'ALREADY_AUTHENTICATED' };
      }
      return { allowed: false, redirectTo: 'client/dashboard', reason: 'ALREADY_AUTHENTICATED' };
    }

    // Allow public register, forgot, and reset password pages
    if (cleanRoute === 'client/register' || cleanRoute === 'client/forgot-password' || cleanRoute === 'client/reset-password') {
      return { allowed: true, redirectTo: null, reason: 'PUBLIC_ACCESS' };
    }

    // Allow login pages if unauthenticated
    if (!isAuth && (cleanRoute === 'client/login' || cleanRoute === 'admin/login')) {
      return { allowed: true, redirectTo: null, reason: 'PUBLIC_LOGIN' };
    }

    // Unauthenticated access to protected portal pages
    if (!isAuth) {
      if (cleanRoute.startsWith('admin')) {
        return { allowed: false, redirectTo: 'admin/login', reason: 'AUTHENTICATION_REQUIRED' };
      }
      return { allowed: false, redirectTo: 'client/login', reason: 'AUTHENTICATION_REQUIRED' };
    }

    // Authenticated: First-login enforcement
    if (isFirstLogin && !isChangePasswordPage) {
      return { allowed: false, redirectTo: 'client/change-password', reason: 'FIRST_LOGIN_MANDATORY' };
    }

    // Authenticated: Allow change-password page
    if (isChangePasswordPage) {
      return { allowed: true, redirectTo: null, reason: 'CHANGE_PASSWORD_ALLOWED' };
    }

    // Authenticated: Admin portal route protection
    if (cleanRoute.startsWith('admin')) {
      if (!isAdmin) {
        // Client attempting to access Admin Portal: blocked fail-closed
        return { allowed: false, redirectTo: 'client/dashboard', reason: 'FORBIDDEN_CLIENT_ROLE' };
      }
      return { allowed: true, redirectTo: null, reason: 'ADMIN_AUTHORIZED' };
    }

    // Authenticated: Client portal route protection
    if (cleanRoute.startsWith('client')) {
      return { allowed: true, redirectTo: null, reason: 'CLIENT_AUTHORIZED' };
    }

    // Default fallback
    return {
      allowed: true,
      redirectTo: null,
      reason: 'DEFAULT_ALLOWED'
    };
  }
};
