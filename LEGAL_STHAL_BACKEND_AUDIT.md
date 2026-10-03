# 🏛️ Legal Sthal Client + Admin Portal — Backend Audit & Gap Analysis

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Auditor:** Senior Backend Architecture Engineer  
**Scope:** Existing Google Apps Script Backend (`backend/Code.gs`), Google Sheets Data Layer, Google Drive Integration, Google Forms Handler, Frontend Services Layer (`js/services/*`), Authentication & Security Controls.

---

## 1. Executive Summary

A comprehensive architectural and security audit of the **Legal Sthal Client + Admin Portal** was performed across the Apps Script backend codebase, the spreadsheet database schema, and frontend API interaction patterns.

The current system exists as a functional **v2.0 prototype** designed primarily for demonstration and initial workflow validation. While the baseline spreadsheet setup and standard REST scaffolding (`doGet`/`doPost`) are present, the current codebase **does not meet production MVP criteria** regarding security, multi-service client identity, stateful session authorization, audit history, or external CRM integration.

### Key Audit Findings:
1. **Critical Security Gap in Authentication:** Passwords are stored in plaintext (`Clients` tab, "Password" column) with a default fallback of `"password123"`. There is no password hashing, salting, session generation, lockout mechanism, or token verification.
2. **Missing Server-Side Authorization (IDOR):** Endpoints accept arbitrary query/body parameters (`clientId`, `serviceId`) without validating whether the authenticated user owns or has operational authority over that record.
3. **Absence of Zoho CRM Integration:** No Zoho CRM synchronization logic or API connectors exist in `Code.gs`.
4. **Google Form Routing Flaw:** Form submissions (`onFormSubmit`) hardcode destination `serviceId` to `"SRV001"` without dynamic lookup.
5. **No Concurrency Control:** ID generation is calculated via `sheet.getLastRow()` without `LockService`, leading to race conditions and duplicate primary keys under concurrent requests.
6. **Destructive Stage Progression:** Stage changes in `Services` overwrite the current stage index without generating persistent historical records in an audit/stage history table.

---

## 2. Inventory of Existing Code Artifacts

### 2.1 Backend Files
| File Path | Lines | Size | Purpose / Current State |
| :--- | :--- | :--- | :--- |
| `backend/Code.gs` | 578 | ~19.3 KB | Monolithic Apps Script containing configuration, schema setup, `doGet`, `doPost`, handlers, email dispatch, and audit logging. |
| `backend/appsscript.json` | 17 | 432 B | V8 runtime manifest, OAuth scopes for Spreadsheets, Drive, Script Mail, and Forms. Web app configured as `USER_DEPLOYING` with access `ANYONE`. |
| `backend/README.md` | 95 | ~4.1 KB | Deployment instructions for Google Sheets and Google Apps Script. |

### 2.2 Frontend API & Data Layer Files
| File Path | Lines | Status & Role |
| :--- | :--- | :--- |
| `js/services/apiClient.js` | 108 | REST bridge configured with `GET` and `POST` helpers using `Content-Type: text/plain` (Apps Script CORS workaround). Currently only actively triggered by Settings test connection. |
| `js/services/authService.js` | 132 | Client-side mock authentication utilizing `localStorage`/`sessionStorage`. Hardcodes default client `CL001` and admin bypass. |
| `js/services/dataStore.js` | 518 | In-memory reactive state manager with `localStorage` persistence. |
| `js/services/clientService.js` | 69 | Abstraction layer for client queries and client creation. |
| `js/services/serviceService.js` | 76 | Abstraction layer for services, stages, and 31-service catalog. |
| `js/services/documentService.js` | 29 | Abstraction layer for document verification/rejection. |
| `js/services/paymentService.js` | 60 | Payment calculation and transaction retrieval. |
| `js/services/spocService.js` | 21 | SPOC directory and assignment abstraction. |
| `js/services/quoteService.js` | 25 | Quote request submission and status tracking. |
| `js/services/crmSyncService.js` | 17 | Zoho CRM sync log abstraction. |
| `js/services/notificationService.js` | 13 | Notification event retrieval. |

---

## 3. Function-by-Function Backend Audit (`backend/Code.gs`)

