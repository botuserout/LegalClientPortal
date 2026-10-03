# 🧪 Legal Sthal Quality Assurance & Verification Test Plan

**Document Version:** 1.0.0  
**Target System:** Legal Sthal Apps Script Backend & Netlify Client/Admin Portal  
**Execution Environment:** Apps Script Runtime (V8) & Browser Integration  

---

## 1. Automated Unit Test Matrix (`Tests.gs`)

The unit test suite will be deployed in a dedicated `Tests.gs` Apps Script file and executed via the Apps Script editor runner (`runAllUnitTests()`).

| Test ID | Module / Function | Test Scenario | Expected Outcome | Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | `SecurityService.validatePassword` | Valid complex password (`Legal@2026`) | `TRUE` | Ready for Run |
| **AUTH-002** | `SecurityService.validatePassword` | Weak password: simple lowercase (`password`) | `FALSE` | Ready for Run |
| **AUTH-003** | `SecurityService.validatePassword` | Weak password: no special char (`Password123`) | `FALSE` | Ready for Run |
| **AUTH-004** | `SecurityService.validatePassword` | Weak password: short length (`Ab1!`) | `FALSE` | Ready for Run |
| **AUTH-005** | `SecurityService.hashPassword` | Same password + salt | Deterministic hash string | Ready for Run |
| **AUTH-006** | `SecurityService.verifyPassword` | Correct password matching stored hash + salt | `TRUE` | Ready for Run |
| **AUTH-007** | `SecurityService.verifyPassword` | Incorrect password | `FALSE` | Ready for Run |
| **AUTH-008** | `Utils.normalizeEmail` | Dirty email (`  Rahul.Mehta@Example.COM  `) | `"rahul.mehta@example.com"` | Ready for Run |
| **AUTH-009** | `Utils.normalizeMobile` | Phone with formatting (`+91 98765-43210`) | `"+919876543210"` | Ready for Run |
| **AUTH-010** | `ClientService.findClientByEmail` | Query with registered email | Returns Client Object | Ready for Run |
| **AUTH-011** | `ClientService.findClientByEmail` | Query with unknown email | `null` | Ready for Run |
| **AUTH-012** | `ClientService.findClientByMobile` | Query with existing phone | Returns Client Object | Ready for Run |
| **AUTH-013** | `AuthService.createSession` | Valid user ID and role | Session ID + hashed token created | Ready for Run |
| **AUTH-014** | `AuthService.validateSession` | Active token within 60 mins | Returns valid user context | Ready for Run |
| **AUTH-015** | `AuthService.validateSession` | Expired token (> 60 mins) | `null` (Error: Session Expired) | Ready for Run |
| **AUTH-016** | `AuthService.invalidateSession` | Active token after `logout` call | Session status `REVOKED` | Ready for Run |
| **AUTH-017** | `AuthService.recordFailedLogin` | Failed attempt count increment | Count increments by 1 | Ready for Run |
| **AUTH-018** | `AuthService.isAccountLocked` | Failed count reaches 5 | `TRUE` (locked for 15 mins) | Ready for Run |
| **AUTH-019** | `AuthService.resetFailedAttempts`| Successful login after failed attempts | Failed count reset to 0 | Ready for Run |
| **AUTH-020** | `AuthService.createPasswordReset`| Registered email address | 32-char token hashed in DB | Ready for Run |
| **AUTH-021** | `AuthService.validateResetToken` | Single-use reset token | Valid on first use, invalid on reuse | Ready for Run |
| **SEC-001** | `Router.authorizeClientService`| CL001 requesting SRV001 (owned) | `TRUE` (Access Allowed) | Ready for Run |
| **SEC-002** | `Router.authorizeClientService`| CL001 requesting SRV002 (owned by CL002) | `FALSE` (403 IDOR Forbidden) | Ready for Run |
| **SRV-001** | `ServiceService.validateStage` | "DSC Creation" for Incorporation | `TRUE` | Ready for Run |
| **SRV-002** | `ServiceService.validateStage` | "Arbitrary Stage Name" | `FALSE` | Ready for Run |
| **FIN-001** | `ServiceService.calculateAmounts` | Total: 10,000, Paid: 4,000 | Remaining = 6,000 | Ready for Run |

