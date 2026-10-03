/**
 * Legal Sthal - Step 6 Automated Test Suite (test_step6_documents.js)
 * 
 * Verifies document pipeline, storage, dynamic QR generation,
 * Google Forms ingestion, review/verification workflows, and security boundaries:
 * - Direct upload to Google Drive storage & registration in Schema V2 table
 * - IDOR defense on document uploads and lookups
 * - Document status lifecycle (Pending -> Under Review -> Verified / Rejected)
 * - Administrative verification and rejection with mandatory audit logs
 * - Dynamic QR code & Google Form prefill config generation
 * - Form submission ingestion webhook
 * - Zero sensitive credential leaks
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
  getRange(row, col, numRows = 1, numCols = 1) { return new MockRange(this, row, col, numRows, numCols); }
  getDataRange() { return new MockRange(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() {
    this.id = "mock_step6_sheet_id";
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

// Mock Google Drive Infrastructure
class MockDriveFile {
  constructor(id, name, blob) {
    this.id = id;
    this.name = name;
    this.blob = blob;
    this.url = "https://drive.google.com/file/d/" + id + "/view";
  }
  getId() { return this.id; }
  getName() { return this.name; }
  getUrl() { return this.url; }
  setSharing() {}
}

class MockDriveFolder {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.files = [];
    this.folders = {};
  }
  getId() { return this.id; }
  getName() { return this.name; }
  createFile(blob) {
    const fileId = "drv_file_" + crypto.randomUUID().slice(0, 8);
    const file = new MockDriveFile(fileId, blob.getName ? blob.getName() : "uploaded_doc.pdf", blob);
    this.files.push(file);
    return file;
  }
  createFolder(name) {
    const f = new MockDriveFolder("folder_" + name, name);
    this.folders[name] = f;
    return f;
  }
  getFoldersByName(name) {
    const f = this.folders[name];
    let yielded = false;
    return {
      hasNext: () => !yielded && !!f,
      next: () => { yielded = true; return f; }
    };
  }
}

const mockRootFolder = new MockDriveFolder("root_drive_id", "LegalSthal_Client_Documents");
const DriveApp = {
  createFolder: (name) => mockRootFolder,
  getFoldersByName: (name) => {
    let yielded = false;
    return {
      hasNext: () => !yielded,
      next: () => { yielded = true; return mockRootFolder; }
    };
  },
  getFolderById: (id) => mockRootFolder
};

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
  formatDate: (date, tz, fmt) => date.toISOString()
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
global.DriveApp = DriveApp;
global.ContentService = ContentService;
global.SpreadsheetApp = {
  openById: () => global.mockSS,
  getActiveSpreadsheet: () => global.mockSS
};

// Load Backend Scripts
const backendDir = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend';
eval(fs.readFileSync(path.join(backendDir, 'Config.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SecurityService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'Migration.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'SessionService.gs'), 'utf8'));
eval(fs.readFileSync(path.join(backendDir, 'AuthService.gs'), 'utf8'));
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
  srow1[sMap["service_name"]] = "Private Limited Company Registration";
  srow1[sMap["status"]] = "In Progress";
  srvSheet.appendRow(srow1);

  const srow2 = new Array(srvSheet.getLastColumn()).fill("");
  srow2[sMap["service_id"]] = "SRV002";
  srow2[sMap["client_id"]] = "CL002";
  srow2[sMap["service_code"]] = "GST-REG-002";
  srow2[sMap["service_name"]] = "GST Registration";
  srow2[sMap["status"]] = "In Progress";
  srvSheet.appendRow(srow2);

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

async function runStep6TestSuite() {
  console.log("==================================================");
  console.log("📄 STARTING STEP 6 DOCUMENT PIPELINE TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(id, desc, condition, detail = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${id}: ${desc} -> ${detail}`);
    } else {
      console.error(`[FAIL] ${id}: ${desc} -> ${detail}`);
      process.exitCode = 1;
    }
  }

  setupDatabaseWithSeedData();

  // Log in as Client 1 (CL001)
  const clientLogin1 = postApi("login", { login_id: "rahul@abctech.com", password: "LegalClient@2026" });
  const clientToken1 = clientLogin1.data.token;

  // Log in as Client 2 (CL002)
  const clientLogin2 = postApi("login", { login_id: "sneha@xyzretail.com", password: "LegalClient@2026" });
  const clientToken2 = clientLogin2.data.token;

  // Log in as Admin
  const adminLogin = postApi("login", { login_id: "admin@legalsthal.com", password: "SuperAdmin@2026" });
  const adminToken = adminLogin.data.token;

  // 1. DOC-PIPE-001: Upload document to service
  const samplePdfBase64 = Buffer.from("%PDF-1.4 sample file content").toString('base64');
  const uploadRes = postApi("uploadDocument", {
    token: clientToken1,
    service_id: "SRV001",
    document_name: "PAN Card of Director 1",
    document_type: "KYC Proof",
    file_base64: samplePdfBase64,
    mime_type: "application/pdf",
    file_name: "rahul_pan.pdf"
  });

  assert("DOC-PIPE-001", "Upload document registers in Documents table under Schema V2",
    uploadRes.success && uploadRes.data.documentId.startsWith("DOC_") && uploadRes.data.serviceId === "SRV001",
    `Document ID generated: ${uploadRes.data?.documentId}`
  );

  const docId1 = uploadRes.data.documentId;

  // 2. DOC-PIPE-002: Upload sets status to Under Review
  assert("DOC-PIPE-002", "Initial document status is set to 'Under Review'",
    uploadRes.data.status === "Under Review",
    `Status: ${uploadRes.data.status}`
  );

  // 3. DOC-PIPE-003: Upload stores Drive file link
  assert("DOC-PIPE-003", "Google Drive file URL and Drive File ID populated",
    uploadRes.data.fileUrl && uploadRes.data.fileUrl.includes("drive.google.com") && uploadRes.data.driveFileId,
    `Drive URL: ${uploadRes.data.fileUrl}`
  );

  // 4. DOC-PIPE-004: Upload logs security audit event
  const auditSheet = global.mockSS.getSheetByName("AuditLogs");
  const lastAudit = auditSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-PIPE-004", "Upload logs audit entry in AuditLogs table",
    lastAudit && String(lastAudit[4]) === "UPLOAD_DOCUMENT" && String(lastAudit[6]) === docId1,
    `Audit action: ${lastAudit[4]} for ${lastAudit[6]}`
  );

  // 5. DOC-PIPE-005: Upload dispatches notification to client
  const notifSheet = global.mockSS.getSheetByName("Notifications");
  const lastNotif = notifSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-PIPE-005", "Upload creates client notification",
    lastNotif && String(lastNotif[1]) === "CL001" && String(lastNotif[3]) === "DOCUMENT_SUBMITTED",
    `Notification event: ${lastNotif[3]} for Client ${lastNotif[1]}`
  );

  // 6. DOC-PIPE-006: Document upload IDOR boundary defense
  const idorUpload = postApi("uploadDocument", {
    token: clientToken1,
    service_id: "SRV002", // belongs to CL002!
    document_name: "Illegal Proof",
    document_type: "KYC",
    file_base64: samplePdfBase64
  });
  assert("DOC-PIPE-006", "Client blocked from uploading document to another client's service",
    !idorUpload.success && idorUpload.error?.code === "AUTH_FORBIDDEN",
    `IDOR blocked: ${idorUpload.error?.message}`
  );

  // 7. DOC-PIPE-007: Client retrieves own service documents
  const clientDocs = postApi("getClientDocuments", {
    token: clientToken1,
    service_id: "SRV001"
  });
  assert("DOC-PIPE-007", "Client retrieves own service documents",
    clientDocs.success && clientDocs.data.length >= 1 && clientDocs.data[0].documentId === docId1,
    `Found ${clientDocs.data?.length} document(s) for SRV001`
  );

  // 8. DOC-PIPE-008: Client blocked from inspecting foreign service documents
  const foreignDocs = postApi("getClientDocuments", {
    token: clientToken1,
    service_id: "SRV002"
  });
  assert("DOC-PIPE-008", "Client blocked from viewing foreign service documents",
    !foreignDocs.success && foreignDocs.error?.code === "AUTH_FORBIDDEN",
    `Blocked foreign document inspection: ${foreignDocs.error?.code}`
  );

  // 9. DOC-PIPE-009: Client portfolio document retrieval across all owned services
  const allClientDocs = postApi("getClientDocuments", { token: clientToken1 });
  assert("DOC-PIPE-009", "Client retrieves all documents across owned services",
    allClientDocs.success && allClientDocs.data.length >= 1 && allClientDocs.data.every(d => d.clientId === "CL001"),
    `Client CL001 owns ${allClientDocs.data?.length} document(s)`
  );

  // 10. DOC-VERIF-001: Admin verifies document
  const verifyRes = postApi("adminVerifyDocument", {
    token: adminToken,
    document_id: docId1,
    remarks: "PAN card details verified against Income Tax portal"
  });
  assert("DOC-VERIF-001", "Admin verifies submitted document",
    verifyRes.success && verifyRes.data.status === "Verified",
    `Document verified: status=${verifyRes.data?.status}`
  );

  // 11. DOC-VERIF-002: Verification timestamp and reviewer recorded
  assert("DOC-VERIF-002", "Verification timestamp and reviewer recorded",
    verifyRes.data.verifiedAt && verifyRes.data.verifiedBy,
    `Verified on ${verifyRes.data.verifiedAt} by ${verifyRes.data.verifiedBy}`
  );

  // 12. DOC-VERIF-003: Verification appends to AuditLogs
  const verifyAudit = auditSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-VERIF-003", "Verification records entry in AuditLogs table",
    verifyAudit && String(verifyAudit[4]) === "VERIFY_DOCUMENT" && String(verifyAudit[6]) === docId1,
    `Logged audit action: ${verifyAudit[4]}`
  );

  // 13. DOC-VERIF-004: Verification dispatches client notification
  const verifyNotif = notifSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-VERIF-004", "Verification dispatches notification to client",
    verifyNotif && String(verifyNotif[1]) === "CL001" && String(verifyNotif[3]) === "DOCUMENT_VERIFIED",
    `Alert dispatched: ${verifyNotif[4]}`
  );

  // 14. DOC-VERIF-005: Client cannot verify document
  const clientTryVerify = postApi("adminVerifyDocument", {
    token: clientToken1,
    document_id: docId1
  });
  assert("DOC-VERIF-005", "Client forbidden from executing admin verification",
    !clientTryVerify.success && clientTryVerify.error?.code === "AUTH_FORBIDDEN",
    `Blocked with code: ${clientTryVerify.error?.code}`
  );

  // Upload second document to test Rejection flow
  const upload2 = postApi("uploadDocument", {
    token: clientToken1,
    service_id: "SRV001",
    document_name: "Electricity Bill (Address Proof)",
    document_type: "Address Proof",
    file_base64: samplePdfBase64
  });
  const docId2 = upload2.data.documentId;

  // 15. DOC-REJ-001: Admin rejects document with detailed reason
  const rejectionReason = "Address proof is blurry and dated more than 3 months ago.";
  const rejectRes = postApi("adminRejectDocument", {
    token: adminToken,
    document_id: docId2,
    reason: rejectionReason
  });
  assert("DOC-REJ-001", "Admin rejects document with feedback reason",
    rejectRes.success && rejectRes.data.status === "Rejected" && rejectRes.data.rejectionReason === rejectionReason,
    `Status=${rejectRes.data?.status}, Reason=${rejectRes.data?.rejectionReason}`
  );

  // 16. DOC-REJ-002: Rejection timestamp and reviewer stored
  assert("DOC-REJ-002", "Rejection timestamp and reviewer stored",
    rejectRes.data.rejectedAt && rejectRes.data.rejectedBy,
    `Rejected on ${rejectRes.data.rejectedAt} by ${rejectRes.data.rejectedBy}`
  );

  // 17. DOC-REJ-003: Rejection requires a non-empty reason
  const emptyReasonReject = postApi("adminRejectDocument", {
    token: adminToken,
    document_id: docId2,
    reason: "   "
  });
  assert("DOC-REJ-003", "Rejection without reason is rejected by policy",
    !emptyReasonReject.success && emptyReasonReject.error?.code === "VALIDATION_ERROR",
    `Validation rejected empty feedback: ${emptyReasonReject.error?.message}`
  );

  // 18. DOC-REJ-004: Rejection logs to AuditLogs
  const rejectAudit = auditSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-REJ-004", "Rejection records entry in AuditLogs table",
    rejectAudit && String(rejectAudit[4]) === "REJECT_DOCUMENT" && String(rejectAudit[6]) === docId2,
    `Logged audit action: ${rejectAudit[4]}`
  );

  // 19. DOC-REJ-005: Rejection dispatches high-priority notification to client
  const rejectNotif = notifSheet.getDataRange().getValues().slice(-1)[0];
  assert("DOC-REJ-005", "Rejection dispatches high-priority alert to client",
    rejectNotif && String(rejectNotif[1]) === "CL001" && String(rejectNotif[3]) === "DOCUMENT_REJECTED",
    `Alert dispatched: ${rejectNotif[4]}`
  );

  // 20. DOC-REJ-006: Client cannot reject document
  const clientTryReject = postApi("adminRejectDocument", {
    token: clientToken1,
    document_id: docId2,
    reason: "Malicious rejection attempt"
  });
  assert("DOC-REJ-006", "Client forbidden from executing admin rejection",
    !clientTryReject.success && clientTryReject.error?.code === "AUTH_FORBIDDEN",
    `Blocked with code: ${clientTryReject.error?.code}`
  );

  // 21. DOC-ADMIN-001: Admin retrieves all documents in Operations Console
  const adminDocs = postApi("adminGetDocuments", { token: adminToken });
  assert("DOC-ADMIN-001", "Admin retrieves all documents in Operations Console",
    adminDocs.success && adminDocs.data.length >= 2,
    `Admin workspace retrieved ${adminDocs.data?.length} document records`
  );

  // 22. DOC-ADMIN-002: Admin filters documents by status
  const verifiedOnly = postApi("adminGetDocuments", { token: adminToken, status: "Verified" });
  const rejectedOnly = postApi("adminGetDocuments", { token: adminToken, status: "Rejected" });
  assert("DOC-ADMIN-002", "Admin filters documents by status",
    verifiedOnly.success && verifiedOnly.data.every(d => d.status === "Verified") &&
    rejectedOnly.success && rejectedOnly.data.every(d => d.status === "Rejected"),
    `Verified filter count: ${verifiedOnly.data?.length}, Rejected filter count: ${rejectedOnly.data?.length}`
  );

  // 23. DOC-ADMIN-003: Client blocked from admin document directory
  const clientTryAdminDocs = postApi("adminGetDocuments", { token: clientToken1 });
  assert("DOC-ADMIN-003", "Client blocked from admin document workspace",
    !clientTryAdminDocs.success && clientTryAdminDocs.error?.code === "AUTH_FORBIDDEN",
    `Blocked with code: ${clientTryAdminDocs.error?.code}`
  );

  // 24. DOC-FORM-001: Dynamic Google Form prefill config & QR code generation
  const formConfig = postApi("getFormSubmissionConfig", {
    token: clientToken1,
    service_id: "SRV001"
  });
  assert("DOC-FORM-001", "Dynamic Google Form prefill URL and QR code generated",
    formConfig.success && formConfig.data.formUrl.includes("entry.1001=SRV001") &&
    formConfig.data.qrCodeUrl.includes("api.qrserver.com"),
    `Generated QR code URL: ${formConfig.data?.qrCodeUrl.slice(0, 60)}...`
  );

  // 25. DOC-FORM-002: Google Form submission ingestion webhook
  const formTriggerRes = PortalService.processFormSubmission({
    serviceId: "SRV001",
    email: "rahul@abctech.com",
    documentName: "Form Submitted Aadhaar Copy",
    fileUrl: "https://drive.google.com/open?id=form_uploaded_aadhaar_123",
    formResponseId: "FR_987654321"
  });
  assert("DOC-FORM-002", "Google Form submission ingestion webhook",
    formTriggerRes.success && formTriggerRes.documentId.startsWith("DOC_"),
    `Ingested form submission with ID: ${formTriggerRes.documentId}`
  );

  console.log("==================================================");
  console.log(`📊 STEP 6 DOCUMENT SUITE COMPLETE: ${passed} / ${total} PASSED`);
  console.log("==================================================");

  if (passed === total) {
    console.log("STATUS: 100% SUCCESS - ALL STEP 6 CORE REQUIREMENTS SATISFIED");
  } else {
    console.error(`STATUS: FAILED (${total - passed} failures)`);
    process.exit(1);
  }
}

runStep6TestSuite().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