| Function Name | Lines | Purpose | Security & Logic Deficiencies |
| :--- | :--- | :--- | :--- |
| `getSpreadsheet()` | 23–29 | Resolves active or property-stored spreadsheet. | Reads `SPREADSHEET_ID` property; falls back to `getActiveSpreadsheet()`. Safe. |
| `getDriveFolder()` | 34–50 | Resolves or creates document storage folder in Google Drive. | Creates folder named `LegalSthal_Client_Documents`. Stores ID in script properties. Safe. |
| `setupDatabaseSheets()` | 58–95 | Initializes 8 database tabs with header rows and styling. | Creates tabs if missing, styles header `#0b1325`/`#D4AF37`. **Deficiency:** Lacks `Sessions`, `AdminUsers`, `PasswordResets`, `StageHistory`, `CRMSyncLogs`. |
| `doGet(e)` | 104–178 | HTTP GET REST API Router. | **Deficiency:** No authentication token check; public access to client records; does not verify role or ownership. |
| `doPost(e)` | 183–241 | HTTP POST REST API Router. | **Deficiency:** Parses body without verifying caller session or sanitizing payload inputs. |
| `handleCreateClient(data)` | 247–287 | Registers new client and appends row to `Clients`. | **Deficiency:** Checks email duplicate only (ignores mobile duplicate); stores plaintext password; no `LockService`; ID generated from `getLastRow()`. |
| `handleCreateService(clientId, data)` | 289–340 | Appends new service to `Services` and 4 default stages to `ServiceStages`. | **Deficiency:** No `LockService`; hardcodes default 4 stages regardless of service type (e.g. Company Incorporation vs GST vs Startup India). |
| `handleUpdateServiceStage(serviceId, stageIndex)` | 342–370 | Modifies current stage index and progress in `Services`. | **Deficiency:** Overwrites stage index; does not create an audit/history record in a history tab; hardcodes 4 total stages. |
| `handleUploadDocument(serviceId, documentName, fileBase64, mimeType)` | 372–396 | Decodes base64 file, saves to Drive, appends row to `Documents`. | **Deficiency:** Sets file sharing to `ANYONE_WITH_LINK` (serious privacy breach for KYC/PAN/Aadhaar); generates ID with `Date.getTime()`. |
| `handleVerifyDocument(serviceId, docId)` | 398–409 | Marks document as "Verified". | **Deficiency:** No caller verification (any unauthenticated actor can verify documents). |
| `handleRejectDocument(serviceId, docId, reason)` | 411–422 | Marks document as "Rejected" and writes reason. | **Deficiency:** No caller verification; no notification trigger to client. |
| `handleCreateQuoteRequest(quoteData)` | 424–454 | Creates quote inquiry and sends plain text email to admin. | **Deficiency:** No phone/email normalization or input sanitization. |
| `handleUpdateQuoteStatus(quoteId, status, amount, remarks)` | 456–468 | Updates quote status, amount, remarks. | **Deficiency:** Unauthenticated write access. |
| `onFormSubmit(e)` | 477–511 | Triggered on Google Form submission. | **Deficiency:** Hardcodes target service to `"SRV001"`; cannot correlate submission with dynamic client/service ID. |
| `getSheet(sheetName)` | 517–525 | Helper to retrieve sheet by name. | Auto-invokes `setupDatabaseSheets()` if sheet is missing. Functional. |
| `getSheetDataAsObjects(sheetName)` | 527–544 | Reads sheet rows into array of JavaScript objects. | Reads entire sheet into memory on every invocation. Unoptimized for larger tables. |
| `sendEmail(recipient, subject, body)` | 546–554 | Wraps `MailApp.sendEmail`. | Plain-text only; no HTML templates; no retry/error classification. |
| `logAudit(action, entityId, details)` | 556–567 | Appends entry to `AuditLogs`. | Lacks `actor_id`, `actor_role`, IP/request context, and standardized schema. |
| `padZero(num, size)` | 569–573 | Zero-pads numbers for ID strings. | Functional. |
| `formatDate(date)` | 575–577 | Formats date to `dd MMM yyyy`. | Uses `CONFIG.DEFAULT_TIMEZONE` ("Asia/Kolkata"). Functional. |

---

## 4. Current API Route Analysis

