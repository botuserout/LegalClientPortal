# 📡 Legal Sthal REST API Specification (Apps Script Web App)

**Document Version:** 1.0.0  
**Transport Protocol:** HTTPS  
**Base URL:** `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`  
**Content-Type:** `text/plain;charset=utf-8` (Client POST payload to prevent CORS preflight OPTIONS in Apps Script)  
**Response Format:** `application/json`

---

## 1. Architectural & Protocol Conventions

### 1.1 Web App Dispatch Mechanism
Because Google Apps Script does not natively support HTTP `PUT`, `DELETE`, or `PATCH` from external browser clients, the API uses a unified, action-routed model:
* **HTTP `GET`:** Used for public status checks (`healthCheck`). All authenticated reads and state transitions use POST to ensure security tokens are transmitted in the request body rather than query strings (which can leak in proxy/browser logs).
* **HTTP `POST`:** Single entry point `doPost(e)` accepting a JSON body containing `{ action: string, token?: string, ...params }`.

### 1.2 Session Token Transmission
Protected endpoints require an opaque session bearer token passed in the request payload:
```json
{
  "action": "getClientDashboard",
  "token": "e8f0a1b2c3d4e5f6...",
  "payload": {}
}
```
The server computes `SHA-256(token)`, checks the `Sessions` tab for an `ACTIVE` status and `expires_at > NOW()`, and resolves `user_id` and `role`.

---

## 2. Standard API Response Structure

### 2.1 Success Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully.",
  "timestamp": "2026-10-01T15:00:00.000Z"
}
```

### 2.2 Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email/login ID or password."
  },
  "timestamp": "2026-10-01T15:00:00.000Z"
}
```

### 2.3 Standard Error Codes
| Error Code | HTTP Equiv | Description |
| :--- | :--- | :--- |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password combination did not match active records. |
| `AUTH_ACCOUNT_LOCKED` | 423 | Account temporarily locked due to 5 consecutive failed attempts. |
| `AUTH_SESSION_EXPIRED` | 401 | Session token expired (exceeded 60-minute duration) or not found. |
| `AUTH_UNAUTHORIZED` | 401 | Request missing valid session token. |
| `AUTH_FORBIDDEN` | 403 | Authenticated role has insufficient permissions for this operation. |
| `IDOR_VIOLATION` | 403 | Client attempted to access a service or document owned by another client. |
| `FIRST_LOGIN_REQUIRED` | 403 | Password change required before accessing platform features. |
| `CLIENT_NOT_FOUND` | 404 | Specified `client_id` does not exist. |
| `SERVICE_NOT_FOUND` | 404 | Specified `service_id` does not exist. |
| `DOCUMENT_NOT_FOUND` | 404 | Specified `document_id` does not exist. |
| `DUPLICATE_CLIENT` | 409 | A client with this email or mobile already exists. |
| `INVALID_STAGE` | 400 | Target stage transition is invalid for this service workflow. |
| `VALIDATION_ERROR` | 400 | Payload failed schema validation (e.g. invalid phone, weak password). |
| `ZOHO_SYNC_FAILED` | 502 | Upstream Zoho CRM API failed to process lead/deal synchronization. |
| `INTERNAL_ERROR` | 500 | Unhandled server exception (logged to AuditLogs without leaking traces). |

---

## 3. Master API Directory Table

