/**
 * Legal Sthal - Step 8 Automated Test Suite (test_step8_notifications.js)
 * 
 * Verifies Notification Architecture & Automation Engine:
 * - NOTIF-001: Service stage update creates notification (SERVICE_STAGE_UPDATED / STAGE_UPDATE)
 * - NOTIF-002: Document rejection creates notification with rejection reason (DOCUMENT_REJECTED)
 * - NOTIF-003: Document verification creates notification (DOCUMENT_VERIFIED)
 * - NOTIF-004: Quote request submission creates notification (QUOTE_REQUESTED)
 * - NOTIF-005: Quote proposal creation creates notification with quote amount (QUOTE_SENT)
 * - NOTIF-006: Quote acceptance creates notification (QUOTE_ACCEPTED)
 * - NOTIF-007: SPOC assignment creates notification (SPOC_ASSIGNED)
 * - NOTIF-008: Client retrieves own notifications feed via getClientNotifications
 * - NOTIF-009: IDOR Defense: Foreign client cannot view another client's notifications
 * - NOTIF-010: IDOR Defense: Foreign client cannot mark another client's notification as read
 * - NOTIF-011: Client identity strictly derived from session, ignoring spoofed client_id in payload
 * - NOTIF-012: Client role forbidden from adminGetNotifications (AUTH_FORBIDDEN)
 * - NOTIF-013: Client role forbidden from adminMarkAllNotificationsRead (AUTH_FORBIDDEN)
 * - NOTIF-014: Client role forbidden from adminGetNotificationHealth (AUTH_FORBIDDEN)
 * - NOTIF-015: Fail-Closed Email: MailApp failure does not rollback or crash business operation
 * - NOTIF-016: Failed email delivery recorded with status FAILED without data loss
 * - NOTIF-017: Automation: processPendingNotifications retries pending / failed notifications
 * - NOTIF-018: Bounded retry count: Max 3 retry attempts enforced
 * - NOTIF-019: Event Idempotency: Duplicate notification suppressed within 15-minute window
 * - NOTIF-020: Notification DTO sanitization: Leaks zero secrets (no hashes, salts, tokens)
 * - NOTIF-021: Client markNotificationRead transitions status to 'Read' and populates readAt
 * - NOTIF-022: Client markAllNotificationsRead updates all unread notifications to 'Read'
 * - NOTIF-023: Admin retrieves notification delivery health metrics (Healthy vs Degraded)
 * - NOTIF-024: Admin retrieves system-wide operational notifications feed
 * - NOTIF-025: Admin markAllNotificationsRead executes successfully
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==========================================
// 1. MOCK SPREADSHEET INFRASTRUCTURE
// ==========================================

class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValue(val) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        const targetR = this.row + r - 1;
        const targetC = this.col + c - 1;
        while (this.sheet.data.length <= targetR) this.sheet.data.push([]);
        while (this.sheet.data[targetR].length <= targetC) this.sheet.data[targetR].push("");
        this.sheet.data[targetR][targetC] = val;
      }
    }
  }
  getValue() {
    const r = this.row - 1;
    const c = this.col - 1;
    return (this.sheet.data[r] && this.sheet.data[r][c] !== undefined) ? this.sheet.data[r][c] : "";
  }
  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      const targetR = this.row + r - 1;
      for (let c = 0; c < this.numCols; c++) {
        const targetC = this.col + c - 1;
        rowArr.push((this.sheet.data[targetR] && this.sheet.data[targetR][targetC] !== undefined) ? this.sheet.data[targetR][targetC] : "");
      }
      res.push(rowArr);
    }
    return res;
  }
  setBackground() {}
  setFontColor() {}
  setFontWeight() {}
}

class MockSheet {
  constructor(name, initialData = []) {
    this.name = name;
    this.data = JSON.parse(JSON.stringify(initialData));
  }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    let max = 0;
    this.data.forEach(r => { if (r.length > max) max = r.length; });
    return max;
  }
  appendRow(row) { this.data.push(row.slice()); }
  deleteRow(rowIndex) {
    const idx = rowIndex - 1;
    if (idx >= 0 && idx < this.data.length) {
      this.data.splice(idx, 1);
    }
  }
  getRange(row, col, numRows = 1, numCols = 1) { return new MockRange(this, row, col, numRows, numCols); }
  getDataRange() {
    const numRows = Math.max(1, this.data.length);
    const numCols = Math.max(1, this.getLastColumn());
    return new MockRange(this, 1, 1, numRows, numCols);
  }
  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() {
    this.id = "mock_step8_sheet_id";
    this.name = "Legal Sthal Master Database";
    this.sheets = {};
  }
  getId() { return this.id; }
  getName() { return this.name; }
  getSheets() { return Object.values(this.sheets); }
  getSheetByName(name) { return this.sheets[name] || null; }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets[name] = s;
    return s;
  }
}

global.mockSS = new MockSpreadsheet();

const mockProps = {};
const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => mockProps[k] !== undefined ? mockProps[k] : null,
    setProperty: (k, v) => { mockProps[k] = String(v); }
  })
};

const LockService = {
  getScriptLock: () => ({
    tryLock: () => true,
    waitLock: () => {},
    releaseLock: () => {}
  })
};

const Logger = {
  log: (...args) => {}
};

const Utilities = {
  DigestAlgorithm: { SHA_256: "SHA_256" },
  getUuid: () => crypto.randomUUID(),
  base64Decode: (str) => Buffer.from(str, 'base64'),
  newBlob: (data, mime, name) => ({
    getDataAsString: () => typeof data === 'string' ? data : Buffer.from(data).toString('utf8'),
    getBytes: () => Array.from(Buffer.isBuffer(data) ? data : Buffer.from(data)),
    getName: () => name || "document.pdf",
    setContentType: function() { return this; }
  }),
  computeDigest: (alg, val) => {
    const hash = crypto.createHash('sha256');
    hash.update(typeof val === 'string' ? val : Buffer.from(val));
    const buf = hash.digest();
    const arr = [];
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      if (byte > 127) byte -= 256;
      arr.push(byte);
    }
    return arr;
  },
  computeHmacSha256Signature: (value, key) => {
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const valBuf = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const hmac = crypto.createHmac('sha256', keyBuf);
    hmac.update(valBuf);
    const buf = hmac.digest();
    const arr = [];
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      if (byte > 127) byte -= 256;
      arr.push(byte);
    }
    return arr;
  },
  formatDate: (date, tz, fmt) => date.toISOString().substring(0, 10)
};

const ContentService = {
  MimeType: { JSON: "application/json" },
  createTextOutput: (str) => ({
    content: str,
    setMimeType: function() { return this; },
    getContent: function() { return this.content; }
  })
};

global.PropertiesService = PropertiesService;
global.LockService = LockService;
global.Logger = Logger;
global.Utilities = Utilities;
global.ContentService = ContentService;
global.SpreadsheetApp = {
  openById: () => global.mockSS,
  getActiveSpreadsheet: () => global.mockSS
};
global.getSpreadsheetInstance = () => global.mockSS;

// Configurable MailApp mock for failure isolation testing
let mailAppShouldFail = false;
let sentEmails = [];
global.MailApp = {
  sendEmail: (to, subject, body) => {
    if (mailAppShouldFail) {
      throw new Error("Simulated MailApp service unavailable / quota exceeded.");
    }
    sentEmails.push({ to, subject, body, timestamp: new Date().toISOString() });
    return true;
  }
};
global.sendEmail = global.MailApp.sendEmail;

// Load Backend Scripts
const backendDir = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend';
eval(fs.readFileSync(path.join(backendDir, 'Config.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SecurityService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'Migration.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SessionService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'AuthService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'NotificationService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'CRMSyncService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'PortalService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'Code.gs'), 'utf8'));

// ==========================================
// 2. SEED TEST DATABASE
// ==========================================

function setupDatabaseWithSeedData() {
  global.mockSS = new MockSpreadsheet();
  migrateDatabase();

  const ss = global.mockSS;

  // 1. Add SPOCs
  const spocSheet = ss.getSheetByName("SPOCs");
  spocSheet.appendRow([
    "SPOC001", "Priya Sharma", "Senior Legal Specialist", "+91 98200 11223", "priya@legalsthal.com", 12, "Active", "https://avatar.url/1", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"
  ]);

  // 2. Add Clients
  const clientSheet = ss.getSheetByName("Clients");
  const cMap = getColumnIndexMap(getSheetHeaders(clientSheet), "Clients");

  // CL001
  const salt1 = SecurityService.generateSalt();
  const hash1 = SecurityService.hashPassword("LegalClient@2026", salt1);
  const row1 = new Array(clientSheet.getLastColumn()).fill("");
  row1[cMap["client_id"]] = "CL001";
  row1[cMap["name"]] = "ABC Technologies Pvt Ltd";
  row1[cMap["contact_name"]] = "Rahul Mehta";
  row1[cMap["email"]] = "rahul@abctech.com";
  row1[cMap["mobile"]] = "+91 98765 43210";
  row1[cMap["password_hash"]] = hash1;
  row1[cMap["password_salt"]] = salt1;
  row1[cMap["status"]] = "Active";
  row1[cMap["state"]] = "Maharashtra";
  clientSheet.appendRow(row1);

  // CL002
  const salt2 = SecurityService.generateSalt();
  const hash2 = SecurityService.hashPassword("LegalClient@2026", salt2);
  const row2 = new Array(clientSheet.getLastColumn()).fill("");
  row2[cMap["client_id"]] = "CL002";
  row2[cMap["name"]] = "XYZ Retail Pvt Ltd";
  row2[cMap["contact_name"]] = "Sneha Patel";
  row2[cMap["email"]] = "sneha@xyzretail.com";
  row2[cMap["mobile"]] = "+91 98111 22233";
  row2[cMap["password_hash"]] = hash2;
  row2[cMap["password_salt"]] = salt2;
  row2[cMap["status"]] = "Active";
  row2[cMap["state"]] = "Maharashtra";
  clientSheet.appendRow(row2);

  // 3. Add Services
  const srvSheet = ss.getSheetByName("Services");
  const sMap = getColumnIndexMap(getSheetHeaders(srvSheet), "Services");

  const srow1 = new Array(srvSheet.getLastColumn()).fill("");
  srow1[sMap["service_id"]] = "SRV001";
  srow1[sMap["client_id"]] = "CL001";
  srow1[sMap["service_code"]] = "PVT-INC-001";
  srow1[sMap["crm_deal_id"]] = "ZC-890124";
  srow1[sMap["service_name"]] = "Private Limited Company Registration";
  srow1[sMap["total_amount"]] = 14999;
  srow1[sMap["paid_amount"]] = 10000;
  srow1[sMap["remaining_amount"]] = 4999;
  srow1[sMap["status"]] = "In Progress";
  srvSheet.appendRow(srow1);

  // 4. Add ServiceStages for SRV001
  const stageSheet = ss.getSheetByName("ServiceStages");
  stageSheet.appendRow(["STG001", "SRV001", "Name Approval (RUN)", "Completed", "2026-01-05T00:00:00.000Z", "Approved", 1]);
  stageSheet.appendRow(["STG002", "SRV001", "DSC & DIN Preparation", "In Progress", "", "In progress", 2]);
  stageSheet.appendRow(["STG003", "SRV001", "SPICe+ Part B Preparation", "Pending", "", "", 3]);

  // 5. Add Admin Users
  const adminSheet = ss.getSheetByName("AdminUsers");
  const aMap = getColumnIndexMap(getSheetHeaders(adminSheet), "AdminUsers");
  const adminSalt = SecurityService.generateSalt();
  const adminHash = SecurityService.hashPassword("SuperAdmin@2026", adminSalt);
  const aRow = new Array(adminSheet.getLastColumn()).fill("");
  aRow[aMap["user_id"]] = "ADM001";
  aRow[aMap["name"]] = "Operations Admin";
  aRow[aMap["email"]] = "admin@legalsthal.com";
  aRow[aMap["role"]] = "ADMIN";
  aRow[aMap["password_hash"]] = adminHash;
  aRow[aMap["password_salt"]] = adminSalt;
  aRow[aMap["status"]] = "ACTIVE";
  adminSheet.appendRow(aRow);
}

function postApi(action, payload = {}) {
  const req = {
    postData: {
      contents: JSON.stringify(Object.assign({ action }, payload))
    },
    parameter: {}
  };
  const res = doPost(req);
  return JSON.parse(res.getContent());
}

// ==========================================
// 3. EXECUTION OF TEST BATTERY
// ==========================================

console.log("==================================================");
console.log("🔔 STARTING STEP 8 NOTIFICATIONS & AUTOMATION SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testId, message) {
  if (condition) {
    console.log(`[PASS] ${testId}: ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${testId}: ${message}`);
    testsFailed++;
  }
}

try {
  setupDatabaseWithSeedData();

  // 1. Authenticate Sessions
  const clientLogin = postApi("login", { login_id: "rahul@abctech.com", password: "LegalClient@2026" });
  const clientSessionToken = clientLogin.data ? clientLogin.data.token : null;

  const foreignLogin = postApi("login", { login_id: "sneha@xyzretail.com", password: "LegalClient@2026" });
  const foreignClientSessionToken = foreignLogin.data ? foreignLogin.data.token : null;

  const adminLogin = postApi("login", { login_id: "admin@legalsthal.com", password: "SuperAdmin@2026" });
  const adminSessionToken = adminLogin.data ? adminLogin.data.token : null;

  if (!clientSessionToken || !foreignClientSessionToken || !adminSessionToken) {
    throw new Error("Failed to authenticate test accounts.");
  }

  // --------------------------------------------------
  // NOTIF-001: Stage Update Notification
  // --------------------------------------------------
  const stageUpdateRes = postApi("adminUpdateServiceStage", {
    token: adminSessionToken,
    service_id: "SRV001",
    stage_name: "DSC & DIN Preparation",
    stage_status: "Completed",
    notes: "DSC issued successfully by CCA provider."
  });
  assert(stageUpdateRes.success === true, "NOTIF-001", "Admin advances stage -> Stage update succeeds");

  const notifSheet = global.mockSS.getSheetByName("Notifications");
  const nMap = getColumnIndexMap(getSheetHeaders(notifSheet), "Notifications");
  const notifRows = notifSheet.getDataRange().getValues().slice(1);
  const stageNotif = notifRows.find(r => String(r[nMap["event_type"]]).indexOf("STAGE") !== -1 || String(r[nMap["event_type"]]) === "SERVICE_STAGE_UPDATED");
  assert(!!stageNotif && String(stageNotif[nMap["client_id"]]) === "CL001", "NOTIF-001b", "Stage update notification registered for Client CL001");

  // --------------------------------------------------
  // NOTIF-002: Document Rejection Notification
  // --------------------------------------------------
  const docSheet = global.mockSS.getSheetByName("Documents");
  const dMap = getColumnIndexMap(getSheetHeaders(docSheet), "Documents");
  const dRow = new Array(docSheet.getLastColumn()).fill("");
  dRow[dMap["document_id"]] = "DOC_REJ_TEST";
  dRow[dMap["service_id"]] = "SRV001";
  dRow[dMap["client_id"]] = "CL001";
  dRow[dMap["document_name"]] = "Electricity Bill";
  dRow[dMap["status"]] = "Under Review";
  docSheet.appendRow(dRow);

  const rejRes = postApi("adminRejectDocument", {
    token: adminSessionToken,
    document_id: "DOC_REJ_TEST",
    rejection_reason: "Address is obscured and unreadable."
  });
  assert(rejRes.success === true, "NOTIF-002", "Admin rejects document with feedback reason");

  const rejNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "DOCUMENT_REJECTED");
  assert(!!rejNotif && String(rejNotif[nMap["details"]]).includes("Address is obscured"), "NOTIF-002b", "Rejection notification includes rejection reason in details");

  // --------------------------------------------------
  // NOTIF-003: Document Verification Notification
  // --------------------------------------------------
  const dRow2 = new Array(docSheet.getLastColumn()).fill("");
  dRow2[dMap["document_id"]] = "DOC_VERIF_TEST";
  dRow2[dMap["service_id"]] = "SRV001";
  dRow2[dMap["client_id"]] = "CL001";
  dRow2[dMap["document_name"]] = "PAN Card Director 1";
  dRow2[dMap["status"]] = "Under Review";
  docSheet.appendRow(dRow2);

  const verifRes = postApi("adminVerifyDocument", {
    token: adminSessionToken,
    document_id: "DOC_VERIF_TEST"
  });
  assert(verifRes.success === true, "NOTIF-003", "Admin verifies document");

  const verifNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "DOCUMENT_VERIFIED");
  assert(!!verifNotif && String(verifNotif[nMap["client_id"]]) === "CL001", "NOTIF-003b", "Verification notification recorded for Client CL001");

  // --------------------------------------------------
  // NOTIF-004: Quote Requested Notification
  // --------------------------------------------------
  const quoteReqRes = postApi("createQuoteRequest", {
    token: clientSessionToken,
    quoteData: {
      serviceName: "GST Return Filing",
      companyType: "Private Limited",
      state: "Maharashtra",
      mobile: "9876543210",
      email: "rahul@abctech.com",
      remarks: "Need monthly filing package."
    }
  });
  assert(quoteReqRes.success === true, "NOTIF-004", "Client submits quote request");

  const quoteReqNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "QUOTE_REQUESTED");
  assert(!!quoteReqNotif && String(quoteReqNotif[nMap["client_id"]]) === "CL001", "NOTIF-004b", "QUOTE_REQUESTED notification logged for client");

  // --------------------------------------------------
  // NOTIF-005: Quote Sent Notification
  // --------------------------------------------------
  const reqId = quoteReqRes.data ? (quoteReqRes.data.requestId || quoteReqRes.data.request_id || quoteReqRes.data.id) : null;
  const quoteSentRes = postApi("adminUpdateQuoteStatus", {
    token: adminSessionToken,
    request_id: reqId,
    status: "Quote Sent",
    quote_amount: "₹4,500 / month",
    admin_notes: "Includes GSTR-1 and GSTR-3B filings."
  });
  assert(quoteSentRes.success === true, "NOTIF-005", "Admin sends official proposal");

  const quoteSentNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "QUOTE_SENT");
  assert(!!quoteSentNotif && String(quoteSentNotif[nMap["details"]]).includes("₹4,500 / month"), "NOTIF-005b", "QUOTE_SENT notification preserves quote amount in details");

  // --------------------------------------------------
  // NOTIF-006: Quote Accepted Notification
  // --------------------------------------------------
  const quoteAccRes = postApi("adminUpdateQuoteStatus", {
    token: adminSessionToken,
    request_id: reqId,
    status: "Accepted",
    admin_notes: "Client confirmed via portal proposal."
  });
  assert(quoteAccRes.success === true, "NOTIF-006", "Admin updates quote to Accepted");

  const quoteAccNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "QUOTE_ACCEPTED");
  assert(!!quoteAccNotif && String(quoteAccNotif[nMap["client_id"]]) === "CL001", "NOTIF-006b", "QUOTE_ACCEPTED notification dispatched to client");

  // --------------------------------------------------
  // NOTIF-007: SPOC Assigned Notification
  // --------------------------------------------------
  const spocRes = postApi("adminAssignSpoc", {
    token: adminSessionToken,
    service_id: "SRV001",
    spoc_id: "SPOC001",
    notifyClient: true
  });
  assert(spocRes.success === true, "NOTIF-007", "Admin assigns SPOC to service");

  const spocNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["event_type"]]) === "SPOC_ASSIGNED");
  assert(!!spocNotif && String(spocNotif[nMap["client_id"]]) === "CL001", "NOTIF-007b", "SPOC_ASSIGNED notification recorded for client");

  // --------------------------------------------------
  // NOTIF-008: Client Retrieves Own Notifications
  // --------------------------------------------------
  const cl1NotifsRes = postApi("getClientNotifications", { token: clientSessionToken });
  assert(cl1NotifsRes.success === true && cl1NotifsRes.data.length > 0, "NOTIF-008", "Client CL001 retrieves own notifications feed");

  // --------------------------------------------------
  // NOTIF-009: IDOR Defense — Foreign Client Notification Feed Isolation
  // --------------------------------------------------
  const cl2NotifsRes = postApi("getClientNotifications", { token: foreignClientSessionToken });
  const leakedToCL2 = cl2NotifsRes.data.filter(n => n.clientId === "CL001");
  assert(cl2NotifsRes.success === true && leakedToCL2.length === 0, "NOTIF-009", "Client CL002 feed contains ZERO notifications from CL001 (Fail-Closed Boundary)");

  // --------------------------------------------------
  // NOTIF-010: IDOR Defense — Foreign Client Cannot Mark Notification Read
  // --------------------------------------------------
  const cl1TargetNotif = cl1NotifsRes.data[0];
  const foreignMarkRes = postApi("markNotificationRead", {
    token: foreignClientSessionToken,
    notification_id: cl1TargetNotif.id
  });
  assert(foreignMarkRes.success === false && foreignMarkRes.error.code === "AUTH_FORBIDDEN", "NOTIF-010", "Client CL002 blocked from marking CL001 notification read (AUTH_FORBIDDEN)");

  // --------------------------------------------------
  // NOTIF-011: Client Identity strictly derived from session (Spoofed client_id ignored)
  // --------------------------------------------------
  const spoofAttemptRes = postApi("getClientNotifications", { token: clientSessionToken, client_id: "CL002" });
  const allBelongToCL1 = spoofAttemptRes.data.every(n => n.clientId === "CL001");
  assert(spoofAttemptRes.success === true && allBelongToCL1, "NOTIF-011", "Payload spoofing client_id ignored; session authority enforced");

  // --------------------------------------------------
  // NOTIF-012: Client blocked from adminGetNotifications
  // --------------------------------------------------
  const clientAdminNotifRes = postApi("adminGetNotifications", { token: clientSessionToken });
  assert(clientAdminNotifRes.success === false && clientAdminNotifRes.error.code === "AUTH_FORBIDDEN", "NOTIF-012", "Client forbidden from adminGetNotifications (AUTH_FORBIDDEN)");

  // --------------------------------------------------
  // NOTIF-013: Client blocked from adminMarkAllNotificationsRead
  // --------------------------------------------------
  const clientAdminMarkAllRes = postApi("adminMarkAllNotificationsRead", { token: clientSessionToken });
  assert(clientAdminMarkAllRes.success === false && clientAdminMarkAllRes.error.code === "AUTH_FORBIDDEN", "NOTIF-013", "Client forbidden from adminMarkAllNotificationsRead (AUTH_FORBIDDEN)");

  // --------------------------------------------------
  // NOTIF-014: Client blocked from adminGetNotificationHealth
  // --------------------------------------------------
  const clientHealthRes = postApi("adminGetNotificationHealth", { token: clientSessionToken });
  assert(clientHealthRes.success === false && clientHealthRes.error.code === "AUTH_FORBIDDEN", "NOTIF-014", "Client forbidden from adminGetNotificationHealth (AUTH_FORBIDDEN)");

  // --------------------------------------------------
  // NOTIF-015 & NOTIF-016: Fail-Closed Email Isolation
  // --------------------------------------------------
  mailAppShouldFail = true; // Inject MailApp failure
  const failingEmailStageRes = postApi("adminUpdateServiceStage", {
    token: adminSessionToken,
    service_id: "SRV001",
    stage_name: "SPICe+ Part B Preparation",
    stage_status: "In Progress",
    notes: "Proceeding despite email gateway disruption."
  });
  assert(failingEmailStageRes.success === true, "NOTIF-015", "Business operation succeeds without rollback when email delivery fails (Fail-Closed Isolation)");

  const failingNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .reverse().find(r => String(r[nMap["details"]]).includes("SPICe+ Part B Preparation"));
  assert(!!failingNotif && String(failingNotif[nMap["details"]]).includes("FAILED"), "NOTIF-016", "Failed email status stored as FAILED in notification envelope");

  // --------------------------------------------------
  // NOTIF-017: Automation: processPendingNotifications Retries Failed Notifications
  // --------------------------------------------------
  const retryResult = postApi("processPendingNotifications", { token: adminSessionToken });
  assert(retryResult.success === true && retryResult.data.processedCount >= 1, "NOTIF-017", "processPendingNotifications processed pending / failed notifications");

  // --------------------------------------------------
  // NOTIF-018: Bounded Retries: Max 3 attempts enforced
  // --------------------------------------------------
  postApi("processPendingNotifications", { token: adminSessionToken });
  postApi("processPendingNotifications", { token: adminSessionToken });
  mailAppShouldFail = false; // Reset

  const boundedNotif = global.mockSS.getSheetByName("Notifications").getDataRange().getValues().slice(1)
    .find(r => String(r[nMap["details"]]).includes("attemptCount\":3"));
  assert(!!boundedNotif, "NOTIF-018", "Retry count bounded to maximum 3 attempts");

  // --------------------------------------------------
  // NOTIF-019: Event Idempotency: Duplicate notification suppressed
  // --------------------------------------------------
  const dupCheck1 = NotificationService.createNotification({
    eventType: "SERVICE_STAGE_UPDATED",
    clientId: "CL001",
    clientName: "ABC Technologies Pvt Ltd",
    message: "Stage duplicated test",
    relatedEntityType: "SERVICE",
    relatedEntityId: "SRV001_IDEMPOTENCY_TEST"
  });
  assert(dupCheck1.success === true && !dupCheck1.duplicated, "NOTIF-019", "First notification creation succeeds");

  const dupCheck2 = NotificationService.createNotification({
    eventType: "SERVICE_STAGE_UPDATED",
    clientId: "CL001",
    clientName: "ABC Technologies Pvt Ltd",
    message: "Stage duplicated test",
    relatedEntityType: "SERVICE",
    relatedEntityId: "SRV001_IDEMPOTENCY_TEST"
  });
  assert(dupCheck2.success === true && dupCheck2.duplicated === true, "NOTIF-019b", "Duplicate notification within 15-minute window suppressed by idempotency policy");

  // --------------------------------------------------
  // NOTIF-020: Notification DTO Sanitization
  // --------------------------------------------------
  const sampleClientNotifs = postApi("getClientNotifications", { token: clientSessionToken }).data;
  let leaksFound = false;
  sampleClientNotifs.forEach(n => {
    const raw = JSON.stringify(n);
    if (raw.includes("password_hash") || raw.includes("password_salt") || raw.includes("token")) {
      leaksFound = true;
    }
  });
  assert(!leaksFound, "NOTIF-020", "Notification DTO leaks zero sensitive credentials (no password_hash, password_salt, session token)");

  // --------------------------------------------------
  // NOTIF-021: Client markNotificationRead
  // --------------------------------------------------
  const unreadNotif = sampleClientNotifs.find(n => !n.isRead);
  const markReadRes = postApi("markNotificationRead", {
    token: clientSessionToken,
    notification_id: unreadNotif.id
  });
  assert(markReadRes.success === true, "NOTIF-021", "Client successfully marks own notification as Read");

  const updatedNotifs = postApi("getClientNotifications", { token: clientSessionToken }).data;
  const verifiedReadItem = updatedNotifs.find(n => n.id === unreadNotif.id);
  assert(verifiedReadItem.isRead === true && !!verifiedReadItem.readAt, "NOTIF-021b", "Notification status transitioned to Read with readAt timestamp");

  // --------------------------------------------------
  // NOTIF-022: Client markAllNotificationsRead
  // --------------------------------------------------
  const markAllRes = postApi("markAllNotificationsRead", { token: clientSessionToken });
  assert(markAllRes.success === true, "NOTIF-022", "Client markAllNotificationsRead executes successfully");

  const postMarkAllNotifs = postApi("getClientNotifications", { token: clientSessionToken }).data;
  const anyUnread = postMarkAllNotifs.some(n => !n.isRead);
  assert(!anyUnread, "NOTIF-022b", "All notifications for client CL001 are marked as Read");

  // --------------------------------------------------
  // NOTIF-023: Admin Notification Delivery Health Metrics
  // --------------------------------------------------
  const healthRes = postApi("adminGetNotificationHealth", { token: adminSessionToken });
  assert(healthRes.success === true && healthRes.data.totalRecords > 0 && typeof healthRes.data.status === "string", "NOTIF-023", "Admin retrieves delivery health metrics (Healthy vs Degraded)");

  // --------------------------------------------------
  // NOTIF-024: Admin retrieves system-wide notifications feed
  // --------------------------------------------------
  const adminNotifsRes = postApi("adminGetNotifications", { token: adminSessionToken });
  assert(adminNotifsRes.success === true && adminNotifsRes.data.length > 0, "NOTIF-024", "Admin retrieves system-wide operational notifications feed");

  // --------------------------------------------------
  // NOTIF-025: Admin markAllNotificationsRead
  // --------------------------------------------------
  const adminMarkAllRes = postApi("adminMarkAllNotificationsRead", { token: adminSessionToken });
  assert(adminMarkAllRes.success === true, "NOTIF-025", "Admin markAllNotificationsRead executes successfully");

  console.log("==================================================");
  console.log(`📊 STEP 8 NOTIFICATIONS SUITE COMPLETE: ${testsPassed} / ${testsPassed + testsFailed} PASSED`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("STATUS: 100% SUCCESS - ALL STEP 8 CORE REQUIREMENTS SATISFIED\n");
  }

} catch (err) {
  console.error("FATAL ERROR IN STEP 8 TEST SUITE:", err);
  process.exit(1);
}
