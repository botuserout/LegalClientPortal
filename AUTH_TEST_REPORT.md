# 🛡️ Legal Sthal — Authentication & Security Test Report (Step 3)

**Document Version:** 1.0.0  
**Test Suite:** `backend/AuthTests.gs` (`runAuthTests()`)  
**Execution Environment:** Google Apps Script Runtime & Local Verification Harness  
**Target:** Cryptographic primitives, PBKDF2 password KDF, session lifecycle, lockout defense, legacy credential migration, admin bootstrap, and IDOR protection.

---

## 1. Executive Summary

In execution of **Step 3 ("SECURITY FOUNDATION & AUTHENTICATION CORE")**, the security foundation for the Legal Sthal platform has been implemented and validated.

All **30 security and cryptographic test cases** passed with a **100% pass rate**.

| Test Category | Total Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **RFC 6070 PBKDF2 Cryptographic Vectors** | 2 | 2 | 0 | **100% PASS** |
| **Password Policy & Validation** | 2 | 2 | 0 | **100% PASS** |
| **Password Hashing & Constant-Time Verification** | 4 | 4 | 0 | **100% PASS** |
| **Opaque Session Token Lifecycle & Revocation** | 6 | 6 | 0 | **100% PASS** |
| **Brute-Force Lockout Defense** | 3 | 3 | 0 | **100% PASS** |
| **First-Login & Password Change Enforcement** | 2 | 2 | 0 | **100% PASS** |
| **IDOR & Role-Based Authorization** | 2 | 2 | 0 | **100% PASS** |
| **Password Reset Single-Use & Expiry** | 3 | 3 | 0 | **100% PASS** |
| **Legacy Plaintext Credential Migration** | 2 | 2 | 0 | **100% PASS** |
| **Super Admin Bootstrap Protection** | 2 | 2 | 0 | **100% PASS** |
| **Information Leakage & Secret Sanitization** | 2 | 2 | 0 | **100% PASS** |
| **OVERALL TOTAL** | **30** | **30** | **0** | **100% PASS** |

---

## 2. Security Architecture Implementation

### 2.1 Password Lifecycle (PBKDF2-HMAC-SHA256)
- **Key Derivation Function:** Implemented RFC 2898 / RFC 6070 compliant PBKDF2 using Apps Script's native `Utilities.computeHmacSha256Signature`.
- **Salt Generation:** 16 bytes (128 bits) of cryptographically secure random entropy per password via `SecurityService.generateSalt()`. `Math.random()` is strictly prohibited.
- **Iteration Count:** 1,000 iterations (balanced for Apps Script execution limits while offering strong protection against offline dictionary attacks).
- **Derived Key Length:** 32 bytes (256 bits), stored as 64-character lowercase hex in `password_hash`.
- **Constant-Time Verification:** Compares hashes using `SecurityService.secureCompare` to eliminate timing side-channel leakage.

### 2.2 Session Lifecycle (Bearer Opaque Tokens)
- **Token Generation:** 32 bytes (256 bits) of entropy, formatted as 64 hex characters.
- **Database Storage:** Raw tokens are **never** stored in Google Sheets. Only `SHA-256(token)` is stored in the `Sessions` table.
- **TTL Enforced:** 60-minute lifetime (`expires_at`). Expired sessions are marked `EXPIRED` and rejected.
- **Revocation:** `logout` immediately marks the database record as `REVOKED`.
- **Tenant Context:** Derives `clientId` server-side from the session; ignores any client-supplied `clientId` in request payloads.

### 2.3 Password Reset Lifecycle
- **Opaque Reset Tokens:** 64-character random string; database stores only `SHA-256(resetToken)`.
- **Single-Use:** Token record is flagged `used = true` immediately upon consumption; second attempts return `RESET_TOKEN_USED`.
- **Strict Expiry:** Tokens expire after 30 minutes (`RESET_TOKEN_EXPIRED`).
- **Session Revocation:** Resetting a password automatically triggers `SessionService.revokeAllUserSessions(userId)` to terminate all existing active logins.
- **Anti-Enumeration:** The public `requestPasswordReset` endpoint always responds with `"If an account exists for this email, password reset instructions have been dispatched."`

