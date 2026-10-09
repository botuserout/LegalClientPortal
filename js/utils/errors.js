/**
 * Legal Sthal - Error Normalization Utility (errors.js)
 * Maps backend error codes, HTTP failures, and network timeouts into
 * predictable, safe, user-friendly error structures without internal leakage.
 */

export const ERROR_CODES = {
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_LOCKED: 'AUTH_LOCKED',
  AUTH_DISABLED: 'AUTH_DISABLED',
  FIRST_LOGIN_REQUIRED: 'FIRST_LOGIN_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PASSWORD_POLICY_VIOLATION: 'PASSWORD_POLICY_VIOLATION',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  RESET_TOKEN_USED: 'RESET_TOKEN_USED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

const USER_FRIENDLY_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID]: 'Invalid email/login ID or password.',
  [ERROR_CODES.AUTH_LOCKED]: 'Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.',
  [ERROR_CODES.AUTH_DISABLED]: 'This account has been disabled. Please contact Legal Sthal support.',
  [ERROR_CODES.FIRST_LOGIN_REQUIRED]: 'You must set a new password before accessing your account dashboard.',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ERROR_CODES.SESSION_INVALID]: 'Your session is invalid or has been revoked. Please sign in again.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please verify the submitted details and try again.',
  [ERROR_CODES.PASSWORD_POLICY_VIOLATION]: 'Password does not satisfy complexity requirements.',
  [ERROR_CODES.RESET_TOKEN_EXPIRED]: 'This password reset link has expired. Please request a new one.',
  [ERROR_CODES.RESET_TOKEN_USED]: 'This password reset link has already been used.',
  [ERROR_CODES.RESET_TOKEN_INVALID]: 'Invalid or unrecognized password reset link.',
  [ERROR_CODES.NETWORK_ERROR]: 'Unable to connect to Legal Sthal services. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'The request timed out while contacting Legal Sthal services. Please try again.',
  [ERROR_CODES.SERVER_ERROR]: 'The service encountered an error processing your request. Please try again shortly.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

/**
 * Normalizes any error object, string, or backend response into a structured { code, message } object.
 */
export function normalizeApiError(err) {
  if (!err) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: USER_FRIENDLY_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
    };
  }

  // Already normalized structure or object with explicit user message
  if (err.code && USER_FRIENDLY_MESSAGES[err.code]) {
    return {
      code: err.code,
      message: err.message || USER_FRIENDLY_MESSAGES[err.code]
    };
  }
  if (err.code === 'INVALID_CREDENTIALS') {
    return { code: ERROR_CODES.AUTH_INVALID, message: err.message || USER_FRIENDLY_MESSAGES[ERROR_CODES.AUTH_INVALID] };
  }

  // Backend error envelope { error: { code, message } }
  if (err.error && typeof err.error === 'object') {
    const backendCode = err.error.code;
    const backendMsg = err.error.message;

    if (backendCode === 'AUTH_INVALID_CREDENTIALS' || backendCode === 'INVALID_CREDENTIALS') {
      return { code: ERROR_CODES.AUTH_INVALID, message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.AUTH_INVALID] };
    }
    if (backendCode === 'AUTH_ACCOUNT_LOCKED') {
      return { code: ERROR_CODES.AUTH_LOCKED, message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.AUTH_LOCKED] };
    }
    if (backendCode === 'AUTH_ACCOUNT_INACTIVE' || backendCode === 'AUTH_DISABLED') {
      return { code: ERROR_CODES.AUTH_DISABLED, message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.AUTH_DISABLED] };
    }
    if (backendCode === 'AUTH_UNAUTHORIZED') {
      return { code: ERROR_CODES.SESSION_INVALID, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.SESSION_INVALID] };
    }
    if (backendCode === 'SESSION_EXPIRED') {
      return { code: ERROR_CODES.SESSION_EXPIRED, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.SESSION_EXPIRED] };
    }
    if (backendCode === 'RESET_TOKEN_EXPIRED') {
      return { code: ERROR_CODES.RESET_TOKEN_EXPIRED, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.RESET_TOKEN_EXPIRED] };
    }
    if (backendCode === 'RESET_TOKEN_USED') {
      return { code: ERROR_CODES.RESET_TOKEN_USED, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.RESET_TOKEN_USED] };
    }
    if (backendCode === 'RESET_TOKEN_INVALID') {
      return { code: ERROR_CODES.RESET_TOKEN_INVALID, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.RESET_TOKEN_INVALID] };
    }
    if (backendCode === 'PASSWORD_POLICY_VIOLATION') {
      return { code: ERROR_CODES.PASSWORD_POLICY_VIOLATION, message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.PASSWORD_POLICY_VIOLATION] };
    }
    if (backendCode === 'VALIDATION_ERROR') {
      return { code: ERROR_CODES.VALIDATION_ERROR, message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.VALIDATION_ERROR] };
    }

    return {
      code: backendCode || ERROR_CODES.SERVER_ERROR,
      message: backendMsg || USER_FRIENDLY_MESSAGES[ERROR_CODES.SERVER_ERROR]
    };
  }

  // Network / fetch / DOM exceptions
  const errStr = String(err.message || err);
  if (err.name === 'AbortError' || errStr.toLowerCase().includes('timeout') || errStr.toLowerCase().includes('aborted')) {
    return { code: ERROR_CODES.TIMEOUT_ERROR, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.TIMEOUT_ERROR] };
  }
  if (errStr.toLowerCase().includes('failed to fetch') || errStr.toLowerCase().includes('networkerror') || !navigator.onLine) {
    return { code: ERROR_CODES.NETWORK_ERROR, message: USER_FRIENDLY_MESSAGES[ERROR_CODES.NETWORK_ERROR] };
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: USER_FRIENDLY_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
  };
}