---

## 2. Integration Test Scenarios

### INT-01: Multi-Service Client Onboarding & Existing Client Detection
1. **Action:** Admin creates a new client: `ABC Technologies Pvt Ltd` (`rahul@abctech.com`, `+919876543210`) with `Company Incorporation`.
2. **Verification:**
   - Unique `CL001` generated.
   - Initial service `SRV001` created.
   - Initial stages appended in `ServiceStages`.
   - Temporary password generated & hashed; welcome email dispatched.
3. **Action:** Admin submits onboarding for `rahul@abctech.com` with `GST Registration`.
4. **Verification:**
   - System detects existing client by email.
   - **NO second client account or login is created.**
   - New service `SRV002` is linked under `CL001`.
   - `CL001` logs in once and views BOTH `SRV001` and `SRV002`.

### INT-02: First Login & Mandatory Password Reset Flow
1. **Action:** Client logs in using temporary password.
2. **Verification:**
   - Server returns `{ firstLogin: true }`.
   - Client API requests (e.g. `getClientDashboard`) are intercepted with `FIRST_LOGIN_REQUIRED` until password change occurs.
3. **Action:** Client submits `changePassword` with `LegalSthal@2026`.
4. **Verification:**
   - New hash saved, `first_login` updated to `FALSE`.
   - Dashboard access enabled.

### INT-03: Stage Progression & Audit Trail Recording
1. **Action:** Admin updates `SRV001` from `Document Verification` to `DSC Creation`.
2. **Verification:**
   - `Services` row updated with new stage name and calculated progress percentage.
   - A new record is inserted into `StageHistory` with `changed_by: "ADM001"`, timestamp, and remarks.
   - A `STAGE_UPDATED` entry is recorded in `AuditLogs`.
   - Stage update notification email is dispatched to client.

### INT-04: Document Rejection & Resubmission Workflow
1. **Action:** Admin marks `DOC003` (Address Proof) as `Rejected` with reason *"Electricity bill is older than 2 months"*.
2. **Verification:**
   - Document status in `Documents` tab set to `Rejected`.
   - `rejection_reason` populated.
   - Client receives email with specific rejection remarks and re-upload link.
   - Client submits replacement document via prefilled form URL.
   - Document status switches to `Under Review`.

---

## 3. Manual QA Test Cases (AUTH-MAN Matrix)

