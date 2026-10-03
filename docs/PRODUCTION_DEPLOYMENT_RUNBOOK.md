# Legal Sthal Client + Admin Portal
## Production Deployment Runbook

**Version:** 1.0.0 (Production Release)  
**System Architecture:** Netlify Frontend SPA + Google Apps Script Web App + Google Sheets Database (Schema V2) + Google Drive + Gmail + Zoho CRM  
**Target Environment:** Production  

---

## 1. Overview & Architecture Summary

The Legal Sthal platform operates as a secure, distributed multi-tier application:

```text
                     INTERNET
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
   NETLIFY HOSTING               GOOGLE WORKSPACE
   ┌────────────────────┐        ┌───────────────────────────────────┐
   │ Client Portal SPA  │        │ Google Apps Script Web App        │
   │ Admin Console SPA  │  HTTPS │ (Auth, Portal, Docs, Sync, Mail)  │
   │ Config & Services  │───────>│                                   │
   └────────────────────┘        ├───────────────────────────────────┤
                                 │ Google Sheets (Schema V2 Database)│
                                 │ Google Drive (Encrypted Storage)  │
                                 │ Gmail API (Transactional Mail)    │
                                 └─────────────────┬─────────────────┘
                                                   │ HTTPS OAuth 2.0
                                                   ▼
                                            ZOHO CRM (API v2)
                                            (Leads, Deals, Stages)
```

---

## 2. Pre-Deployment Prerequisites

Before deploying the production stack, ensure you have:
1. Google Workspace account with administrative rights to create Google Spreadsheets, Apps Script projects, and Google Drive folders.
2. Netlify account connected to the project repository.
3. Registered Zoho CRM Developer account with OAuth 2.0 Client credentials (Client ID, Client Secret, Refresh Token).
4. Custom domain configured with SSL/TLS (HTTPS).

---

## 3. Google Sheets Database Provisioning

### Step 3.1: Create Production Spreadsheet
1. Create a new Google Spreadsheet named `LegalSthal_Database_Production`.
2. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### Step 3.2: Execute Schema V2 Database Migration
1. Open **Extensions > Apps Script** in the spreadsheet.
2. Ensure the following files from `backend/` are present:
   - `Config.gs`
   - `Migration.gs`
   - `MigrationTests.gs`
   - `SecurityService.gs`
   - `SessionService.gs`
   - `AuthService.gs`
   - `PortalService.gs`
   - `CRMSyncService.gs`
   - `NotificationService.gs`
   - `Code.gs`
   - `appsscript.json`
3. In the Apps Script code editor, select the function `runMigrationToV2()` from `Migration.gs`.
4. Click **Run** and review the execution log.
5. Verify that all 15 Schema V2 sheets are created with authoritative headers:
   - `SystemConfig`
   - `Clients`
   - `Services`
   - `ServiceStages`
   - `StageHistory`
   - `Documents`
   - `SPOCs`
   - `AdminUsers`
   - `Sessions`
   - `PasswordResets`
   - `QuoteRequests`
   - `Notifications`
   - `AuditLogs`
   - `CRMSyncLogs`
   - `_MigrationSnapshots`

### Step 3.3: Verify Initial SuperAdmin Account
1. Open the `AdminUsers` sheet.
2. Confirm the initial SuperAdmin account is provisioned:
   - **Email:** `admin@legalsthal.com`
   - **Role:** `SUPER_ADMIN`
   - **Status:** `ACTIVE`
   - **Password Hash:** PBKDF2-HMAC-SHA256 (`pbkdf2_sha256$v1$...`)

---

## 4. Google Apps Script Web App Deployment

### Step 4.1: Verify Manifest (`appsscript.json`)
Ensure the project manifest contains the production configurations:
```json
{
  "timeZone": "Asia/Kolkata",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### Step 4.2: Configure ScriptProperties
In the Apps Script Editor, navigate to **Project Settings > Script Properties** and add the following keys:

| Property Key | Example Value | Description |
|---|---|---|
| `SPREADSHEET_ID` | `1BxiMVs0XRA5nFMdKvBdB...` | Production Google Sheet ID |
| `SESSION_SECRET` | `64-character-cryptographic-hex` | Entropy salt for session tokens |
| `DRIVE_ROOT_FOLDER_NAME` | `LegalSthal_Client_Documents` | Root document storage folder |
| `ZOHO_CLIENT_ID` | `1000.XXXXX` | Zoho OAuth 2.0 Client ID |
| `ZOHO_CLIENT_SECRET` | `xxxxxxxxxx` | Zoho OAuth 2.0 Client Secret |
| `ZOHO_REFRESH_TOKEN` | `1000.xxxx.yyyy` | Zoho OAuth 2.0 Persistent Refresh Token |
| `ZOHO_ACCOUNTS_URL` | `https://accounts.zoho.in` | Zoho OAuth token exchange endpoint |
| `ZOHO_API_DOMAIN` | `https://www.zohoapis.in/crm/v2` | Zoho CRM REST API domain |

