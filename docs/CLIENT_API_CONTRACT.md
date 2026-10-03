# Legal Sthal Client API Contract Specification

**Document Version:** 2.0.0  
**Phase:** Step 5 — Live Client Portal Core  
**Protocol:** HTTPS POST via Google Apps Script Web App  
**Content-Type:** `text/plain;charset=utf-8` (Google Apps Script CORS-compliant JSON transport)  
**Security Model:** Session-bearer authentication; strict server-side client identity derivation; fail-closed IDOR boundaries.

---

## 1. Architectural Security Principles

1. **Server-Side Identity Derivation:**  
   The client application **never** submits a trusted `client_id` in the request body for client operations. The backend derives the caller's identity strictly from the cryptographically validated opaque session token (`token`). Any caller-provided `client_id` in the payload is ignored.
2. **Strict IDOR Tenant Defense:**  
   Every requested resource (such as `service_id`, `stage_id`, or `notification_id`) is checked against the authenticated caller's `clientId`. If a mismatch is identified, the backend aborts execution with `403 Forbidden` (`AUTH_FORBIDDEN`) and writes an entry to `AuditLogs`.
3. **Zero Sensitive Data Exposure:**  
   Password hashes (`password_hash`), cryptographic salts (`password_salt`), legacy passwords (`password`), lockout timestamps (`locked_until`), and failed attempt counters (`failed_attempts`) are strictly omitted from all client API responses.
4. **Financial Consistency Rule:**  
   All monetary amounts adhere to the standard invariant:
   $$\text{remainingAmount} = \text{totalAmount} - \text{paidAmount}$$

---

## 2. API Endpoints

### 2.1. `getClientProfile`
Retrieves the sanitized account profile of the currently logged-in client.

- **Action:** `getClientProfile`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "getClientProfile",
  "token": "sess_0123456789abcdef..."
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "clientId": "CL001",
    "name": "ABC Technologies Pvt Ltd",
    "companyName": "ABC Technologies Pvt Ltd",
    "contactPerson": "Rahul Mehta",
    "email": "rahul@abctech.com",
    "phone": "+91 98765 43210",
    "state": "Gujarat",
    "address": "101 Tech Boulevard, Ahmedabad",
    "gstin": "24AAACA1234A1Z5",
    "status": "Active",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-01T10:00:00.000Z"
  },
  "message": "Client profile retrieved."
}
```

- **Error Responses:**
  - `AUTH_UNAUTHORIZED`: Invalid, revoked, or expired session token.
  - `AUTH_FORBIDDEN`: Account does not have an associated client record.

---

### 2.2. `getClientDashboard`
Retrieves aggregated dashboard data for the client: portfolio metrics, active/completed services list with current stage progress, assigned SPOC, and recent notifications.

- **Action:** `getClientDashboard`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "getClientDashboard",
  "token": "sess_0123456789abcdef..."
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "client": {
      "clientId": "CL001",
      "companyName": "ABC Technologies Pvt Ltd",
      "contactPerson": "Rahul Mehta",
      "email": "rahul@abctech.com"
    },
    "metrics": {
      "totalServices": 2,
      "activeServices": 2,
      "completedServices": 0,
      "totalAmount": 21499,
      "paidAmount": 16500,
      "remainingAmount": 4999,
      "dscCount": 3,
      "unreadNotifications": 1
    },
    "services": [
      {
        "serviceId": "SRV001",
        "clientId": "CL001",
        "serviceCode": "PVT-INC-001",
        "serviceName": "Private Limited Company Registration",
        "companyType": "Private Limited",
        "state": "Gujarat",
        "totalAmount": 14999,
        "paidAmount": 10000,
        "remainingAmount": 4999,
        "dscCount": 2,
        "currentStage": "SPICe+ Part B Preparation",
        "currentStageIndex": 2,
        "progressPercentage": 60,
        "status": "In Progress",
        "spocId": "SPOC001",
        "stages": [ ... ],
        "spoc": {
          "spocId": "SPOC001",
          "name": "Priya Sharma",
          "title": "Senior Legal Specialist",
          "mobile": "+91 98200 11223",
          "email": "priya@legalsthal.com"
        }
      }
    ],
    "notifications": [
      {
        "notificationId": "NOTIF_179092...",
        "clientId": "CL001",
        "eventType": "STAGE_UPDATE",
        "details": "Your service 'Private Limited Company Registration' advanced to stage: SPICe+ Part B Preparation.",
        "date": "2026-10-02T06:05:00.000Z",
        "status": "Unread"
      }
    ],
    "spoc": {
      "spocId": "SPOC001",
      "name": "Priya Sharma",
      "title": "Senior Legal Specialist",
      "email": "priya@legalsthal.com"
    }
  },
  "message": "Client dashboard data loaded successfully."
}
```