| Test ID | Objective | Preconditions | Execution Steps | Expected Result | Pass/Fail | Evidence / Log |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-MAN-001** | New client onboarding | Admin logged in | Admin fills client onboarding form with fresh email & phone. | Client created with ID `CL...`, service attached, welcome email received with temp credentials. | Pending Execution | AuditLog `CLIENT_CREATED` |
| **AUTH-MAN-002** | Duplicate email rejection | `rahul@example.com` exists | Admin submits onboarding with `rahul@example.com`. | System prompts: "Existing client found. Service attached to CL001." No new user created. | Pending Execution | Sheet row inspection |
| **AUTH-MAN-003** | Duplicate mobile rejection | Phone `+919876543210` exists | Admin submits onboarding with same phone and different email. | System identifies matching customer by phone and prevents duplicate account. | Pending Execution | Sheet row inspection |
| **AUTH-MAN-004** | Credential email delivery | Email service configured | New client created. | Welcome email arrives in inbox with login ID and temporary password. | Pending Execution | Gmail Sent items |
| **AUTH-MAN-005** | Correct client login | Active account | Enter registered email & correct password. | Successfully authenticated, token stored, redirected to client dashboard. | Pending Execution | `Sessions` tab entry |
| **AUTH-MAN-006** | Wrong password rejection | Active account | Enter wrong password. | Error: "Invalid login credentials." Counter increments. | Pending Execution | `failed_attempts = 1` |
| **AUTH-MAN-007** | Repeated failed logins | Active account | Enter 4 incorrect passwords consecutively. | System displays remaining attempts warning. | Pending Execution | `failed_attempts = 4` |
| **AUTH-MAN-008** | Account lockout | Active account | Enter 5th incorrect password. | Error: "Account is temporarily locked. Try again in 15 minutes." | Pending Execution | `locked_until` set in DB |
| **AUTH-MAN-009** | First login enforcement | New client account | Log in with temp credentials. | Modal/view forces user to set a new password. Cannot navigate away. | Pending Execution | UI routing intercept |
| **AUTH-MAN-010** | Password change | `first_login: true` | Enter complex new password. | Success message. User redirected to dashboard. | Pending Execution | `first_login: false` |
| **AUTH-MAN-011** | Weak password rejection | Change password form | Enter `12345678`. | Client-side and server-side validation error displayed. | Pending Execution | HTTP 400 response |
| **AUTH-MAN-012** | Explicit logout | Active session | Click "Logout". | Session token revoked on server. Cannot reuse token. | Pending Execution | `Sessions.status = REVOKED` |
| **AUTH-MAN-013** | Session timeout | Active session | Wait 61 minutes or modify DB `expires_at`. | Next API call returns `AUTH_SESSION_EXPIRED`. User redirected to login. | Pending Execution | HTTP 401 response |
| **AUTH-MAN-014** | Forgot password flow | Registered client | Click "Forgot Password" and enter email. | Generic success notice. Password reset link arrives in inbox. | Pending Execution | `PasswordResets` row |
| **AUTH-MAN-015** | Expired reset link | Reset token created | Attempt reset after 31 minutes. | Error: "Reset link has expired. Please request a new one." | Pending Execution | HTTP 400 response |
| **AUTH-MAN-016** | Used reset link reuse | Reset link used | Open same reset link a second time. | Error: "This reset link has already been used." | Pending Execution | `used = TRUE` check |
| **AUTH-MAN-017** | IDOR Service access | Logged in as CL001 | Send POST `getServiceDetails` with `service_id: "SRV004"` (CL002). | Error: `403 FORBIDDEN (IDOR_VIOLATION)`. Zero data leaked. | Pending Execution | Security audit event |
| **AUTH-MAN-018** | Client ID manipulation | Logged in as CL001 | Pass manipulated `client_id: "CL002"` in payload. | Backend ignores parameter and extracts `client_id` from token. | Pending Execution | Response returns CL001 data |
| **AUTH-MAN-019** | Admin role authorization| Logged in as Client | Call admin action `verifyDocument`. | Error: `403 FORBIDDEN (AUTH_FORBIDDEN)`. | Pending Execution | Security audit event |
| **AUTH-MAN-020** | Role escalation attempt| Logged in as Team Member | Attempt to access `getSyncLogs` (Super Admin). | Error: `403 FORBIDDEN`. | Pending Execution | Security audit event |

---

## 4. Security & Penetration Testing

1. **Insecure Direct Object References (IDOR):**
   - Explicitly verify that client session `CL001` cannot read services, documents, payment history, or quotes belonging to `CL002`.
2. **Token Injection & Replay:**
   - Attempt to call protected endpoints with revoked or malformed tokens.
3. **Brute Force Defense:**
   - Verify that automated dictionary attacks on `login` halt at 5 attempts and do not reveal whether an email exists in the database.
4. **Data Leakage in Public Drive Links:**
   - Ensure document uploads are not accessible to public web searches or external users without explicit authorization.
5. **Secrets Exposure:**
   - Verify that Google Sheet IDs, Zoho API Client Secrets, and password hashes are never present in client-facing JavaScript bundles.

---

## 5. Production Smoke Test Checklist

Execute immediately following deployment of the new backend:
- [ ] Apps Script `healthCheck` returns `status: "Online"`.
- [ ] Admin login succeeds and returns valid session token.
- [ ] Client login succeeds with test user (`CL001`).
- [ ] Client dashboard fetches real services and metrics.
- [ ] Document preview displays Drive file without permission error.
- [ ] Service stage update increments progress percentage and records stage history row.
- [ ] Test email arrives in inbox with proper HTML layout and branding.
- [ ] Zoho CRM test sync updates deal status without 4xx/5xx errors.
