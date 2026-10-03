# Legal Sthal — Notification Architecture & Automation Specification
**Document Version:** 1.0.0  
**Status:** Production Ready  
**Execution Phase:** Step 8  

---

## 1. Architectural Overview & Design Principles

The Legal Sthal Notification & Automation Engine provides a unified, production-grade notification delivery framework across in-app channels and external email pipelines (Gmail / MailApp).

```text
                           BUSINESS EVENTS
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
Service Stage               Document State                Quote Proposals
Updates                     (Verified/Rejected)           & Agreements
    │                             │                             │
    └─────────────────────────────┼─────────────────────────────┘
                                  ▼
                   NotificationService.createNotification
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│       In-App Portal Feed      │           │      Email Dispatch (MailApp) │
│  - Strict Session Identity    │           │  - Fail-Closed Isolation      │
│  - Unread State & Timestamps  │           │  - Non-blocking Delivery      │
│  - Sanitized DTO Payloads     │           │  - Bounded Retry Queue (<= 3) │
└───────────────────────────────┘           └───────────────────────────────┘
```

### Core Design Guarantees
1. **Fail-Closed Email Isolation:** Email failures (e.g., Google MailApp service disruptions, quota exhaustion, malformed recipient address) NEVER cause underlying database operations or business workflows (such as stage progression, document verification, or quote confirmation) to roll back or crash. Delivery failures are isolated, tagged with `emailStatus: "FAILED"`, and registered in the retry queue.
2. **Strict Identity Derivation & IDOR Defense:** All client in-app endpoints (`getClientNotifications`, `markNotificationRead`, `markAllNotificationsRead`) strictly derive the client identity from the cryptographically verified session token. Client ID parameters in request bodies are deliberately ignored to prevent client impersonation and tenant crossover.
3. **Event Idempotency Window:** An automated 15-minute deduplication window prevents duplicate notification dispatches when identical entity events are triggered rapidly.
4. **Bounded Retry Queue:** Periodic automation runs (`processPendingNotifications`) enforce a strict 3-attempt ceiling per notification to prevent infinite mail loops and quota draining.
5. **Zero Sensitive Data Leakage:** Notification payloads and serialized DTOs are sanitized to ensure zero leakage of password hashes, salt strings, reset tokens, or session secrets.

---

## 2. Standardized Notification Lifecycle Events

The engine standardizes notifications across 17 distinct lifecycle events:

| Event Type | Recipient | Trigger / Origin | In-App Feed | Email Notification |
|---|---|---|---|---|
| `WELCOME` | Client | New client onboarding & credentials provisioning | Yes | Yes (Credentials & Portal URL) |
| `PASSWORD_RESET` | Client / Admin | Password reset link request | No (Direct token) | Yes (One-time secure token) |
| `PASSWORD_CHANGED` | Client / Admin | Password mutation confirmation | Yes | Yes (Security confirmation) |
| `SERVICE_CREATED` | Client | New legal service attached to client profile | Yes | Yes (Service details) |
| `SERVICE_STAGE_UPDATED` / `STAGE_UPDATE` | Client | Service workflow progression by Operations Admin | Yes | Yes (Stage name, progress %) |
| `DOCUMENT_SUBMITTED` | Client & Ops | Client upload or Google Form ingestion | Yes | Optional |
| `DOCUMENT_VERIFIED` | Client | Document compliance verification by Admin | Yes | Yes (Verification notice) |
| `DOCUMENT_REJECTED` | Client | Document compliance rejection by Admin | Yes (High Priority) | Yes (Rejection reason & re-upload link) |
| `QUOTE_REQUESTED` | Client & Ops | New quote inquiry submitted | Yes | Yes (Confirmation) |
| `QUOTE_SENT` | Client | Admin sends official pricing proposal | Yes | Yes (Proposal amount & acceptance link) |
| `QUOTE_ACCEPTED` | Client & Ops | Client accepts official proposal | Yes | Yes (Work initiation notice) |
| `QUOTE_DECLINED` | Client & Ops | Client or admin declines proposal | Yes | Optional |
| `PAYMENT_RECEIVED` | Client | Milestone or partial payment recorded | Yes | Yes (Receipt details) |
| `PAYMENT_PENDING` | Client | Outstanding balance notification | Yes | Yes (Invoice notice) |
| `PAYMENT_COMPLETED` | Client | Service fully paid | Yes | Yes (Zero-balance receipt) |
| `SPOC_ASSIGNED` | Client | Dedicated legal specialist assigned to service | Yes | Yes (SPOC contact details) |
| `CRM_SYNC_FAILED` | Admin Ops | Zoho CRM background sync failure | Yes (Admin Console) | Yes (Alert to Ops Desk) |
| `CRM_SYNC_RECOVERED` | Admin Ops | Automatic or manual sync recovery | Yes (Admin Console) | Optional |

