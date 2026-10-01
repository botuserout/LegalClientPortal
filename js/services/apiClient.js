/**
 * Legal Sthal - Google Apps Script REST API Bridge & Integration Client
 * Handles communication between Web Application and Google Apps Script Web App Endpoint.
 * Supports automatic fallback to local DataStore when endpoint is offline or unconfigured.
 */

import { dataStore } from './dataStore.js';

const ENDPOINT_STORAGE_KEY = 'legalsthal_apps_script_url';
const DEFAULT_MOCK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx_mock_legalsthal_script/exec';

export const apiClient = {
  getEndpointUrl() {
    return localStorage.getItem(ENDPOINT_STORAGE_KEY) || DEFAULT_MOCK_ENDPOINT;
  },

  setEndpointUrl(url) {
    if (url) {
      localStorage.setItem(ENDPOINT_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(ENDPOINT_STORAGE_KEY);
    }
  },

  isLiveEndpointConfigured() {
    const url = this.getEndpointUrl();
    return url && !url.includes('mock_legalsthal_script') && url.startsWith('https://script.google.com');
  },

  /**
   * Test Apps Script Web App connectivity
   */
  async testConnection(customUrl = null) {
    const url = customUrl || this.getEndpointUrl();
    if (!url || url.includes('mock_legalsthal_script')) {
      return { success: false, mode: 'Mock Standby', message: 'No live Apps Script URL configured. Operating in reactive mock mode.' };
    }

    try {
      const response = await fetch(`${url}?action=healthCheck`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        mode: 'Live Google Apps Script',
        data: data,
        message: 'Successfully connected to Legal Sthal Apps Script Engine!'
      };
    } catch (err) {
      return {
        success: false,
        mode: 'Mock Fallback',
        error: err.message,
        message: `Connection failed: ${err.message}. Defaulting to reactive local state.`
      };
    }
  },

  /**
   * Generic GET helper with fallback
   */
  async get(action, params = {}) {
    if (!this.isLiveEndpointConfigured()) {
      return null; // Signals caller to use dataStore
    }

    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const response = await fetch(`${this.getEndpointUrl()}?${query}`);
      if (!response.ok) return null;
      const res = await response.json();
      return res.success ? res.data : null;
    } catch (e) {
      console.warn('Apps Script GET request failed, falling back to dataStore.', e);
      return null;
    }
  },

  /**
   * Generic POST helper with fallback
   */
  async post(action, payload = {}) {
    if (!this.isLiveEndpointConfigured()) {
      return null; // Signals caller to use dataStore
    }

    try {
      const response = await fetch(this.getEndpointUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script CORS requirement
        body: JSON.stringify({ action, ...payload })
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.warn('Apps Script POST request failed, falling back to dataStore.', e);
      return null;
    }
  }
};
