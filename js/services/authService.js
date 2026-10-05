/**
 * Legal Sthal - Authentication Service (authService.js)
 * Version: 2.0.0 (Step 4 Authenticated Integration)
 * 
 * Orchestrates user authentication, session lifecycle, password setup,
 * and role-based privilege checks via apiClient.js and authState.js.
 * 
 * Architectural Rule:
 * The backend is the sole authority for identity, credentials, roles, and authorization.
 */

import { CONFIG } from '../config.js';
import { apiClient } from './apiClient.js';
import { authState } from '../state/authState.js';
import { ERROR_CODES, normalizeApiError } from '../utils/errors.js';

class AuthService {
  constructor() {
    // Hook session expiration from apiClient
    apiClient.onSessionExpired(() => {
      this.handleSessionExpired();
    });
  }

  /**
   * Authenticates user against backend AuthService.login.
   * @param {string} loginId - User's email or Client/Admin ID.
   * @param {string} password - User's plaintext password.
   * @param {boolean} rememberMe - Whether to persist session across restarts.
   */
  async login(loginId, password, rememberMe = true) {
    if (!loginId || typeof loginId !== 'string' || !loginId.trim()) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Please enter your email or Login ID.' })
      };
    }

    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Please enter your password.' })
      };
    }

    const response = await apiClient.post('login', {
      login_id: loginId.trim(),
      password: password
    });

    if (response.success && response.data && response.data.token) {
      const user = response.data.user;
      authState.setSession(response.data.token, user, rememberMe);

      return {
        success: true,
        user: authState.getUser(),
        token: response.data.token,
        firstLogin: !!(user && user.firstLogin),
        message: response.message || 'Authentication successful.'
      };
    }

    // Local development fallback when live Google Apps Script endpoint is not yet connected
    if (!response.success && !CONFIG.isLiveEndpointConfigured()) {
      const cleanLogin = loginId.trim().toLowerCase();
      if (cleanLogin === 'admin@legalsthal.com' || cleanLogin === 'adm001') {
        const mockAdminUser = {
          userId: 'ADM001',
          name: 'Legal Sthal Operations Admin',
          email: 'admin@legalsthal.com',
          role: 'ADMIN',
          status: 'ACTIVE'
        };
        const mockToken = 'mock_sess_adm_' + Date.now();
        authState.setSession(mockToken, mockAdminUser, rememberMe);
        return {
          success: true,
          user: mockAdminUser,
          token: mockToken,
          firstLogin: false,
          message: 'Development offline sign-in successful.'
        };
      } else if (cleanLogin.includes('abctech') || cleanLogin === 'cl001') {
        const mockClientUser = {
          userId: 'CL001',
          clientId: 'CL001',
          name: 'ABC Technologies Pvt Ltd',
          contactPerson: 'Rahul Mehta',
          email: 'rahul@abctech.com',
          role: 'CLIENT',
          status: 'Active'
        };
        const mockToken = 'mock_sess_cl001_' + Date.now();
        authState.setSession(mockToken, mockClientUser, rememberMe);
        return {
          success: true,
          user: mockClientUser,
          token: mockToken,
          firstLogin: false,
          message: 'Development offline sign-in successful.'
        };
      }
    }

    return {
      success: false,
      error: response.error || normalizeApiError({ code: ERROR_CODES.AUTH_INVALID })
    };
  }

  /**
   * Registers a new client account in Legal Sthal.
   * @param {Object} clientData - { companyName, contactPerson, email, mobile, state, password }
   */
  async register(clientData) {
    if (!clientData || !clientData.email || !clientData.email.trim()) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Please enter a valid email address.' })
      };
    }

    if (!clientData.password || typeof clientData.password !== 'string') {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Password is required.' })
      };
    }

    const policy = this.validatePasswordPolicy(clientData.password);
    if (!policy.valid) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.PASSWORD_POLICY_VIOLATION, message: policy.errors.join(' ') })
      };
    }

    const response = await apiClient.post('createClient', {
      clientData: clientData,
      companyName: clientData.companyName,
      contactPerson: clientData.contactPerson,
      email: clientData.email,
      mobile: clientData.mobile,
      state: clientData.state,
      password: clientData.password
    });

    if (response.success) {
      if (!CONFIG.isLiveEndpointConfigured()) {
        try {
          const { dataStore } = await import('./dataStore.js');
          dataStore.addClient(clientData);
        } catch (e) {}
      }
      return {
        success: true,
        message: response.message || 'Account created successfully! Please sign in with your credentials.'
      };
    }

    // Local prototype offline mode fallback
    if (!CONFIG.isLiveEndpointConfigured()) {
      try {
        const { dataStore } = await import('./dataStore.js');
        dataStore.addClient(clientData);
        return {
          success: true,
          message: 'Registration successful! You can now sign in with your account.'
        };
      } catch (e) {}
    }

    return {
      success: false,
      error: response.error || normalizeApiError({ code: ERROR_CODES.SERVER_ERROR })
    };
  }

  /**
   * Terminates active session both on backend and in local state.
   */
  async logout() {
    const token = authState.getToken();
    if (token) {
      try {
        await apiClient.post('logout', { token });
      } catch (e) {
        // Fail-safe: always clear local session regardless of network outcome
      }
    }
    authState.clear(true);
    return { success: true };
  }

  /**
   * Verifies and fetches authoritative user profile from backend (getMe).
   */
  async getMe() {
    const token = authState.getToken();
    if (!token) {
      authState.clear(false);
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.SESSION_INVALID })
      };
    }

    const response = await apiClient.post('getMe', { token });
    if (response.success && response.data) {
      authState.updateUser(response.data);
      return {
        success: true,
        user: authState.getUser()
      };
    }

    // If session invalid or expired, clear local state
    if (response.error && (response.error.code === ERROR_CODES.SESSION_EXPIRED || response.error.code === ERROR_CODES.SESSION_INVALID)) {
      this.handleSessionExpired();
    }

    return {
      success: false,
      error: response.error || normalizeApiError({ code: ERROR_CODES.SESSION_INVALID })
    };
  }

  /**
   * Changes password and completes first-login requirement if applicable.
   */
  async changePassword(currentPassword, newPassword, confirmPassword) {
    const token = authState.getToken();
    if (!token) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.SESSION_INVALID, message: 'You must be signed in to change your password.' })
      };
    }

    if (!currentPassword) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Current password is required.' })
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'New password and confirmation do not match.' })
      };
    }

    const policy = this.validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.PASSWORD_POLICY_VIOLATION, message: policy.errors.join(' ') })
      };
    }

    const response = await apiClient.post('changePassword', {
      token: token,
      current_password: currentPassword,
      new_password: newPassword
    });

    if (response.success) {
      // Clear firstLogin flag in local cache
      authState.updateUser({ firstLogin: false });
      return {
        success: true,
        message: response.message || 'Password changed successfully.'
      };
    }

    return {
      success: false,
      error: response.error || normalizeApiError({ code: ERROR_CODES.SERVER_ERROR })
    };
  }

  /**
   * Dispatches a single-use password reset link to user's registered email.
   */
  async requestPasswordReset(email) {
    if (!email || !email.trim() || !email.includes('@')) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Please provide a valid email address.' })
      };
    }

    const response = await apiClient.post('requestPasswordReset', {
      email: email.trim().toLowerCase()
    });

    return {
      success: true,
      message: response.message || 'If an account exists for this email, password reset instructions have been dispatched.'
    };
  }

  /**
   * Resets password using a validated single-use reset token.
   */
  async resetPassword(resetToken, newPassword, confirmPassword) {
    if (!resetToken || typeof resetToken !== 'string') {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.RESET_TOKEN_INVALID, message: 'Reset token is required.' })
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'New password and confirmation do not match.' })
      };
    }

    const policy = this.validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: normalizeApiError({ code: ERROR_CODES.PASSWORD_POLICY_VIOLATION, message: policy.errors.join(' ') })
      };
    }

    const response = await apiClient.post('resetPassword', {
      reset_token: resetToken.trim(),
      new_password: newPassword
    });

    if (response.success) {
      return {
        success: true,
        message: response.message || 'Password has been successfully reset. Please sign in.'
      };
    }

    return {
      success: false,
      error: response.error || normalizeApiError({ code: ERROR_CODES.SERVER_ERROR })
    };
  }

  /**
   * Validates password against backend password policy.
   */
  validatePasswordPolicy(password) {
    const policy = CONFIG.PASSWORD_POLICY;
    const errors = [];

    if (!password || typeof password !== 'string') {
      return { valid: false, errors: ['Password is required.'] };
    }

    if (password.length < policy.MIN_LENGTH) {
      errors.push(`Password must be at least ${policy.MIN_LENGTH} characters long.`);
    }

    if (password.length > policy.MAX_LENGTH) {
      errors.push(`Password cannot exceed ${policy.MAX_LENGTH} characters.`);
    }

    if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter (A-Z).');
    }

    if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter (a-z).');
    }

    if (policy.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit (0-9).');
    }

    if (policy.REQUIRE_SPECIAL) {
      const specialRegex = new RegExp(`[${policy.SPECIAL_CHARACTERS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
      if (!specialRegex.test(password)) {
        errors.push(`Password must contain at least one special character (${policy.SPECIAL_CHARACTERS}).`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Handles session expiration event.
   */
  handleSessionExpired() {
    const wasAuth = authState.isAuthenticated();
    authState.clear(true);
    if (wasAuth && typeof window !== 'undefined') {
      window.location.hash = '#client/login?expired=1';
    }
  }

  // --- Convenience Status & Role Checkers ---

  isAuthenticated() {
    return authState.isAuthenticated();
  }

  isFirstLogin() {
    return authState.isFirstLogin();
  }

  getCurrentUser() {
    return authState.getUser();
  }

  getRole() {
    const user = authState.getUser();
    return user ? String(user.role).toUpperCase() : null;
  }

  isClient() {
    return this.getRole() === 'CLIENT';
  }

  isAdmin() {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEAM_MEMBER';
  }

  isSuperAdmin() {
    return this.getRole() === 'SUPER_ADMIN';
  }

  /**
   * Helper for Demo Bar to seamlessly switch roles in preview mode.
   */
  switchRole(role, clientId = 'CL001') {
    if (role === 'admin') {
      const mockAdminUser = {
        userId: 'ADM001',
        name: 'Legal Sthal Operations Admin',
        email: 'admin@legalsthal.com',
        role: 'ADMIN',
        status: 'ACTIVE'
      };
      authState.setSession('mock_sess_adm_demo', mockAdminUser, true);
    } else {
      const mockClientUser = {
        userId: clientId || 'CL001',
        clientId: clientId || 'CL001',
        name: 'ABC Technologies Pvt Ltd',
        contactPerson: 'Rahul Mehta',
        email: 'rahul@abctech.com',
        role: 'CLIENT',
        status: 'Active'
      };
      authState.setSession('mock_sess_cl_demo', mockClientUser, true);
    }
  }
}

export const authService = new AuthService();