---

## 3. Database Schema Mapping & Storage Format

Notifications are stored in the Schema V2 `Notifications` sheet with the following column structure:

| Col Index | Header Name | Type | Description |
|---|---|---|---|
| 0 | `notification_id` | String | Unique secure identifier (`NOTIF_<timestamp>_<hex>`) |
| 1 | `client_id` | String | Associated client ID (`CL001`, `CL002`, or `ADMIN`) |
| 2 | `client_name` | String | Company or client display name |
| 3 | `event_type` | String | Standardized event string (`SERVICE_STAGE_UPDATED`, etc.) |
| 4 | `details` | String | Plain-text message or serialized JSON envelope |
| 5 | `channel` | String | `PORTAL`, `EMAIL`, or `EMAIL_AND_PORTAL` |
| 6 | `date` | ISO 8601 | Creation timestamp |
| 7 | `status` | String | In-app read status (`Unread` or `Read`) |

### Serialized Metadata Envelope (Column 4)
When rich automation metadata is tracked, column 4 contains a JSON-serialized envelope while maintaining backward compatibility:
```json
{
  "message": "Your service 'Private Limited Company Registration' advanced to stage: SPICe+ Part B Preparation.",
  "title": "Service Stage Advanced",
  "recipientType": "CLIENT",
  "recipientId": "CL001",
  "relatedEntityType": "SERVICE",
  "relatedEntityId": "SRV001:SPICe+ Part B Preparation",
  "emailStatus": "SENT",
  "emailError": null,
  "attemptCount": 1,
  "recipientEmail": "rahul@abctech.com",
  "createdAt": "2026-10-02T09:47:34.000Z",
  "readAt": "2026-10-02T09:50:12.000Z"
}
```

---

## 4. API Endpoints Specification

### 4.1 Client Notifications (`getClientNotifications`)
* **Method:** `POST`
* **Action:** `getClientNotifications`
* **Authorization:** Authenticated Client Session (`token`)
* **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "NOTIF_1790934454031_52ac43617d59",
      "notificationId": "NOTIF_1790934454031_52ac43617d59",
      "eventType": "SERVICE_STAGE_UPDATED",
      "title": "Service Stage Advanced",
      "message": "Your service 'Private Limited Company Registration' advanced to stage: SPICe+ Part B Preparation.",
      "relatedEntityType": "SERVICE",
      "relatedEntityId": "SRV001:SPICe+ Part B Preparation",
      "channel": "EMAIL_AND_PORTAL",
      "createdAt": "2026-10-02T09:47:34.000Z",
      "status": "Unread",
      "isRead": false,
      "emailStatus": "SENT"
    }
  ],
  "message": "Notifications retrieved successfully."
}
```

### 4.2 Mark Single Notification Read (`markNotificationRead`)
* **Method:** `POST`
* **Action:** `markNotificationRead`
* **Authorization:** Authenticated Client Session (`token`)
* **Payload:** `{ "notification_id": "NOTIF_..." }`
* **Security:** Returns `AUTH_FORBIDDEN` if notification belongs to another client.

### 4.3 Mark All Notifications Read (`markAllNotificationsRead`)
* **Method:** `POST`
* **Action:** `markAllNotificationsRead`
* **Authorization:** Authenticated Client Session (`token`)
* **Response:** `{ "success": true, "count": 4, "message": "Marked 4 notifications as read." }`

### 4.4 Admin Notification Feed (`adminGetNotifications`)
* **Method:** `POST`
* **Action:** `adminGetNotifications`
* **Authorization:** Admin Role (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATIONS`)
* **Payload:** `{ "statusFilter": "all", "channelFilter": "all", "page": 1, "pageSize": 50 }`

### 4.5 Admin Automation Health Monitor (`adminGetNotificationHealth`)
* **Method:** `POST`
* **Action:** `adminGetNotificationHealth`
* **Authorization:** Admin Role
* **Response:**
```json
{
  "success": true,
  "data": {
    "status": "Healthy",
    "healthStatus": "Healthy",
    "totalRecords": 45,
    "sentEmails": 42,
    "pendingEmails": 0,
    "failedEmails": 3,
    "lastSuccessfulNotification": "2026-10-02T09:47:34.000Z",
    "lastFailure": "None"
  },
  "message": "Notification automation health metrics calculated."
}
```

### 4.6 Process Pending Retries (`processPendingNotifications`)
* **Method:** `POST` / Cron Trigger
* **Action:** `processPendingNotifications`
* **Execution:** Acquires Apps Script `LockService` lock. Scans for `FAILED`, `PENDING`, or `RETRYING` records with `attemptCount < 3`. Retries email transmission, updates attempt count, transitions to `SENT` or `FAILED`.
