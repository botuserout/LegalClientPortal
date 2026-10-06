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

// Read-only actions eligible for fast memory caching
const READ_ACTIONS = new Set([
  'adminGetDashboard',
  'adminGetClients',
  'adminGetClient',
  'adminGetService',
  'adminGetSpocs',
  'getClientProfile',
  'getClientDashboard',
  'getClientServices',
  'getClientService',
  'getClientNotifications',
  'adminGetCrmSync',
  'getClientDocuments',
  'getQuoteRequests',
  'getClientQuoteRequests',
  'adminGetNotificationHealth',
  'getFormSubmissionConfig'
]);

// 3-minute TTL for cached reads
const CACHE_TTL_MS = 180000;
const memoryCache = new Map();

function getProgressBar() {
  let bar = document.getElementById('global-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'global-progress-bar';
    bar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, #d4af37, #f3e5ab, #d4af37);
      z-index: 99999;
      transition: width 0.25s ease, opacity 0.3s ease;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.7);
      pointer-events: none;
    `;
    document.body.appendChild(bar);
  }
  return bar;
}

let activeRequests = 0;
function startProgress() {
  activeRequests++;
  const bar = getProgressBar();
  bar.style.opacity = '1';
  bar.style.width = '30%';
  setTimeout(() => {
    if (activeRequests > 0) bar.style.width = '75%';
  }, 150);
}

function finishProgress() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    const bar = getProgressBar();
    bar.style.width = '100%';
    setTimeout(() => {
      if (activeRequests === 0) {
        bar.style.opacity = '0';
        setTimeout(() => { if (activeRequests === 0) bar.style.width = '0%'; }, 300);
      }
    }, 200);
  }
}

export const apiClient = {
  /**
   * Clears the API read cache.
   */
  clearCache() {
    memoryCache.clear();
  },

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
   * Core request dispatcher with intelligent caching & instant return.
   */
  async request(action, payload = {}, options = {}) {
    if (!action) {
      return { success: false, error: normalizeApiError({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Action is required.' }) };
    }

    const isRead = READ_ACTIONS.has(action);
    const activeToken = authState.getToken();
    const cacheKey = isRead ? `${action}:${JSON.stringify(payload)}:${activeToken || ''}` : null;

    // Check fast cache first
    if (isRead && !options.forceFresh && cacheKey && memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // Return cached result INSTANTLY (0ms)
        return cached.data;
      }
    }

    // Invalidate cache on mutations (non-read actions)
    if (!isRead && action !== 'login' && action !== 'getMe') {
      memoryCache.clear();
    }

    startProgress();

    const endpointUrl = CONFIG.getEndpointUrl();
    const timeoutMs = options.timeoutMs || CONFIG.REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge session token if available and not explicitly provided
    const requestBody = Object.assign({ action }, payload);
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
      finishProgress();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (activeToken && action !== 'login' && action !== 'register') {
            this.notifySessionExpired();
            return {
              success: false,
              error: normalizeApiError({ code: ERROR_CODES.SESSION_EXPIRED })
            };
          }
          return {
            success: false,
            error: normalizeApiError({ code: ERROR_CODES.AUTH_INVALID, message: 'Invalid email or password.' })
          };
        }
        return {
          success: false,
          error: normalizeApiError({ code: ERROR_CODES.SERVER_ERROR, message: `Server returned HTTP ${response.status}` })
        };
      }

      let resJson;
      try {
        resJson = await response.json();
      } catch (jsonErr) {
        return {
          success: false,
          error: normalizeApiError({ code: ERROR_CODES.SERVER_ERROR, message: 'Invalid response from server.' })
        };
      }

      // Check for backend session invalidation or expiration
      if (!resJson.success && resJson.error) {
        const errCode = resJson.error.code;
        if ((errCode === 'SESSION_EXPIRED' || errCode === 'AUTH_UNAUTHORIZED') && activeToken && action !== 'login') {
          this.notifySessionExpired();
        }
        return {
          success: false,
          error: normalizeApiError(resJson)
        };
      }

      // Store in memory cache for future instant returns
      if (isRead && cacheKey && resJson.success) {
        memoryCache.set(cacheKey, {
          data: resJson,
          timestamp: Date.now()
        });
      }

      return resJson;

    } catch (err) {
      clearTimeout(timeoutId);
      finishProgress();

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