### Step 4.3: Deploy as Web App
1. In Apps Script, click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Fill in configuration:
   - **Description:** `Legal Sthal Production Web App v2.0`
   - **Execute as:** `Me (your-admin@legalsthal.com)` *(USER_DEPLOYING)*
   - **Who has access:** `Anyone` *(ANYONE)*
4. Click **Deploy**.
5. Grant required Google Workspace permissions during the authorization prompt.
6. **Copy the Web App URL:**
   `https://script.google.com/macros/s/AKfycbx_LIVE_PRODUCTION_SCRIPT_ID/exec`

---

## 5. Automated Background Triggers Setup

### Trigger 1: Notification Queue Processor (`processPendingNotifications`)
1. In Apps Script Editor, select **Triggers (Clock icon)** from the left sidebar.
2. Click **Add Trigger**:
   - **Choose which function to run:** `processPendingNotifications`
   - **Choose which deployment should run:** `Head`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Minutes timer`
   - **Select minute interval:** `Every 5 minutes`
3. Click **Save**.

### Trigger 2: Google Form Ingestion (`onFormSubmit`)
If utilizing Google Forms for document intake:
1. In Google Forms, configure the destination sheet to `LegalSthal_Database_Production` (or trigger directly via webhook).
2. In Apps Script, create an installable trigger:
   - **Choose which function to run:** `onFormSubmit`
   - **Select event source:** `From spreadsheet`
   - **Select event type:** `On form submit`
3. Click **Save**.

---

## 6. Netlify Frontend Deployment

### Step 6.1: Connect Repository to Netlify
1. Connect the GitHub/GitLab repository to Netlify.
2. Configure build settings:
   - **Build command:** *(none required - pure static SPA)*
   - **Publish directory:** `.`
3. Ensure `_headers` and `_redirects` are in the publish directory:
   - `_redirects` handles SPA client routing:
     ```text
     /*    /index.html   200
     ```
   - `_headers` enforces security headers:
     ```text
     /*
       X-Frame-Options: DENY
       X-Content-Type-Options: nosniff
       Referrer-Policy: strict-origin-when-cross-origin
       Content-Security-Policy: default-src 'self' https://script.google.com https://script.googleusercontent.com https://api.qrserver.com; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:;
     ```

### Step 6.2: Link Live Apps Script Web App URL
In the production frontend environment, the live Apps Script endpoint can be set via:
1. **Administrative Settings UI:** Navigate to `#admin/settings`, paste the live Apps Script Web App URL into the API Endpoint configuration field, and click **Save & Test Connection**.
2. **Or Pre-configured Default:** Set `API_BASE_URL` in `js/config.js` prior to deployment:
   ```javascript
   const DEFAULT_MOCK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx_LIVE_PRODUCTION_SCRIPT_ID/exec';
   ```

*Note:* When `CONFIG.isLiveEndpointConfigured()` evaluates to `true`, the frontend switches permanently into Production Mode:
- Interactive prototype Demo Bar is hidden.
- Silent fallbacks to mock data are disabled.
- Authentic server error banners are displayed if connectivity is interrupted.

---

## 7. Rollback & Disaster Recovery Procedures

### Scenario A: Apps Script Logic Regression
1. In Google Apps Script, click **Deploy > Manage deployments**.
2. Select the active deployment and click **Edit**.
3. Under **Version**, select the previous stable version (e.g., `Version 1`).
4. Click **Deploy**. Rollback takes effect immediately without changing the Web App URL.

### Scenario B: Database Corruptions / Accidental Deletions
1. Open the Google Spreadsheet.
2. Navigate to `_MigrationSnapshots` to view pre-migration schema snapshots.
3. Or open **File > Version history > See version history** to restore spreadsheet data to any previous point in time.

### Scenario C: Compromised SuperAdmin Account or Session Token
1. Open the `Sessions` sheet in the spreadsheet.
2. Clear rows with status `ACTIVE` to invalidate all active client and admin sessions globally.
3. Update the `AdminUsers` sheet to reset the compromised user's `is_locked` status or replace password hash.