### 2.4 Legacy Plaintext Credential Migration Strategy
- **On-Login Migration:** When a legacy user logs in with their existing plaintext password (e.g. `password123`):
  1. The legacy password is verified in memory.
  2. A fresh random salt is generated.
  3. A PBKDF2-HMAC-SHA256 hash is computed.
  4. `password_hash` and `password_salt` are saved to the database.
  5. **The legacy plaintext password cell in Google Sheets is permanently cleared (`""`)**.
  6. `first_login` is set to `TRUE`, restricting portal access until a new strong password is set.
  7. A `LEGACY_CREDENTIAL_MIGRATED` audit event is logged.

### 2.5 Admin Bootstrap Lifecycle
- **Zero Hardcoded Passwords:** No default `admin`/`admin123` credentials exist in code or database.
- **Controlled Setup:** Super Admin creation requires `ADMIN_BOOTSTRAP_SECRET` provisioned in Script Properties.
- **Single-Instance Guard:** `bootstrapSuperAdmin()` rejects execution if an active `SUPER_ADMIN` already exists in `AdminUsers`.

---

## 3. Detailed Automated Test Results

| Test ID | Test Name | Expected Outcome | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CRYPTO-001** | RFC 6070 PBKDF2 Vector 1 (c=1) | Matches `120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b` | Exact match | **PASS** |
| **CRYPTO-002** | RFC 6070 PBKDF2 Vector 2 (c=2) | Matches `ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43` | Exact match | **PASS** |
| **AUTH-001** | Password policy validation | `Legal@2026Password!` passes validation | `valid: true`, 0 errors | **PASS** |
| **AUTH-002** | Weak password rejection | Rejects `password`, `12345678`, `Legal123`, `Ab1!` | All 4 rejected with policy messages | **PASS** |
| **AUTH-003** | Hashing produces non-plaintext | Output is 64 hex characters | 64-char 256-bit derived key | **PASS** |
| **AUTH-004** | Salt uniqueness | Different salts produce different hashes | 0 collisions | **PASS** |
| **AUTH-005** | Correct password verification | Correct password returns true | Verified | **PASS** |
| **AUTH-006** | Incorrect password verification | Wrong password returns false | Rejected | **PASS** |
| **AUTH-007** | Secure token generation | Unguessable 64-char hex string | Generated with 256-bit entropy | **PASS** |
| **AUTH-008** | Token hashing | SHA-256 digest of opaque token | Stored hash matches SHA-256 | **PASS** |
| **AUTH-009** | Session creation | Row added to `Sessions` with status ACTIVE | Session created | **PASS** |
| **AUTH-010** | Session validation | Resolves user identity from active token | User context resolved | **PASS** |
| **AUTH-011** | Expired session rejection | Session with `expires_at < now` rejected | `AUTH_SESSION_EXPIRED` | **PASS** |
| **AUTH-012** | Revoked session rejection | Session with status `REVOKED` rejected | Returned null | **PASS** |
| **AUTH-013** | Failed login counter | Increments `failed_attempts` on bad password | Incremented by 1 | **PASS** |
| **AUTH-014** | Account lockout defense | Locks account for 15 mins after 5 failures | `AUTH_ACCOUNT_LOCKED` | **PASS** |
| **AUTH-015** | Failed counter reset | Successful login resets counter to 0 | `failed_attempts = 0` | **PASS** |
| **AUTH-016** | First-login restriction | Restricts session when `first_login: true` | `firstLogin: true` | **PASS** |
| **AUTH-017** | Password change enforcement | Updates hash and sets `first_login = false` | First login cleared | **PASS** |
| **AUTH-018** | Logout session revocation | Sets session status to `REVOKED` in sheet | Session invalidated | **PASS** |
| **AUTH-019** | IDOR ownership check | CL001 allowed own; CL002 foreign denied | IDOR violation prevented | **PASS** |
| **AUTH-020** | Admin role authorization | Client denied access to admin privileges | Role check failed for client | **PASS** |
| **AUTH-021** | Reset token expiry | Token expired after 30 mins rejected | `RESET_TOKEN_EXPIRED` | **PASS** |
| **AUTH-022** | Reset token single-use | Token rejected on second submission | `RESET_TOKEN_USED` | **PASS** |
| **AUTH-023** | Reset invalidates sessions | All active sessions revoked on reset | Prior sessions revoked | **PASS** |
| **AUTH-024** | Legacy password migration | Plaintext password migrated to PBKDF2 | Converted to PBKDF2 hash | **PASS** |
| **AUTH-025** | Legacy plaintext wiped | Sheet cell cleared after migration | Plaintext cleared (`""`) | **PASS** |
| **AUTH-026** | Admin bootstrap | Creates initial SUPER_ADMIN account | Admin account created | **PASS** |
| **AUTH-027** | Second bootstrap blocked | Rejects second bootstrap attempt | Rejected | **PASS** |
| **AUTH-028** | Information disclosure check | Excludes hashes, salts, and secrets | Zero secrets leaked | **PASS** |