| Action | Method | Auth Required | Authorized Roles | Input Summary | Primary Output |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `healthCheck` | GET | No | Public | None | Engine status & timestamp |
| `login` | POST | No | Public | `login_id`, `password` | User info, session `token`, `first_login` |
| `logout` | POST | Yes | All | `token` | Confirmation, session revoked |
| `changePassword` | POST | Yes | All | `current_password`, `new_password` | Status, first_login set to false |
| `requestPasswordReset` | POST | No | Public | `email` | Generic success message (no account leakage) |
| `resetPassword` | POST | No | Public | `reset_token`, `new_password` | Confirmation |
| `getMe` | POST | Yes | All | None | Safe user profile of authenticated caller |
| `getClientDashboard`| POST | Yes | Client | None | Aggregated metrics, active services, alerts |
| `getClientServices` | POST | Yes | Client | None | List of services owned by this client |
| `getServiceDetails` | POST | Yes | Client, Admin | `service_id` | Service record, stages, documents, SPOC |
| `getStageHistory` | POST | Yes | Client, Admin | `service_id` | Historical audit log of stage changes |
| `getDocuments` | POST | Yes | Client, Admin | `service_id` | Document requirements & review statuses |
| `getPayments` | POST | Yes | Client, Admin | `service_id` or None | Billing totals, payments, and balances |
| `getSpoc` | POST | Yes | Client | `spoc_id` | Assigned expert contact information |
| `getQuoteRequests` | POST | Yes | Client, Admin | None | Inquiries submitted by client (or all for admin) |
| `requestQuote` | POST | Yes | Client | `service_name`, `company_type`, `state` | Created `request_id` |
| `generateDocumentFormUrl`| POST| Yes| Client, Admin | `service_id` | Prefilled Google Form submission URL |
| `createClient` | POST | Yes | Admin | `companyName`, `email`, `mobile`, `serviceData` | New client ID or attached to existing ID |
| `getClients` | POST | Yes | Admin | Filters / search term | List of client accounts |
| `getClient` | POST | Yes | Admin | `client_id` | Client profile, associated services, metrics |
| `addService` | POST | Yes | Admin | `client_id`, `serviceData` | Created service ID & initialized stages |
| `updateService` | POST | Yes | Admin | `service_id`, update fields | Updated service record |
| `updateStage` | POST | Yes | Admin | `service_id`, `new_stage_name`, `remarks` | Stage update confirmation & history ID |
| `assignSpoc` | POST | Yes | Admin | `service_id`, `spoc_id` | Updated service assignment |
| `verifyDocument` | POST | Yes | Admin | `document_id` | Document status updated to "Verified" |
| `rejectDocument` | POST | Yes | Admin | `document_id`, `reason` | Document status updated to "Rejected" |
| `updateQuoteRequest`| POST | Yes | Admin | `request_id`, `status`, `amount`, `remarks` | Updated quote status |
| `getNotifications` | POST | Yes | Admin, Client | None | User or system notifications |
| `getSyncLogs` | POST | Yes | Super Admin | Filter status | Zoho CRM sync log entries |
| `retrySync` | POST | Yes | Super Admin | `sync_id` | Retry execution result |

---

## 4. Detailed Endpoint Specifications

### 4.1 Authentication & Session Endpoints