---

### 2.3. `getClientServices`
Retrieves all services associated with the authenticated client.

- **Action:** `getClientServices`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "getClientServices",
  "token": "sess_0123456789abcdef..."
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "SRV001",
      "serviceCode": "PVT-INC-001",
      "serviceName": "Private Limited Company Registration",
      "companyType": "Private Limited",
      "state": "Gujarat",
      "totalAmount": 14999,
      "paidAmount": 10000,
      "remainingAmount": 4999,
      "dscCount": 2,
      "currentStage": "Name Approval (RUN)",
      "currentStageIndex": 1,
      "progressPercentage": 40,
      "status": "In Progress",
      "spocId": "SPOC001"
    }
  ],
  "message": "Client services retrieved successfully."
}
```

---

### 2.4. `getClientService`
Retrieves single service details including the workflow stages, stage history, and assigned SPOC. Enforces IDOR check: if caller does not own `service_id`, returns `403`.

- **Action:** `getClientService`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "getClientService",
  "token": "sess_0123456789abcdef...",
  "service_id": "SRV001"
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "service": {
      "serviceId": "SRV001",
      "clientId": "CL001",
      "serviceName": "Private Limited Company Registration",
      "totalAmount": 14999,
      "paidAmount": 10000,
      "remainingAmount": 4999,
      "status": "In Progress"
    },
    "stages": [
      {
        "stageId": "STG001",
        "stageName": "Document Verification",
        "stageStatus": "Completed",
        "completedOn": "2026-02-03T10:00:00.000Z",
        "sequenceOrder": 1
      },
      {
        "stageId": "STG002",
        "stageName": "Name Approval (RUN)",
        "stageStatus": "Completed",
        "completedOn": "2026-02-05T10:00:00.000Z",
        "sequenceOrder": 2
      },
      {
        "stageId": "STG003",
        "stageName": "SPICe+ Part B Preparation",
        "stageStatus": "In Progress",
        "completedOn": "",
        "sequenceOrder": 3
      }
    ],
    "stageHistory": [
      {
        "stageHistoryId": "SH_179...",
        "stageName": "SPICe+ Part B Preparation",
        "status": "Completed",
        "changedBy": "Super Admin",
        "changedByRole": "SUPER_ADMIN",
        "changedAt": "2026-10-02T06:05:00.000Z",
        "remarks": "Client documents verified and accepted by legal team"
      }
    ],
    "spoc": {
      "spocId": "SPOC001",
      "name": "Priya Sharma",
      "title": "Senior Legal Specialist",
      "phone": "+91 98200 11223",
      "email": "priya@legalsthal.com"
    }
  },
  "message": "Service details retrieved successfully."
}
```

- **Error Response (IDOR Blocked):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FORBIDDEN",
    "message": "Access denied to requested service."
  }
}
```

---

### 2.5. `getClientNotifications` & `markNotificationRead`
Retrieves notifications for the authenticated client and updates their read state.

- **Action:** `getClientNotifications`
- **Request Payload:**
```json
{
  "action": "getClientNotifications",
  "token": "sess_0123456789abcdef..."
}
```

- **Action:** `markNotificationRead`
- **Request Payload:**
```json
{
  "action": "markNotificationRead",
  "token": "sess_0123456789abcdef...",
  "notification_id": "NOTIF_179..."
}
```

- **Success Response:**
```json
{
  "success": true,
  "message": "Notification marked as read."
}
```