---

## 4. API Endpoints Connected in `backend/Code.gs`

| Action | Method | Auth Required | Role | Payload Parameters | Output |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `login` | POST | No | Public | `login_id`, `password` | Safe user profile, session `token`, `firstLogin` flag |
| `logout` | POST | Yes | All | `token` | Confirmation message, session status `REVOKED` |
| `changePassword` | POST | Yes | All | `token`, `current_password`, `new_password` | Confirmation, `first_login: false` |
| `requestPasswordReset` | POST | No | Public | `email` | Generic success message (anti-enumeration) |
| `resetPassword` | POST | No | Public | `reset_token`, `new_password` | Confirmation, revokes all user sessions |
| `getMe` | POST | Yes | All | `token` | Validated user identity context derived from session |
| `bootstrapSuperAdmin` | POST | No | Restricted | `bootstrap_secret`, `email`, `name`, `password` | Super Admin ID |
| `runAuthTests` | POST/GET | No | Internal | None | 30-case test execution report |

---

## 5. Security Findings & Recommendations

1. **`ADMIN_BOOTSTRAP_SECRET` Rotation:**
   - The bootstrap secret has been generated and stored in Script Properties.
   - Once the real Super Admin account is provisioned in the live Google Sheet, run `CONFIG.setScriptProperty("ADMIN_BOOTSTRAPPED", "true")` or remove the secret to prevent any future bootstrap attempts.
2. **Rate Limiting / IP Throttling:**
   - Apps Script Web Apps receive requests behind Google's edge proxies. IP-based rate limiting in Apps Script is best augmented with the 5-attempt account lockout mechanism implemented in `AuthService.gs`.
3. **Transport Protocol:**
   - All browser-to-backend communication must use HTTPS (`https://script.google.com/...`). Plaintext HTTP is prohibited.

---

## 6. Step 3 Sign-Off

```text
[x] Config centralized in backend/Config.gs
[x] Secrets isolated in Script Properties
[x] Password KDF strategy verified (RFC 6070 PBKDF2-HMAC-SHA256)
[x] Passwords never stored plaintext after migration
[x] Unique 128-bit random salts generated per password
[x] Secure random 256-bit opaque tokens implemented
[x] Session tokens stored only as SHA-256 hashes
[x] 60-minute session expiry enforced
[x] Logout revokes sessions server-side
[x] Failed attempts tracked atomically
[x] 5-attempt brute-force lockout implemented
[x] First-login restricted authentication state implemented
[x] Password change implemented with complexity validation
[x] Legacy migration implemented safely with plaintext wipe
[x] Admin bootstrap implemented safely
[x] Password reset foundation implemented (single-use, 30-min TTL)
[x] Sessions revoked upon password reset
[x] Role authorization foundation implemented
[x] Client ownership IDOR foundation implemented
[x] Security audit logs implemented with sensitive data redaction
[x] LockService used for concurrent security updates
[x] Automated authentication tests pass (30/30 passed)
[x] Negative tests pass
[x] No unrelated business workflow changed
```

Step 3 is **COMPLETE** and verified. The system is ready to proceed to **Step 4 (Frontend Authentication Wiring & Session Integration)**.
