const ENDPOINT_STORAGE_KEY = 'legalsthal_apps_script_url';

const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxJ-MYnHlZAPQ8HjKzIjEl-YsxzXh8LtdN-V5fUEA8nT0EmXtun2BK4czmrTlVdShatzw/exec';

// /api/backend routes to local server on localhost, and to Netlify Serverless Function on Netlify
const DEFAULT_API_ENDPOINT = '/api/backend';

// Update local storage to ensure the unified /api/backend endpoint is active
if (typeof localStorage !== 'undefined') {
  const currentStored = localStorage.getItem(ENDPOINT_STORAGE_KEY);
  if (!currentStored || currentStored.includes('script.google.com')) {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, '/api/backend');
  }
}

export const CONFIG = {

  API_BASE_URL: DEFAULT_API_ENDPOINT,

  SESSION_STORAGE_KEY: 'legalsthal_session_token',

  AUTH_USER_STORAGE_KEY: 'legalsthal_auth_user',

  ENDPOINT_STORAGE_KEY: ENDPOINT_STORAGE_KEY,

  SUPABASE_URL: 'https://pfsiblstvkcqjfiaajoe.supabase.co',
  SUPABASE_KEY: 'sb_publishable_bXXPnBtfn4U-5iBvBDkaZQ_Df2_Dqxt',
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
      (url.startsWith('https://script.google.com') || url.includes('/api/backend'))
    );
  }

};

export const INDIAN_STATES_AND_UTS = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

export function renderStateOptionsHtml(selected = '', includeAll = false, allLabel = 'All States & UTs') {
  let html = '';
  if (includeAll) {
    html += `<option value="ALL" ${selected === 'ALL' || !selected ? 'selected' : ''}>${allLabel}</option>`;
  }
  INDIAN_STATES_AND_UTS.forEach(state => {
    const isSel = (selected || '').toLowerCase() === state.toLowerCase();
    html += `<option value="${state}" ${isSel ? 'selected' : ''}>${state}</option>`;
  });
  return html;
}