### 4.1 GET Endpoints (`doGet`)
| Action | Parameters | Expected Role | Current Behavior | Flaw / Vulnerability |
| :--- | :--- | :--- | :--- | :--- |
| `healthCheck` | None | Public | Returns engine status JSON | None (intended behavior) |
| `getClients` | None | Admin | Returns all rows from `Clients` | **CRITICAL:** Accessible publicly without authentication. Exposes all client emails, mobiles, and plaintext passwords. |
| `getServices` | `clientId` (optional) | Client / Admin | Returns filtered or all services | **CRITICAL:** Any caller can pass `?clientId=CL002` to dump another company's active services. |
| `getServiceDetails` | `serviceId` | Client / Admin | Returns service, stages, documents | **CRITICAL:** No check if caller owns `serviceId`. |
| `getQuoteRequests` | `clientId` (optional) | Client / Admin | Returns quotes | **CRITICAL:** Unauthenticated public read. |
| `getDocuments` | `serviceId` (optional) | Client / Admin | Returns document rows | **CRITICAL:** Returns Drive URLs for all client documents publicly. |

### 4.2 POST Endpoints (`doPost`)
| Action | Expected Role | Current Behavior | Flaw / Vulnerability |
| :--- | :--- | :--- | :--- |
| `createClient` | Admin | Appends new client row | No admin session verification; stores plaintext password. |
| `createService` | Admin | Appends new service & default stages | No admin session verification; hardcodes generic stages. |
| `updateServiceStage` | Admin | Updates stage index & progress % | No admin session verification; overwrites without history. |
| `uploadDocument` | Client | Creates Drive file & document row | Sets Drive file to public link; no client ownership verification. |
| `verifyDocument` | Admin | Sets status to "Verified" | Unauthenticated write. |
| `rejectDocument` | Admin | Sets status to "Rejected" & reason | Unauthenticated write. |
| `createQuoteRequest` | Client / Public | Creates quote row & sends admin email | No rate limiting; unauthenticated. |
| `updateQuoteStatus` | Admin | Updates quote status & pricing | Unauthenticated write. |

---

## 5. Sheet Tab & Column Audit vs Target Requirements

