const ENDPOINT_STORAGE_KEY = 'legalsthal_apps_script_url';

const DEFAULT_API_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzQ76M8ki9F6dctObcu3hp37GHaAMNpeIPgm4VAm6Sweraczu3kqofmEcM0z4vwJoCc/exec';

export const CONFIG = {

  API_BASE_URL:
    localStorage.getItem(ENDPOINT_STORAGE_KEY) ||
    DEFAULT_API_ENDPOINT,

  SESSION_STORAGE_KEY: 'legalsthal_session_token',

  AUTH_USER_STORAGE_KEY: 'legalsthal_auth_user',

  ENDPOINT_STORAGE_KEY: ENDPOINT_STORAGE_KEY,

  REQUEST_TIMEOUT_MS: 30000,

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
      url.startsWith('https://script.google.com')
    );
  }

};