const ENDPOINT_STORAGE_KEY = 'legalsthal_apps_script_url';

const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxJ-MYnHlZAPQ8HjKzIjEl-YsxzXh8LtdN-V5fUEA8nT0EmXtun2BK4czmrTlVdShatzw/exec';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const DEFAULT_API_ENDPOINT = isLocalhost ? '/api/backend' : GOOGLE_APPS_SCRIPT_URL;

// Update local storage to ensure the proper endpoint is active
if (typeof localStorage !== 'undefined') {
  const currentStored = localStorage.getItem(ENDPOINT_STORAGE_KEY);
  if (isLocalhost) {
    // On localhost, always ensure the local proxy is used to avoid CORS/redirect/cookie issues
    localStorage.setItem(ENDPOINT_STORAGE_KEY, '/api/backend');
  } else if (!currentStored || currentStored.includes('/api/backend')) {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, GOOGLE_APPS_SCRIPT_URL);
  }
}

export const CONFIG = {

  API_BASE_URL: DEFAULT_API_ENDPOINT,

  SESSION_STORAGE_KEY: 'legalsthal_session_token',

  AUTH_USER_STORAGE_KEY: 'legalsthal_auth_user',

  ENDPOINT_STORAGE_KEY: ENDPOINT_STORAGE_KEY,

  REQUEST_TIMEOUT_MS: 60000,

  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    SPECIAL_CHARACTERS: "!@#$%^&*()_+-=[]{}|;:,.<>?"
  },

  getEndpointUrl() {
    return (
      localStorage.getItem(ENDPOINT_STORAGE_KEY) ||
      this.API_BASE_URL
    );
  },

  setEndpointUrl(url) {
    if (url && typeof url === 'string') {
      const trimmed = url.trim();

      localStorage.setItem(
        ENDPOINT_STORAGE_KEY,
        trimmed
      );

      this.API_BASE_URL = trimmed;

    } else {

      localStorage.removeItem(
        ENDPOINT_STORAGE_KEY
      );

      this.API_BASE_URL =
        DEFAULT_API_ENDPOINT;
    }
  },

  isLiveEndpointConfigured() {
    const url = this.getEndpointUrl();

    return (
      url &&
      !url.includes('mock_legalsthal_script') &&
      (url.startsWith('https://script.google.com') || url.includes('/api/backend'))
    );
  }

};