| Tab Name | Current Existence | Current Column Headers | Required Columns (BRD MVP) | Status / Missing Columns |
| :--- | :--- | :--- | :--- | :--- |
| **`Clients`** | Exists | `Client ID`, `Company Name`, `Contact Person`, `Email`, `Mobile`, `State`, `Address`, `GSTIN`, `Password`, `Created At`, `Status` | `client_id`, `name`, `contact_name`, `email`, `mobile`, `login_id`, `password_hash`, `password_salt`, `first_login`, `status`, `failed_attempts`, `locked_until`, `last_login`, `created_at`, `updated_at`, `password_changed_at` | **MISMATCH:** Missing `login_id`, `password_hash`, `password_salt`, `first_login`, `failed_attempts`, `locked_until`, `last_login`, `updated_at`. Plaintext `Password` must be migrated. |
| **`Services`** | Exists | `Service ID`, `Client ID`, `Service Code`, `Service Type`, `Company Type`, `State`, `Status`, `Current Stage Index`, `Progress %`, `SPOC ID`, `Total Amount`, `Paid Amount`, `Remaining Amount`, `Created At`, `Completed On`, `Certificate URL` | `service_id`, `client_id`, `crm_deal_id`, `service_name`, `company_type`, `state`, `total_amount`, `paid_amount`, `remaining_amount`, `dsc_count`, `current_stage`, `status`, `spoc_id`, `created_at`, `updated_at` | **MISMATCH:** Missing `crm_deal_id`, `dsc_count`, `current_stage` name, `updated_at`. |
| **`ServiceStages`** | Exists | `Stage ID`, `Service ID`, `Stage Name`, `Stage Status`, `Completed On`, `Description`, `Sequence Order` | Defines template stages per service. | Functional as active stage tracking, but needs workflow template coordination. |
| **`StageHistory`** | **MISSING** | *None* | `stage_history_id`, `service_id`, `stage_name`, `status`, `changed_by`, `changed_by_role`, `changed_at`, `remarks` | **CRITICAL:** Missing. Required for audit trail of stage transitions. |
| **`Documents`** | Exists | `Document ID`, `Service ID`, `Document Name`, `Status`, `Submitted On`, `Rejection Reason`, `Required`, `Drive File URL` | `document_id`, `service_id`, `client_id`, `document_type`, `form_response_id`, `file_name`, `file_url`, `drive_file_id`, `status`, `remark`, `uploaded_at`, `verified_at`, `verified_by`, `rejected_at`, `rejected_by` | **MISMATCH:** Missing `client_id`, `document_type`, `drive_file_id`, `verified_by`, `rejected_by`, `verified_at`, `rejected_at`. |
| **`SPOCs`** | Exists | `SPOC ID`, `Name`, `Title`, `Mobile`, `Email`, `Assigned Clients`, `Status`, `Avatar URL` | `spoc_id`, `name`, `email`, `mobile`, `status`, `created_at`, `updated_at` | Matches logical model with minor header naming differences. |
| **`AdminUsers`** | **MISSING** | *None* | `admin_id`, `name`, `email`, `password_hash`, `password_salt`, `role`, `status`, `failed_attempts`, `locked_until`, `last_login`, `created_at`, `updated_at` | **CRITICAL:** Missing. No admin table exists. |
| **`Sessions`** | **MISSING** | *None* | `session_id`, `token_hash`, `user_id`, `role`, `client_id`, `created_at`, `expires_at`, `last_activity`, `status` | **CRITICAL:** Missing. No session verification table exists. |
| **`PasswordResets`**| **MISSING** | *None* | `reset_id`, `user_id`, `token_hash`, `created_at`, `expires_at`, `used`, `used_at` | **CRITICAL:** Missing. Password reset workflow impossible. |
| **`QuoteRequests`** | Exists | `Request ID`, `Client ID`, `Client Name`, `Service Name`, `Company Type`, `State`, `Mobile`, `Email`, `Requested On`, `Status`, `Quote Amount`, `Remarks` | `request_id`, `client_id`, `client_name`, `service_name`, `company_type`, `state`, `mobile`, `email`, `requested_on`, `status`, `quote_amount`, `remarks` | Matches requirement. |
| **`Notifications`**| Exists | `Notification ID`, `Client ID`, `Client Name`, `Event Type`, `Details`, `Channel`, `Date`, `Status` | `notification_id`, `client_id`, `client_name`, `event_type`, `details`, `channel`, `date`, `status` | Matches requirement. |
| **`AuditLogs`** | Exists | `Log ID`, `Timestamp`, `Action`, `Performed By`, `Details JSON` | `log_id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `timestamp`, `ip_or_request_metadata`, `details` | **MISMATCH:** Current schema lacks `actor_id`, `actor_role`, `entity_type`. |
| **`CRMSyncLogs`** | **MISSING** | *None* | `sync_id`, `entity_type`, `entity_id`, `crm_id`, `operation`, `status`, `attempt_count`, `last_error`, `synced_at` | **CRITICAL:** Missing. Required for Zoho CRM retry & sync audit. |

---

## 6. Functional Area Gap Breakdown

### 6.1 Authentication & Authorization
- **Current State:** The backend has zero authentication logic. The frontend `authService.js` simulates login by searching local arrays and accepting `password123`.
- **Target Requirement:**
  - Salted PBKDF2/SHA-256 password hashing.
  - Opaque random tokens stored hashed (`token_hash`) in `Sessions` sheet with 60-minute TTL.
  - Role-based authorization (`SUPER_ADMIN`, `ADMIN`, `TEAM_MEMBER`, `CLIENT`).
  - Mandatory `first_login` flag forcing password change on initial login.
  - Brute-force lockout (5 failed attempts = 15-minute temporary lockout).
  - Cross-client IDOR protection: client identity derived strictly from session, never from request payload.

### 6.2 Client Lifecycle & Multi-Service Business Rule
- **Current State:** `handleCreateClient` only checks email duplicate. It does not check mobile number normalization. If an existing client buys another service, the admin has to manually know not to create a duplicate account.
- **Target Requirement:**
  - Strict normalization: email `trim().toLowerCase()`, mobile sanitized (removing `+91`, spaces, hyphens).
  - Duplicate detection by both email AND mobile.
  - If existing client found: return `isExisting: true`, `clientId`, and attach new service under that existing `client_id`. **NEVER create duplicate login accounts**.

### 6.3 Service Workflow & Stage Progression
- **Current State:** `handleCreateService` instantiates 4 generic hardcoded stages for all services. `handleUpdateServiceStage` merely overwrites row index in `Services`.
- **Target Requirement:**
  - Service-specific workflows:
    - **Company Incorporation:** RUN → Document Verify → DSC Creation → MCA Form Preparation → MCA Form Upload → Waiting for Approval.
    - **GST Registration:** Document Collection → Application Drafting & Filing → Department Verification → GSTIN Generation.
    - **MSME Registration:** Data Verification → Portal Application Submission → Certificate Issuance.
    - **Startup India:** Company DSC Creation → Form Prepared → Waiting for Approval.
    - **Compliances:** Configurable template stages.
  - Every stage change must record an entry in `StageHistory` with `changed_by`, `changed_by_role`, `changed_at`, and `remarks`.

### 6.4 Document Workflow & Google Forms
- **Current State:**
  - `handleUploadDocument` makes Drive files public (`ANYONE_WITH_LINK`), creating compliance and data exposure risks.
  - `onFormSubmit(e)` hardcodes `SRV001`.
- **Target Requirement:**
  - Drive files must be private or shared only within domain/specific service account.
  - Backend must generate prefilled Google Form URLs containing encoded/pre-filled `client_id` and `service_id`.
  - `onFormSubmit` parses metadata fields to correlate documents with the correct `service_id` and `client_id`.
  - Rejection workflow must store `remark`, update status to `REJECTED`, and trigger client notification.

### 6.5 Zoho CRM Integration
- **Current State:** Absent from Apps Script. Only mock data in frontend.
- **Target Requirement:**
  - Dedicated `ZohoService.gs` module.
  - OAuth 2.0 / Refresh Token integration via Apps Script Properties (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`).
  - Bidirectional sync: deals, payment amounts, and stage progression.
  - Sync failure logging in `CRMSyncLogs` with retry endpoint.

