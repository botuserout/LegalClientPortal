# 🚀 Legal Sthal — Google Apps Script & Google Sheets Backend Guide

This folder contains the complete, production-grade Google Apps Script backend engine for the **Legal Sthal Client/Admin Portal**.

---

## 📋 Features Included

1. **Automated Google Sheets Database (`setupDatabaseSheets`)**:
   - Creates and formats 8 relational database tabs: `Clients`, `Services`, `ServiceStages`, `Documents`, `QuoteRequests`, `SPOCs`, `Notifications`, `AuditLogs`.
2. **REST API Web App Endpoints**:
   - `doGet(e)`: Fetch clients, services, catalog items, documents, and quote requests with CORS support.
   - `doPost(e)`: Handle client registration, service stage progress, document verification/rejection, quote requests, and Google Drive file uploads.
3. **Google Drive Document Vault**:
   - Decodes base64 document uploads and stores them automatically in a dedicated `LegalSthal_Client_Documents` Google Drive folder.
4. **Google Forms Integration (`onFormSubmit`)**:
   - Auto-parses document responses submitted via Google Forms and updates the spreadsheet database in real time.
5. **Transactional Email Gateway (`GmailApp`)**:
   - Dispatches branded welcome emails, quote confirmation emails, and stage update alerts.

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a **Blank Spreadsheet**.
2. Name the spreadsheet: **`Legal Sthal Master Database`**.

### Step 2: Open Apps Script Editor
1. In your Google Sheet, click **Extensions** → **Apps Script**.
2. Rename the project to: **`Legal Sthal Backend Engine`**.

### Step 3: Copy Code into Apps Script
1. Replace the default content in `Code.gs` with the code inside [`backend/Code.gs`](file:///c:/Users/acer/OneDrive/Desktop/LegalClientPortal/backend/Code.gs).
2. Click **Project Settings** ⚙️ on the left menu, check **"Show 'appsscript.json' manifest file in editor"**.
3. Replace `appsscript.json` in the editor with the content from [`backend/appsscript.json`](file:///c:/Users/acer/OneDrive/Desktop/LegalClientPortal/backend/appsscript.json).
4. Save the project (`Ctrl + S` / `Cmd + S`).

### Step 4: Run Initial Database Setup
1. In the Apps Script toolbar, select the function **`setupDatabaseSheets`** from the dropdown.
2. Click **Run** ▶️.
3. Grant the required Google authorizations when prompted.
4. Switch back to your Google Sheet — you will see all 8 database tabs (`Clients`, `Services`, etc.) automatically created with styled gold & navy headers!

### Step 5: Deploy as Web App
1. Click **Deploy** → **New Deployment** (top right).
2. Click the gear icon ⚙️ next to *Select type* and choose **Web App**.
3. Configure the deployment:
   - **Description**: `Legal Sthal Production API v2`
   - **Execute as**: **`Me (your@gmail.com)`**
   - **Who has access**: **`Anyone`** *(Required for CORS web requests from your portal)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Connect Web App URL to Legal Sthal Admin Portal
1. Open your Legal Sthal Admin Portal.
2. Navigate to **Settings** (`#admin/settings`).
3. Under **Google Apps Script Web App Integration**, paste your deployment URL into the **Apps Script Deployment Endpoint URL** input.
4. Click **Test & Save Integration Settings**.

---

## 🧪 Testing API Endpoints

### Health Check (GET)
```text
GET https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=healthCheck
```
*Expected Response:*
```json
{
  "success": true,
  "status": "Online",
  "message": "Legal Sthal Apps Script Engine is active.",
  "timestamp": "2026-10-01T15:00:00.000Z"
}
```

### Create Client (POST)
```json
POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
Content-Type: application/json

{
  "action": "createClient",
  "clientData": {
    "companyName": "Acme Pvt Ltd",
    "contactPerson": "John Doe",
    "email": "john@acme.com",
    "mobile": "+91 98765 43210",
    "state": "Gujarat"
  }
}
```
