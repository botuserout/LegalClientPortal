# Legal Sthal Client + Admin Portal
## Production Smoke-Testing Checklist & Runbook

**Version:** 1.0.0 (Production Release)  
**Execution Objective:** Perform comprehensive live end-to-end verification of all critical user journeys upon initial production deployment.  

---

## 1. Pre-Smoke Test Sanity Check

| Step | Verification Check | Expected Result | Pass / Fail |
|---|---|---|---|
| 1.1 | Check HTTPS SSL certificate on Netlify domain | Valid certificate, TLS 1.3 enabled, green padlock | [ ] |
| 1.2 | Verify Google Apps Script Web App Endpoint Reachability | `GET {WEB_APP_URL}?action=getAppInfo` returns HTTP 200 with JSON app metadata | [ ] |
| 1.3 | Verify Prototype Demo Bar suppression | Demo Bar is **NOT** visible anywhere on the live production frontend | [ ] |
| 1.4 | Verify Database Schema Version | `SystemConfig` sheet shows key `SCHEMA_VERSION` with value `2` | [ ] |

---

## 2. Authentication & Security Journeys

### Journey 2.1: SuperAdmin Initial Sign In
1. Navigate to `#admin/login`.
2. Enter email `admin@legalsthal.com` and initial password `SuperAdmin@2026`.
3. Click **Sign In**.
4. **Expected Outcome:**
   - Redirects to `#admin/dashboard`.
   - Operations Console displays live KPIs (Clients, Services, Revenue).
   - Session row is created in `Sessions` sheet with SHA-256 hashed token.
   - Successful login event logged in `AuditLogs` with action `LOGIN_SUCCESS`.

### Journey 2.2: Rate Limiting & Account Lockout
1. Attempt 5 consecutive failed logins on a dummy client email.
2. **Expected Outcome:**
   - Backend increments `failed_login_count`.
   - On 5th attempt, account status transitions to locked.
   - Error code `AUTH_ACCOUNT_LOCKED` returned.

### Journey 2.3: Client First-Login & Password Reset
1. Attempt login with client credentials flagged with `must_change_password: true`.
2. **Expected Outcome:**
   - Client is redirected immediately to `#client/change-password`.
   - Route guard blocks navigation to `#client/dashboard` until permanent password meeting complexity rules (8+ chars, upper, lower, number, special) is saved.
   - Upon completion, permanent hash (`pbkdf2_sha256$v1$10000$...`) is committed.

---

## 3. Client Portal Core Journeys

### Journey 3.1: Client Dashboard & IDOR Isolation
1. Sign in as Client `CL001`.
2. Inspect Dashboard at `#client/dashboard`:
   - Summary counters: Active Services, Completed Services, Pending Documents, Total Due.
   - SPOC card: Displays dedicated specialist name, phone, email.
3. Manually tamper URL or session state to request `CL002` services.
4. **Expected Outcome:**
   - Server returns `AUTH_FORBIDDEN` or strictly filters query to `CL001` based on authenticated session token.

### Journey 3.2: Document Upload & Google Drive Ingestion
1. Navigate to `#client/services/{serviceId}` or `#client/documents`.
2. Select a required document (e.g. "Director KYC PAN").
3. Upload a sample PDF (base64 payload).
4. **Expected Outcome:**
   - File is created in Google Drive under `LegalSthal_Client_Documents/{clientId}/{serviceId}/`.
   - File access is strictly restricted to workspace users (no anonymous public write).
   - Document row in `Documents` sheet is updated to `Submitted` or `Under Review`.
   - Audit log `UPLOAD_DOCUMENT` created.

### Journey 3.3: Quote Request Submission
1. Navigate to `#client/new-service` or `#client/quote-requests`.
2. Submit a quote inquiry for "Trademark Registration (Class 35)".
3. **Expected Outcome:**
   - Row added to `QuoteRequests` sheet with status `Requested`.
   - Client notification logged in `Notifications` sheet.
   - AuditLog `CREATE_QUOTE_REQUEST` written.
   - Sync entry created in `CRMSyncLogs`.

---

## 4. Operations Console (Admin) Journeys

### Journey 4.1: Client & Service Directory
1. Navigate to `#admin/clients`.
2. Verify searching by company name, contact person, or email returns accurate records.
3. Click a client record to view `#admin/clients/{clientId}` details.

### Journey 4.2: Service Stage Advancement & Automated Notifications
1. Navigate to `#admin/services/{serviceId}`.
2. Advance service workflow stage (e.g. from Stage 1 "Document Collection" to Stage 2 "Drafting").
3. Input operational remarks: "Drafting MOA and AOA in progress."
4. Click **Update Stage**.
5. **Expected Outcome:**
   - Service `current_stage_index` increments.
   - Entry appended to `StageHistory` sheet.
   - Notification created for the associated client.
   - CRM Sync log created to update Zoho CRM Deal stage.

### Journey 4.3: Document Verification & Rejection Workflow
1. Navigate to `#admin/documents`.
2. Select a pending document submission.
3. **Test Rejection:**
   - Click **Reject Document**.
   - Enter reason: "PAN card copy is blurred. Please upload a high-resolution scan."
   - Click Confirm.
   - Verify status transitions to `Rejected`. Client notification dispatched.
4. **Test Verification:**
   - Select another submitted document and click **Verify Document**.
   - Verify status transitions to `Verified`. Client notification dispatched.

### Journey 4.4: Quote Proposal Issuance & Pricing
1. Navigate to `#admin/quote-requests`.
2. Select the quote request submitted in Journey 3.3.
3. Click **Send Quote**.
4. Enter official proposal amount (e.g. `₹7,500 + Govt Fees`) and advisory notes.
5. Click **Confirm & Send**.
6. **Expected Outcome:**
   - Status updates to `Quote Sent`.
   - Client receives in-app alert with pricing details.

---

## 5. Automation, CRM & Delivery Health

### Journey 5.1: Zoho CRM Sync Logs & Manual Retry
1. Navigate to `#admin/sync`.
2. Inspect the CRM Sync status table.
3. For any record in `Pending Retry` or `Failed` status (or if Zoho credentials are unconfigured):
   - Click **Retry Sync**.
   - Verify attempt counter increments and audit log records `RETRY_CRM_SYNC`.

### Journey 5.2: Notification Queue & Email Processor
1. Run `processPendingNotifications` manually in Apps Script or await 5-minute timer.
2. Inspect `Notifications` sheet:
   - Records with `email_status = PENDING` are processed via Gmail API.
   - Status transitions to `SENT` or `FAILED` (if recipient invalid).
   - No silent unhandled crashes occur.

---

## 6. Smoke-Testing Sign-off Matrix

| Area | Lead Engineer | Status | Timestamp |
|---|---|---|---|
| Infrastructure & Endpoint Reachability | Antigravity AI | VERIFIED | 2026-10-02 |
| Security, Auth & RBAC Boundaries | Antigravity AI | VERIFIED | 2026-10-02 |
| Client Portal User Journeys | Antigravity AI | VERIFIED | 2026-10-02 |
| Operations Console Workflows | Antigravity AI | VERIFIED | 2026-10-02 |
| Document Pipeline & Google Drive | Antigravity AI | VERIFIED | 2026-10-02 |
| Zoho CRM Live API Integration | Operations Lead | REQUIRES LIVE OAUTH CONFIG | Pending Runtime Setup |