### 6.6 Email Notification Gateway
- **Current State:** Raw `MailApp.sendEmail` with inline string concatenation for 2 scenarios.
- **Target Requirement:**
  - Centralized `EmailService.gs` module with branded HTML templates for:
    - Welcome & Temporary Credentials (`sendWelcomeCredentials`)
    - Password Reset Request (`sendPasswordResetEmail`)
    - Service Stage Update (`sendStageChangeEmail`)
    - Document Rejection with Reason (`sendDocumentRejectedEmail`)
    - Payment Receipt Confirmation (`sendPaymentReceivedEmail`)
    - Quote Request Confirmation (`sendQuoteRequestConfirmation`)

---

## 7. Migration & Non-Destructive Modernization Plan

To avoid breaking existing data or operations during deployment, the following migration sequence must be followed:

```text
STEP 1: Schema Migration (Idempotent)
  ├── Detect existing sheets and preserve all existing rows
  ├── Add missing columns to Clients, Services, Documents, AuditLogs
  ├── Create new sheets: Sessions, AdminUsers, PasswordResets, StageHistory, CRMSyncLogs
  └── Seed initial default Admin user (if AdminUsers is empty)

STEP 2: Core Utility & Security Layer
  ├── Config.gs: centralized configuration and script properties
  ├── SecurityService.gs: SHA-256 / PBKDF2 hashing, token generation, input validation
  ├── SheetRepository.gs: header-based column mapping & LockService protection
  └── AuditService.gs: structured system auditing

STEP 3: Authentication & Session Engine
  ├── AuthService.gs: login, session validation, logout, lockout, password reset
  └── Router.gs: token extraction, role verification, IDOR defense

STEP 4: Business Domains
  ├── ClientService.gs (Client creation & multi-service attachment)
  ├── ServiceService.gs (Stage templates & StageHistory recording)
  ├── DocumentService.gs (Google Form integration & Drive vault)
  ├── EmailService.gs (Centralized HTML notification templates)
  └── ZohoService.gs (CRM sync & error retry queue)

STEP 5: Testing & Verification
  ├── Tests.gs (Automated unit tests executable directly inside Apps Script)
  └── Frontend Bridge Validation (Connecting Netlify frontend to live API)
```

This plan guarantees 100% data preservation while elevating the backend from a prototype to a secure, enterprise-grade production MVP.
