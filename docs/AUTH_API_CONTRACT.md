# Legal Sthal Client + Admin Portal
# Authentication & Session API Contract

**Document Version:** 2.0.0  
**Target Environment:** Netlify Frontend ↔ Google Apps Script Web App  
**Protocol:** HTTPS POST (JSON payload with `text/plain;charset=utf-8` header to comply with Apps Script CORS)

---

## 1. Global Transport & Architecture

### Base URL
```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```
Configured centrally via `js/config.js` (`CONFIG.API_BASE_URL`).

### Request Envelope
Every request sent to Google Apps Script is dispatched as an HTTPS POST containing a JSON stringified body:
```json
{
  "action": "<ENDPOINT_ACTION>",
  "token": "<SESSION_TOKEN_IF_AUTHENTICATED>",
  "...": "<ENDPOINT_SPECIFIC_FIELDS>"
}
```

*Note on Authorization Header:* Google Apps Script Web Apps do not expose custom HTTP request headers (like `Authorization: Bearer <token>`) reliably in standard browser `fetch` requests without triggering preflight CORS errors. Therefore, session tokens are securely transmitted in the JSON payload body under the `token` parameter.

### Standard Response Envelope
All responses return HTTP 200 with standard JSON payload:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status description",
  "error": null
}
```
Or on failure:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE_ENUM",
    "message": "User-friendly failure description"
  }
}
```

---

## 2. API Endpoints Specification

### 2.1 Login
Authenticates client or administrator credentials against the authoritative database.

* **Action:** `login`
* **HTTP Method:** `POST`
* **Authentication Required:** None (Public)
* **Request Payload:**
  ```json
  {
    "action": "login",
    "login_id": "client@example.com",
    "password": "Password@2026!"
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "token": "4a7f8b9c...64_hex_chars...",
      "user": {
        "userId": "CL001",
        "role": "CLIENT",
        "email": "client@example.com",
        "name": "Acme Technologies Pvt Ltd",
        "contactPerson": "Rahul Sharma",
        "firstLogin": false
      },
      "expiresAt": "2026-10-02T12:00:00.000Z"
    },
    "message": "Authentication successful."
  }
  ```
* **Failure Responses:**
  * `AUTH_INVALID_CREDENTIALS`: "Invalid email/login ID or password."
  * `AUTH_ACCOUNT_LOCKED`: "Account is temporarily locked due to multiple failed login attempts. Try again in 15 minutes."
  * `AUTH_ACCOUNT_INACTIVE`: "This account has been deactivated. Please contact support."
* **Frontend Action:** Stores raw session token in `sessionStorage` (or `localStorage` if Remember Me is chosen), updates `authState`, checks `firstLogin` (routes to `client/change-password` if true), or routes to dashboard.

---

### 2.2 Logout
Invalidates the active session on the backend and in local storage.

* **Action:** `logout`
* **HTTP Method:** `POST`
* **Authentication Required:** Yes
* **Request Payload:**
  ```json
  {
    "action": "logout",
    "token": "4a7f8b9c...64_hex_chars..."
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "message": "Session successfully terminated."
  }
  ```
* **Frontend Action:** Invokes `authState.clear()`, removes stored credentials, and redirects to `#client/login`.

---

### 2.3 Get Current User (`getMe`)
Validates the active session token and returns the authoritative user identity.

* **Action:** `getMe`
* **HTTP Method:** `POST`
* **Authentication Required:** Yes
* **Request Payload:**
  ```json
  {
    "action": "getMe",
    "token": "4a7f8b9c...64_hex_chars..."
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "userId": "CL001",
      "role": "CLIENT",
      "clientId": "CL001",
      "firstLogin": false,
      "name": "Acme Technologies Pvt Ltd",
      "email": "client@example.com",
      "contactPerson": "Rahul Sharma"
    },
    "message": "User session authenticated."
  }
  ```
* **Failure Responses:**
  * `SESSION_EXPIRED`: "Your session has expired. Please log in again."
  * `AUTH_UNAUTHORIZED`: "Invalid or expired session token."
* **Frontend Action:** If valid, updates `authState`. If expired or unauthorized, clears local storage and routes to `#client/login?expired=1`.

---

### 2.4 Change Password
Updates user password and clears `first_login` restricted state.

* **Action:** `changePassword`
* **HTTP Method:** `POST`
* **Authentication Required:** Yes
* **Request Payload:**
  ```json
  {
    "action": "changePassword",
    "token": "4a7f8b9c...64_hex_chars...",
    "current_password": "OldPassword@2026!",
    "new_password": "NewSecurePassword@2026!"
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "message": "Password has been successfully updated."
  }
  ```
* **Failure Responses:**
  * `AUTH_UNAUTHORIZED`: "Active session required to change password."
  * `AUTH_INVALID_CREDENTIALS`: "Current password does not match our records."
  * `PASSWORD_POLICY_VIOLATION`: "Password must contain at least one special character (!@#$%...)."
* **Frontend Action:** Marks `firstLogin = false` in `authState`, displays success toast, and routes to dashboard.

---

### 2.5 Request Password Reset
Dispatches a single-use recovery token link via email.

* **Action:** `requestPasswordReset`
* **HTTP Method:** `POST`
* **Authentication Required:** None (Public)
* **Request Payload:**
  ```json
  {
    "action": "requestPasswordReset",
    "email": "client@example.com"
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "message": "If an account exists for this email, password reset instructions have been dispatched."
  }
  ```
* **Frontend Action:** Displays confirmation notice to user without leaking whether the email exists.

---

### 2.6 Reset Password
Verifies a single-use reset token and configures a new password.

* **Action:** `resetPassword`
* **HTTP Method:** `POST`
* **Authentication Required:** None (Reset Token Authorized)
* **Request Payload:**
  ```json
  {
    "action": "resetPassword",
    "reset_token": "8f3b2a1c...64_hex_chars...",
    "new_password": "BrandNewPassword@2026!"
  }
  ```
* **Success Response:**
  ```json
  {
    "success": true,
    "message": "Password has been successfully reset. Please sign in with your new password."
  }
  ```
* **Failure Responses:**
  * `RESET_TOKEN_INVALID`: "Reset token is invalid or has expired."
  * `RESET_TOKEN_EXPIRED`: "Reset token has expired. Please request a new password reset."
  * `RESET_TOKEN_USED`: "This reset token has already been used. Please request a new password reset."
  * `PASSWORD_POLICY_VIOLATION`: "Password must be at least 8 characters long."
* **Frontend Action:** Shows success confirmation banner, clears reset token from state, and provides direct link to `#client/login`.
