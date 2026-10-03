# Legal Sthal Admin Operations Console API Contract Specification

**Document Version:** 2.0.0  
**Phase:** Step 5 — Live Admin Portal Core  
**Protocol:** HTTPS POST via Google Apps Script Web App  
**Content-Type:** `text/plain;charset=utf-8` (Google Apps Script CORS-compliant JSON transport)  
**Security Model:** Role-based access control (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATIONS`); thread-safe atomic mutations via `LockService`; mandatory audit logging.

---

## 1. Role-Based Access Control (RBAC)
All admin endpoints strictly enforce role authorization. Callers possessing the role `CLIENT` or unauthenticated sessions attempting any administrative action are immediately rejected with `403 Forbidden` (`AUTH_FORBIDDEN`).

Authorized roles:
- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `ACCOUNTANT`
- `OPERATIONS`
- `SUPPORT`

---

## 2. API Endpoints

### 2.1. `adminGetDashboard`
Returns operational metrics across all client accounts and services, plus recent clients and active services.

- **Action:** `adminGetDashboard`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminGetDashboard",
  "token": "sess_admin_0123456789abcdef..."
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalClients": 24,
      "activeClients": 22,
      "totalServices": 48,
      "activeServices": 31,
      "completedServices": 17,
      "totalRevenue": 485000,
      "totalCollected": 360000,
      "totalPending": 125000
    },
    "recentClients": [
      {
        "clientId": "CL024",
        "companyName": "Zenith AI Corp",
        "contactPerson": "Aakash Patel",
        "email": "aakash@zenith.ai",
        "status": "Active"
      }
    ],
    "recentServices": [
      {
        "serviceId": "SRV048",
        "serviceCode": "PVT-INC-048",
        "serviceName": "Private Limited Company Registration",
        "clientName": "Zenith AI Corp",
        "currentStage": "Name Approval (RUN)",
        "progressPercentage": 40,
        "status": "In Progress"
      }
    ]
  },
  "message": "Operations dashboard metrics loaded."
}
```

---

### 2.2. `adminGetClients`
Returns the master client directory with active service counts and aggregated billing totals. Supports searching by text query and filtering by account status.

- **Action:** `adminGetClients`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminGetClients",
  "token": "sess_admin_0123456789abcdef...",
  "search": "Tech",
  "status": "Active"
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "clientId": "CL001",
      "companyName": "ABC Technologies Pvt Ltd",
      "contactPerson": "Rahul Mehta",
      "email": "rahul@abctech.com",
      "phone": "+91 98765 43210",
      "state": "Gujarat",
      "status": "Active",
      "servicesCount": 2,
      "totalAmount": 21499,
      "paidAmount": 16500,
      "remainingAmount": 4999,
      "createdAt": "2026-02-01T10:00:00.000Z"
    }
  ],
  "message": "Client directory loaded successfully."
}
```

---

### 2.3. `adminGetClient`
Retrieves single client profile and their entire linked service portfolio.

- **Action:** `adminGetClient`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminGetClient",
  "token": "sess_admin_0123456789abcdef...",
  "client_id": "CL001"
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
      "email": "rahul@abctech.com",
      "phone": "+91 98765 43210",
      "state": "Gujarat",
      "address": "101 Tech Boulevard, Ahmedabad",
      "gstin": "24AAACA1234A1Z5",
      "status": "Active"
    },
    "services": [
      {
        "serviceId": "SRV001",
        "serviceCode": "PVT-INC-001",
        "serviceName": "Private Limited Company Registration",
        "companyType": "Private Limited",
        "totalAmount": 14999,
        "paidAmount": 10000,
        "remainingAmount": 4999,
        "currentStage": "Name Approval (RUN)",
        "progressPercentage": 40,
        "status": "In Progress"
      },
      {
        "serviceId": "SRV003",
        "serviceCode": "TM-REG-003",
        "serviceName": "Trademark Registration (Class 42)",
        "companyType": "Private Limited",
        "totalAmount": 6500,
        "paidAmount": 6500,
        "remainingAmount": 0,
        "currentStage": "Application Filed",
        "progressPercentage": 60,
        "status": "In Progress"
      }
    ]
  },
  "message": "Admin client details retrieved."
}
```

---

### 2.4. `adminGetService`
Retrieves service details, workflow stages, stage history, and assigned SPOC for operational management.

- **Action:** `adminGetService`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminGetService",
  "token": "sess_admin_0123456789abcdef...",
  "service_id": "SRV001"
}
```

---

### 2.5. `adminUpdateServiceStage`
Advances or adjusts a service workflow stage.  
**Atomic Execution Guarantees:**
1. Acquires `ScriptLock` to eliminate race conditions.
2. Updates `Services` table (`current_stage`, `current_stage_index`, `progress_percentage`, `status`).
3. Updates `ServiceStages` table (marks preceding stages `Completed`, current `In Progress`, future `Pending`).
4. Appends record to `StageHistory` with actor name, role, timestamp, and remarks.
5. Appends record to `AuditLogs` for tamper-evident tracking.
6. Dispatches notification record to `Notifications` table for the client.

- **Action:** `adminUpdateServiceStage`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminUpdateServiceStage",
  "token": "sess_admin_0123456789abcdef...",
  "service_id": "SRV001",
  "stage_index": 2,
  "remarks": "MCA Form SPICe+ Part B submitted with digital signatures."
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "serviceId": "SRV001",
    "currentStage": "SPICe+ Part B Preparation",
    "currentStageIndex": 2,
    "progressPercentage": 60,
    "status": "In Progress",
    "updatedAt": "2026-10-02T06:05:00.000Z",
    "stages": [ ... ],
    "stageHistory": [ ... ]
  },
  "message": "Service stage successfully updated to 'SPICe+ Part B Preparation' (60%)."
}
```

---

### 2.6. `adminAssignSpoc`
Assigns or reassigns a dedicated Single Point of Contact (SPOC) to a service.

- **Action:** `adminAssignSpoc`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminAssignSpoc",
  "token": "sess_admin_0123456789abcdef...",
  "service_id": "SRV001",
  "spoc_id": "SPOC002"
}
```

- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "serviceId": "SRV001",
    "spocId": "SPOC002",
    "spoc": {
      "spocId": "SPOC002",
      "name": "Ankit Verma",
      "title": "Compliance Manager",
      "email": "ankit@legalsthal.com"
    },
    "updatedAt": "2026-10-02T06:06:00.000Z"
  },
  "message": "Dedicated SPOC 'Ankit Verma' successfully assigned to service."
}
```

---

### 2.7. `adminGetSpocs`
Retrieves directory of all active SPOCs.

- **Action:** `adminGetSpocs`
- **Method:** `POST`
- **Request Payload:**
```json
{
  "action": "adminGetSpocs",
  "token": "sess_admin_0123456789abcdef..."
}
```
