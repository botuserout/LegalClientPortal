/**
 * Legal Sthal - Google Apps Script Central API Client (apiClient.js)
 * Version: 2.0.0 (Step 4 Authenticated Integration)
 * 
 * Centralizes all network communication with Google Apps Script Web App.
 * Features:
 * - Strict timeout handling via AbortController.
 * - Apps Script CORS-compliant body formatting (text/plain;charset=utf-8).
 * - Automatic session token attachment for authenticated requests.
 * - Normalized response envelopes and error handling.
 * - Automatic detection of expired or invalid sessions.
 * - Zero logging of sensitive credentials (passwords, tokens, secrets).
 */

import { CONFIG } from '../config.js';
import { authState } from '../state/authState.js';
import { normalizeApiError, ERROR_CODES } from '../utils/errors.js';

let sessionExpiredCallback = null;

export const apiClient = {
  /**
   * Registers a global listener for session expiration.
   */
  onSessionExpired(callback) {
    if (typeof callback === 'function') {
      sessionExpiredCallback = callback;
    }
  },

  /**
   * Internal trigger for session expiry.
   */
  notifySessionExpired() {
    if (typeof sessionExpiredCallback === 'function') {
      try {
        sessionExpiredCallback();
      } catch (e) {}
    }
  },

  /**
   * Core request dispatcher.
   */
  async request(action, payload = {}, options = {}) {
    if (!action) {
      return { success: false, error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Action is required.' }) };
    }

    const endpointUrl = CONFIG.getEndpointUrl();
    const timeoutMs = options.timeoutMs || CONFIG.REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge session token if available and not explicitly provided
    const requestBody = Object.assign({ action }, payload);
    const activeToken = authState.getToken();
    if (activeToken && !requestBody.token && !requestBody.reset_token) {
      requestBody.token = activeToken;
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Apps Script CORS specification
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.notifySessionExpired();
          return {
            success: false,
            error: normalizeApiError({ code: ERROR_CODES.SESSION_EXPIRED })
          };
        }
        return {
          success: false,
          error: normalizeApiError({ code: ERROR_CODES.SERVER_ERROR, message: `Server returned HTTP ${response.status}` })
        };
      }

      const resJson = await response.json();

      // Check for backend session invalidation or expiration
      if (!resJson.success && resJson.error) {
        const errCode = resJson.error.code;
        if (errCode === 'SESSION_EXPIRED' || errCode === 'AUTH_UNAUTHORIZED') {
          this.notifySessionExpired();
        }
        return {
          success: false,
          error: normalizeApiError(resJson)
        };
      }

      return resJson;

    } catch (err) {
      clearTimeout(timeoutId);

      const normalized = normalizeApiError(err);
      return {
        success: false,
        error: normalized
      };
    }
  },

  /**
   * High-level POST wrapper.
   */
  async post(action, payload = {}, options = {}) {
    return this.request(action, payload, options);
  },

  /**
   * High-level GET query wrapper.
   */
  async get(action, params = {}, options = {}) {
    const endpointUrl = CONFIG.getEndpointUrl();
    const timeoutMs = options.timeoutMs || CONFIG.REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const queryParams = new URLSearchParams(Object.assign({ action }, params));
    const activeToken = authState.getToken();
    if (activeToken && !queryParams.has('token')) {
      // For GET requests where necessary
      queryParams.set('token', activeToken);
    }

    try {
      const response = await fetch(`${endpointUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.notifySessionExpired();
          return { success: false, error: normalizeApiError({ code: ERROR_CODES.SESSION_EXPIRED }) };
        }
        return { success: false, error: normalizeApiError({ code: ERROR_CODES.SERVER_ERROR }) };
      }

      const resJson = await response.json();
      return resJson;
    } catch (err) {
      clearTimeout(timeoutId);
      return { success: false, error: normalizeApiError(err) };
    }
  },

  /**
   * Helper to retrieve active Apps Script endpoint URL from CONFIG.
   */
  getEndpointUrl() {
    return CONFIG.getEndpointUrl();
  },

  /**
   * Helper to set or reset active Apps Script endpoint URL in CONFIG.
   */
  setEndpointUrl(url) {
    CONFIG.setEndpointUrl(url);
  },

  /**
   * Helper to check if a real live Apps Script deployment URL is configured.
   */
  isLiveEndpointConfigured() {
    return CONFIG.isLiveEndpointConfigured();
  },

  /**
   * Tests connectivity to the configured or supplied Google Apps Script Web App URL.
   */
  async testConnection(url) {
    const targetUrl = url || CONFIG.getEndpointUrl();
    if (!targetUrl || targetUrl.includes('mock_legalsthal_script')) {
      return {
        success: true,
        mode: 'Prototype Mock Mode',
        message: 'Endpoint verified in prototype mock mode.'
      };
    }

    try {
      const response = await fetch(`${targetUrl}?action=getAppInfo`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const json = await response.json();
        return {
          success: true,
          mode: 'Live Google Apps Script Web App',
          message: json.message || 'Successfully reached Google Apps Script Web App.'
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          message: `Endpoint returned HTTP status ${response.status}. Ensure Web App is deployed with 'Anyone' access.`
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err.toString(),
        message: 'Network request failed. Ensure Web App URL is deployed as "Execute as: Me" and "Who has access: Anyone".'
      };
    }
  }
};