#### `POST login`
* **Description:** Authenticates a client or admin user, verifies password hash, checks lockout, and generates an active session.
* **Input Payload:**
```json
{
  "action": "login",
  "login_id": "rahul@example.com",
  "password": "Password@123"
}
```
* **Success Output (200):**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4e5f67890abcdef...",
    "user": {
      "userId": "CL001",
      "role": "CLIENT",
      "email": "rahul@example.com",
      "name": "ABC Technologies Pvt Ltd",
      "contactPerson": "Rahul Mehta",
      "firstLogin": false
    },
    "expiresAt": "2026-10-01T16:00:00.000Z"
  },
  "message": "Authentication successful."
}
```
* **Failure Responses:**
  - `AUTH_INVALID_CREDENTIALS`: "Invalid login credentials." (Failed attempts incremented).
  - `AUTH_ACCOUNT_LOCKED`: "Account is temporarily locked. Try again in 15 minutes."

---

#### `POST changePassword`
* **Description:** Updates the user's password, invalidates `first_login` flag, and records a password update audit entry.
* **Headers/Token:** Required.
* **Input Payload:**
```json
{
  "action": "changePassword",
  "token": "...",
  "current_password": "TemporaryPassword123",
  "new_password": "NewStrongPassword@2026"
}
```
* **Validation:** Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.

---

#### `POST requestPasswordReset`
* **Description:** Initiates a single-use password reset token and sends an email with a secure link.
* **Input Payload:**
```json
{
  "action": "requestPasswordReset",
  "email": "rahul@example.com"
}
```
* **Security Behavior:** Always returns `"If an account exists for this email, reset instructions have been sent."` regardless of whether the email was found. Prevents user enumeration.

---

### 4.2 Client Operations (Tenant-Isolated)

#### `POST getClientDashboard`
* **Description:** Retrieves all summary metrics, active services, pending document requests, and notifications strictly for the caller's authenticated `client_id`.
* **Input Payload:**
```json
{
  "action": "getClientDashboard",
  "token": "..."
}
```
* **Security Check:** Caller's `client_id` is derived exclusively from the verified session token in `Sessions`. It does not accept or trust any `clientId` parameter.

---

#### `POST getServiceDetails`
* **Description:** Fetches complete service record, workflow stages, and documents.
* **Input Payload:**
```json
{
  "action": "getServiceDetails",
  "token": "...",
  "service_id": "SRV001"
}
```
* **Authorization Policy (IDOR Protection):**
  - If caller is `CLIENT`: Server checks `service.client_id === session.client_id`. If they differ, returns `403 FORBIDDEN (IDOR_VIOLATION)`.
  - If caller is `ADMIN` or `SUPER_ADMIN`: Access granted.

---

#### `POST generateDocumentFormUrl`
* **Description:** Generates a Google Form URL prefilled with `client_id`, `service_id`, and client company name so that form submissions automatically attach to the correct record.
* **Input Payload:**
```json
{
  "action": "generateDocumentFormUrl",
  "token": "...",
  "service_id": "SRV001"
}
```
* **Output:**
```json
{
  "success": true,
  "data": {
    "formUrl": "https://docs.google.com/forms/d/e/.../viewform?entry.123=CL001&entry.456=SRV001"
  }
}
```

---

### 4.3 Admin Operations

#### `POST createClient`
* **Description:** Administrative endpoint to onboard a client and attach initial service(s).
* **Business Rule Enforcement:**
  1. Normalizes email (`trim().toLowerCase()`) and mobile (`sanitizePhone()`).
  2. Queries `Clients` tab for existing email OR mobile.
  3. **If existing client found:**
     - Skips account creation.
     - Attaches the new service to existing `client_id`.
     - Returns `{ isExisting: true, clientId: "CL001", attachedServiceId: "SRV004" }`.
  4. **If completely new client:**
     - Generates unique `client_id` (via `LockService`).
     - Generates temporary secure password.
     - Hashes password with random salt.
     - Creates `Clients` record with `first_login: TRUE`.
     - Attaches service and initializes workflow stages.
     - Dispatches welcome email with credentials via `EmailService`.
* **Input Payload:**
```json
{
  "action": "createClient",
  "token": "...",
  "clientData": {
    "companyName": "ABC Technologies Pvt Ltd",
    "contactPerson": "Rahul Mehta",
    "email": "rahul@example.com",
    "mobile": "+91 98765 43210",
    "state": "Gujarat",
    "serviceData": {
      "serviceType": "Company Incorporation",
      "companyType": "Private Limited",
      "totalAmount": 9999,
      "paidAmount": 499
    }
  }
}
```

---

#### `POST updateStage`
* **Description:** Advances or modifies the operational stage of a service, validates allowed transitions, and logs to `StageHistory`.
* **Input Payload:**
```json
{
  "action": "updateStage",
  "token": "...",
  "service_id": "SRV001",
  "new_stage_name": "MCA Form Preparation",
  "remarks": "DSC tokens generated successfully. Drafting SPICe+ Part B."
}
```
* **Server Logic:**
  1. Validates admin authorization (`SUPER_ADMIN` or `ADMIN`).
  2. Confirms `SRV001` exists.
  3. Verifies `new_stage_name` is an allowed stage for the service's workflow type.
  4. Updates `current_stage` in `Services`.
  5. Appends record to `StageHistory`.
  6. Dispatches stage update email to client via `EmailService`.
  7. Syncs stage change to Zoho CRM deal stage via `ZohoService`.
  8. Returns updated service record.

---

#### `POST verifyDocument` & `POST rejectDocument`
* **Description:** Document review workflow in the Admin Document Workspace.
* **Input Payload (`rejectDocument`):**
```json
{
  "action": "rejectDocument",
  "token": "...",
  "document_id": "DOC003",
  "reason": "Address proof image is blurry and utility bill is older than 2 months."
}
```
* **Server Logic:**
  1. Sets document `status` to `Rejected` and records `rejection_reason`.
  2. Logs `rejected_by` (admin ID) and `rejected_at`.
  3. Dispatches alert email to client notifying them of document rejection and requesting re-upload.
  4. Records `DOCUMENT_REJECTED` in `AuditLogs`.

---

## 5. Input Validation Rules

| Field | Rule Specification | Failure Error Message |
| :--- | :--- | :--- |
| `email` | Standard RFC 5322 regex; trimmed; lowercase. | "Please provide a valid email address." |
| `mobile` | Sanitized to 10–12 digits, E.164 formatted. | "Invalid mobile number format." |
| `password` | Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special symbol. | "Password does not meet complexity requirements." |
| `amounts` | Numeric, non-negative. `paid_amount <= total_amount`. | "Invalid payment amounts: paid cannot exceed total." |
| `service_id` | Regex `^SRV\d{3,}$` | "Invalid service identifier format." |
| `client_id` | Regex `^CL\d{3,}$` | "Invalid client identifier format." |
| `stage_name` | Must match valid stages in defined service workflow. | "Invalid stage transition for this service type." |
