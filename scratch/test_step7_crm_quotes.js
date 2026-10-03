/**
 * Legal Sthal - Step 7 Automated Test Suite (test_step7_crm_quotes.js)
 * 
 * Verifies Quote Requests & Proposals Workflow and Zoho CRM Synchronization:
 * - Client quote request submission with full company & contact metadata
 * - Client notification & audit logging on quote creation
 * - IDOR defense: Clients cannot read or tamper with foreign quote requests
 * - Administrative quote management: Status filtering, proposal pricing, rejection
 * - Administrative notifications on quote proposals
 * - Zoho CRM synchronization: Lead generation, Deal stage progression, Payment sync
 * - Zoho CRM sync logs queue in Schema V2 CRMSyncLogs table
 * - Health metrics aggregation (Healthy vs Degraded)
 * - Administrative single-record retry and force batch sync
 * - Strict role authorization defending CRM endpoints against non-admin clients
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock Spreadsheet Infrastructure
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
    this.id = "mock_step7_sheet_id";
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
global.MailApp = { sendEmail: () => true };
global.sendEmail = () => true;

// Load Backend Scripts
const backendDir = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend';
eval(fs.readFileSync(path.join(backendDir, 'Config.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SecurityService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'Migration.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SessionService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'AuthService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'CRMSyncService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'PortalService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'Code.gs'), 'utf8'));

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
  row1[cMap["state"]] = "Gujarat";
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

  const srow2 = new Array(srvSheet.getLastColumn()).fill("");
  srow2[sMap["service_id"]] = "SRV002";
  srow2[sMap["client_id"]] = "CL002";
  srow2[sMap["service_code"]] = "GST-REG-002";
  srow2[sMap["crm_deal_id"]] = "ZC-890125";
  srow2[sMap["service_name"]] = "GST Registration";
  srow2[sMap["total_amount"]] = 4999;
  srow2[sMap["paid_amount"]] = 4999;
  srow2[sMap["remaining_amount"]] = 0;
  srow2[sMap["status"]] = "In Progress";
  srvSheet.appendRow(srow2);

  // Add Stages for SRV001
  const stageSheet = ss.getSheetByName("ServiceStages");
  stageSheet.appendRow(["STG001_1", "SRV001", "Document Collection", "Completed", 1, "2026-01-05T00:00:00.000Z", "2026-01-07T00:00:00.000Z", 2, ""]);
  stageSheet.appendRow(["STG001_2", "SRV001", "DSC Preparation", "Completed", 2, "2026-01-07T00:00:00.000Z", "2026-01-09T00:00:00.000Z", 2, "STG001_1"]);
  stageSheet.appendRow(["STG001_3", "SRV001", "SPICe+ Part A Approval", "In Progress", 3, "2026-01-09T00:00:00.000Z", "", 3, "STG001_2"]);
  stageSheet.appendRow(["STG001_4", "SRV001", "SPICe+ Part B Preparation", "Pending", 4, "", "", 4, "STG001_3"]);
  stageSheet.appendRow(["STG001_5", "SRV001", "Certificate Issued", "Pending", 5, "", "", 2, "STG001_4"]);

  // 4. Add Admin
  const adminSheet = ss.getSheetByName("AdminUsers");
  const aMap = getColumnIndexMap(getSheetHeaders(adminSheet), "AdminUsers");
  const aSalt = SecurityService.generateSalt();
  const aHash = SecurityService.hashPassword("SuperAdmin@2026", aSalt);
  const aRow = new Array(adminSheet.getLastColumn()).fill("");
  aRow[aMap["admin_id"]] = "ADM001";
  aRow[aMap["name"]] = "Operations Admin";
  aRow[aMap["email"]] = "admin@legalsthal.com";
  aRow[aMap["password_hash"]] = aHash;
  aRow[aMap["password_salt"]] = aSalt;
  aRow[aMap["role"]] = "ADMIN";
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

// Test Execution
let passed = 0;
let failed = 0;
const results = [];

function assert(id, desc, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`[PASS] ${id}: ${desc}${detail ? ' -> ' + detail : ''}`);
    results.push({ id, desc, status: 'PASS', detail });
  } else {
    failed++;
    console.error(`[FAIL] ${id}: ${desc}${detail ? ' -> ' + detail : ''}`);
    results.push({ id, desc, status: 'FAIL', detail });
  }
}

console.log("==================================================");
console.log("📋 STARTING STEP 7 QUOTE REQUESTS & CRM SYNC SUITE");
console.log("==================================================");

setupDatabaseWithSeedData();

// Authenticate Sessions
const clientLogin = postApi("login", { login_id: "rahul@abctech.com", password: "LegalClient@2026" });
const clientSessionToken = clientLogin.data ? clientLogin.data.token : null;

const foreignLogin = postApi("login", { login_id: "sneha@xyzretail.com", password: "LegalClient@2026" });
const foreignClientSessionToken = foreignLogin.data ? foreignLogin.data.token : null;

const adminLogin = postApi("login", { login_id: "admin@legalsthal.com", password: "SuperAdmin@2026" });
const adminSessionToken = adminLogin.data ? adminLogin.data.token : null;

let createdQuoteId = null;

// 1. Client Quote Request Submission
const quoteSubmission = postApi("createQuoteRequest", {
  token: clientSessionToken,
  quoteData: {
    serviceName: "Trademark Registration (Class 35)",
    companyType: "Private Limited",
    state: "Maharashtra",
    mobile: "9876543210",
    email: "rahul@abctech.com",
    remarks: "Need priority filing for trademark brand name."
  }
});

assert(
  "CRM-QUOTE-001",
  "Client submits quote request via createQuoteRequest",
  quoteSubmission.success && quoteSubmission.data && quoteSubmission.data.requestId && quoteSubmission.data.status === "Requested",
  `Generated Request ID: ${quoteSubmission.data ? quoteSubmission.data.requestId : 'null'}`
);

createdQuoteId = quoteSubmission.data ? quoteSubmission.data.requestId : null;

// 2. Metadata preservation
assert(
  "CRM-QUOTE-002",
  "Quote request stores all company and contact metadata",
  quoteSubmission.data && quoteSubmission.data.serviceName === "Trademark Registration (Class 35)" &&
  quoteSubmission.data.companyType === "Private Limited" &&
  quoteSubmission.data.state === "Maharashtra" &&
  quoteSubmission.data.mobile === "9876543210",
  `Company: ${quoteSubmission.data.companyType}, State: ${quoteSubmission.data.state}`
);

// 3. Client notification generated
const notifs = global.mockSS.sheets["Notifications"].data;
const quoteNotif = notifs.find(n => n[1] === "CL001" && n[3] === "QUOTE_REQUESTED");
assert(
  "CRM-QUOTE-003",
  "Quote request creates client notification in Notifications sheet",
  quoteNotif !== undefined && quoteNotif[4].includes("Trademark Registration"),
  `Notification: ${quoteNotif ? quoteNotif[4] : 'Not Found'}`
);

// 4. Audit logging
const auditRows = global.mockSS.sheets["AuditLogs"].data;
const quoteAudit = auditRows.find(a => a[4] === "CREATE_QUOTE_REQUEST");
assert(
  "CRM-QUOTE-004",
  "Quote request records entry in AuditLogs (CREATE_QUOTE_REQUEST)",
  quoteAudit !== undefined && quoteAudit[6] === createdQuoteId,
  `Audit Action: ${quoteAudit ? quoteAudit[4] : 'None'} for ID: ${createdQuoteId}`
);

// 5. Automatic CRM Lead Sync
const crmRows = global.mockSS.sheets["CRMSyncLogs"].data;
const leadSync = crmRows.find(c => c[1] === "QuoteRequest" && c[2] === createdQuoteId);
assert(
  "CRM-QUOTE-005",
  "Quote request triggers automatic lead synchronization in CRMSyncLogs",
  leadSync !== undefined && leadSync[4] === "UPSERT_LEAD" && leadSync[5] === "Synced",
  `CRM Sync ID: ${leadSync ? leadSync[0] : 'None'}, Status: ${leadSync ? leadSync[5] : 'None'}`
);

// 6. Client retrieves own quotes
const clientQuotesRes = postApi("getClientQuoteRequests", { token: clientSessionToken });
assert(
  "CRM-QUOTE-006",
  "Client retrieves own quote requests via getClientQuoteRequests",
  clientQuotesRes.success && Array.isArray(clientQuotesRes.data) && clientQuotesRes.data.length >= 1,
  `Retrieved ${clientQuotesRes.data ? clientQuotesRes.data.length : 0} quote(s) for CL001`
);

// 7. IDOR Defense: foreign client cannot see CL001 quotes
const foreignQuotesRes = postApi("getClientQuoteRequests", { token: foreignClientSessionToken });
const foreignSawCl001 = foreignQuotesRes.data && foreignQuotesRes.data.some(q => q.id === createdQuoteId);
assert(
  "CRM-QUOTE-007",
  "Client blocked from viewing foreign quote requests (IDOR Defense)",
  foreignQuotesRes.success && !foreignSawCl001,
  `Foreign client CL002 saw 0 quotes belonging to CL001`
);

// 8. Validation: Missing service name fails closed
const invalidQuoteRes = postApi("createQuoteRequest", {
  token: clientSessionToken,
  quoteData: { companyType: "Private Limited" }
});
assert(
  "CRM-QUOTE-008",
  "Validation: Missing service_name fails closed",
  !invalidQuoteRes.success && invalidQuoteRes.error && invalidQuoteRes.error.code === "VALIDATION_ERROR",
  `Blocked invalid submission: ${invalidQuoteRes.error ? invalidQuoteRes.error.message : ''}`
);

// 9. Admin retrieves all quote requests
const adminQuotesRes = postApi("adminGetQuoteRequests", { token: adminSessionToken });
assert(
  "CRM-ADMIN-QUOTE-001",
  "Admin retrieves all quote requests via adminGetQuoteRequests",
  adminQuotesRes.success && Array.isArray(adminQuotesRes.data) && adminQuotesRes.data.length >= 1,
  `Admin retrieved ${adminQuotesRes.data ? adminQuotesRes.data.length : 0} total quote request(s)`
);

// 10. Admin filters quote requests by status
const requestedFilterRes = postApi("adminGetQuoteRequests", { token: adminSessionToken, status: "Requested" });
const nonRequestedCount = requestedFilterRes.data.filter(q => q.status !== "Requested").length;
assert(
  "CRM-ADMIN-QUOTE-002",
  "Admin filters quote requests by status (Requested)",
  requestedFilterRes.success && nonRequestedCount === 0 && requestedFilterRes.data.length >= 1,
  `Filtered ${requestedFilterRes.data.length} records matching 'Requested'`
);

// 11. Client blocked from admin quote requests
const clientBlockedAdminQuotes = postApi("adminGetQuoteRequests", { token: clientSessionToken });
assert(
  "CRM-ADMIN-QUOTE-003",
  "Client forbidden from accessing adminGetQuoteRequests",
  !clientBlockedAdminQuotes.success && clientBlockedAdminQuotes.error && clientBlockedAdminQuotes.error.code === "AUTH_FORBIDDEN",
  `Blocked unauthorized client: ${clientBlockedAdminQuotes.error ? clientBlockedAdminQuotes.error.code : ''}`
);

// 12. Admin updates quote status to 'Quote Sent' with amount
const quoteSentUpdate = postApi("adminUpdateQuoteStatus", {
  token: adminSessionToken,
  quoteId: createdQuoteId,
  status: "Quote Sent",
  amount: "₹7,500 + Govt Fees",
  remarks: "Custom pricing approved for class 35 filing."
});
assert(
  "CRM-ADMIN-QUOTE-004",
  "Admin updates quote status to 'Quote Sent' with official quote amount and remarks",
  quoteSentUpdate.success && quoteSentUpdate.data.status === "Quote Sent" && quoteSentUpdate.data.quoteAmount === "₹7,500 + Govt Fees",
  `Status: ${quoteSentUpdate.data ? quoteSentUpdate.data.status : 'None'}, Amount: ${quoteSentUpdate.data ? quoteSentUpdate.data.quoteAmount : 'None'}`
);

// 13. Client notification for 'Quote Sent'
const notifRows2 = global.mockSS.sheets["Notifications"].data;
const quoteSentNotif = notifRows2.find(n => n[1] === "CL001" && n[3] === "QUOTE_SENT");
assert(
  "CRM-ADMIN-QUOTE-005",
  "Status change to 'Quote Sent' dispatches QUOTE_SENT notification to client",
  quoteSentNotif !== undefined && quoteSentNotif[4].includes("₹7,500 + Govt Fees"),
  `Notification: ${quoteSentNotif ? quoteSentNotif[4] : 'Not Found'}`
);

// 14. Admin updates quote status to 'Accepted'
const quoteAcceptedUpdate = postApi("adminUpdateQuoteStatus", {
  token: adminSessionToken,
  quoteId: createdQuoteId,
  status: "Accepted",
  remarks: "Client accepted proposal via portal."
});
assert(
  "CRM-ADMIN-QUOTE-006",
  "Admin updates quote status to 'Accepted'",
  quoteAcceptedUpdate.success && quoteAcceptedUpdate.data.status === "Accepted",
  `Status updated to: ${quoteAcceptedUpdate.data ? quoteAcceptedUpdate.data.status : 'None'}`
);

// 15. Client notification for 'Accepted'
const notifRows3 = global.mockSS.sheets["Notifications"].data;
const quoteAcceptedNotif = notifRows3.find(n => n[1] === "CL001" && n[3] === "QUOTE_ACCEPTED");
assert(
  "CRM-ADMIN-QUOTE-007",
  "Status change to 'Accepted' dispatches QUOTE_ACCEPTED notification to client",
  quoteAcceptedNotif !== undefined && quoteAcceptedNotif[4].includes("Proposal Accepted"),
  `Notification: ${quoteAcceptedNotif ? quoteAcceptedNotif[4] : 'Not Found'}`
);

// 16. Client forbidden from mutating quote status
const clientBlockedUpdate = postApi("adminUpdateQuoteStatus", {
  token: clientSessionToken,
  quoteId: createdQuoteId,
  status: "Accepted"
});
assert(
  "CRM-ADMIN-QUOTE-008",
  "Client forbidden from mutating quote status (AUTH_FORBIDDEN)",
  !clientBlockedUpdate.success && clientBlockedUpdate.error && clientBlockedUpdate.error.code === "AUTH_FORBIDDEN",
  `Blocked with code: ${clientBlockedUpdate.error ? clientBlockedUpdate.error.code : ''}`
);

// 17. Validation: Invalid status fails closed
const invalidStatusUpdate = postApi("adminUpdateQuoteStatus", {
  token: adminSessionToken,
  quoteId: createdQuoteId,
  status: "RandomBadStatus"
});
assert(
  "CRM-ADMIN-QUOTE-009",
  "Validation: Invalid status fails closed with VALIDATION_ERROR",
  !invalidStatusUpdate.success && invalidStatusUpdate.error && invalidStatusUpdate.error.code === "VALIDATION_ERROR",
  `Blocked invalid status: ${invalidStatusUpdate.error ? invalidStatusUpdate.error.message : ''}`
);

// 18. Audit log for quote status update
const updateAudit = global.mockSS.sheets["AuditLogs"].data.find(a => a[4] === "UPDATE_QUOTE_STATUS" && a[6] === createdQuoteId);
assert(
  "CRM-ADMIN-QUOTE-010",
  "Quote status update records entry in AuditLogs (UPDATE_QUOTE_STATUS)",
  updateAudit !== undefined && updateAudit[3] === "ADMIN",
  `Logged audit by user: ${updateAudit ? updateAudit[2] : 'None'}`
);

// 19. Service stage update triggers CRM deal stage sync
const stageUpdateRes = postApi("adminUpdateServiceStage", {
  token: adminSessionToken,
  serviceId: "SRV001",
  stageIndex: 3, // SPICe+ Part B Preparation
  remarks: "Advancing to Part B for Zoho deal sync test"
});
assert(
  "CRM-SYNC-001",
  "Service stage update automatically triggers Zoho CRM Deal stage synchronization",
  stageUpdateRes.success && stageUpdateRes.data.currentStageIndex === 3,
  `Advanced stage to index: ${stageUpdateRes.data ? stageUpdateRes.data.currentStageIndex : 'None'}`
);

// 20. Service stage sync log created in CRMSyncLogs
const dealSyncLog = global.mockSS.sheets["CRMSyncLogs"].data.find(c => c[1] === "Service" && c[2] === "SRV001" && c[4] === "UPDATE_DEAL_STAGE");
assert(
  "CRM-SYNC-002",
  "Service stage sync creates log entry in Schema V2 CRMSyncLogs table",
  dealSyncLog !== undefined && dealSyncLog[3] === "ZC-890124" && dealSyncLog[5] === "Synced",
  `Sync ID: ${dealSyncLog ? dealSyncLog[0] : 'None'}, Deal ID: ${dealSyncLog ? dealSyncLog[3] : 'None'}, Status: ${dealSyncLog ? dealSyncLog[5] : 'None'}`
);

// 21. Payment sync operation
const paymentSyncRes = CRMSyncService.syncPayment("SRV001", 14999, 14999, 0);
const paymentSyncLog = global.mockSS.sheets["CRMSyncLogs"].data.find(c => c[2] === "SRV001" && c[4] === "SYNC_PAYMENT");
assert(
  "CRM-SYNC-003",
  "Payment sync creates log entry with SYNC_PAYMENT operation in CRMSyncLogs",
  paymentSyncRes.success && paymentSyncLog !== undefined && paymentSyncLog[5] === "Synced",
  `Payment sync operation recorded: ${paymentSyncLog ? paymentSyncLog[4] : 'None'}`
);

// 22. Admin retrieves CRM sync overview metrics
// Inject a failed record to test degraded health detection and manual retry
global.mockSS.sheets["CRMSyncLogs"].appendRow([
  "SYNC_TEST_FAIL_001",
  "Service",
  "SRV002",
  "ZC-890125",
  "UPDATE_DEAL_STAGE",
  "Failed",
  1,
  "Zoho CRM API rate limit exceeded.",
  new Date().toISOString(),
  "",
  ""
]);

const crmOverviewRes = postApi("adminGetCrmSync", { token: adminSessionToken });
assert(
  "CRM-SYNC-004",
  "Admin retrieves CRM sync overview metrics with Degraded status upon failure",
  crmOverviewRes.success && crmOverviewRes.data.status === "Degraded" && crmOverviewRes.data.failedRecords >= 1 && Array.isArray(crmOverviewRes.data.records),
  `Health Status: ${crmOverviewRes.data.status}, Successful: ${crmOverviewRes.data.successfulRecords}, Failed: ${crmOverviewRes.data.failedRecords}`
);

// 23. Client blocked from admin CRM sync overview
const clientBlockedCrm = postApi("adminGetCrmSync", { token: clientSessionToken });
assert(
  "CRM-SYNC-005",
  "Client blocked from accessing admin CRM sync overview (AUTH_FORBIDDEN)",
  !clientBlockedCrm.success && clientBlockedCrm.error && clientBlockedCrm.error.code === "AUTH_FORBIDDEN",
  `Blocked client with code: ${clientBlockedCrm.error ? clientBlockedCrm.error.code : ''}`
);

// 24. Admin manually retries failed CRM sync record
const retryRes = postApi("adminRetryCrmSync", { token: adminSessionToken, syncId: "SYNC_TEST_FAIL_001" });
const updatedFailedRow = global.mockSS.sheets["CRMSyncLogs"].data.find(c => c[0] === "SYNC_TEST_FAIL_001");
assert(
  "CRM-SYNC-006",
  "Admin successfully retries failed CRM sync record by sync_id, incrementing attempt count",
  retryRes.success && updatedFailedRow !== undefined && updatedFailedRow[5] === "Synced" && updatedFailedRow[6] === 2,
  `Retried sync status: ${updatedFailedRow ? updatedFailedRow[5] : 'None'}, Attempt count: ${updatedFailedRow ? updatedFailedRow[6] : 0}`
);

// 25. Admin triggers force batch sync
// Inject another pending retry
global.mockSS.sheets["CRMSyncLogs"].appendRow([
  "SYNC_PENDING_002",
  "QuoteRequest",
  "QR_999",
  "ZL-999",
  "UPSERT_LEAD",
  "Pending Retry",
  1,
  "Network timeout",
  new Date().toISOString(),
  "",
  ""
]);

const forceSyncRes = postApi("adminTriggerForceSync", { token: adminSessionToken });
const pendingRow = global.mockSS.sheets["CRMSyncLogs"].data.find(c => c[0] === "SYNC_PENDING_002");
assert(
  "CRM-SYNC-007",
  "Admin triggers force batch sync on pending/failed CRM records",
  forceSyncRes.success && forceSyncRes.data.retriedCount >= 1 && pendingRow[5] === "Synced",
  `Batch force retried ${forceSyncRes.data.retriedCount} record(s). Pending row transitioned to: ${pendingRow[5]}`
);

console.log("==================================================");
console.log(`📊 STEP 7 CRM & QUOTES SUITE COMPLETE: ${passed} / ${passed + failed} PASSED`);
console.log("==================================================");

if (failed === 0) {
  console.log("STATUS: 100% SUCCESS - ALL STEP 7 CORE REQUIREMENTS SATISFIED");
  process.exit(0);
} else {
  console.error(`STATUS: ${failed} TEST(S) FAILED`);
  process.exit(1);
}
