/**
 * Legal Sthal - Step 5 Automated Test Suite (test_step5_portal.js)
 * 
 * Verifies live client and admin portal core functionality:
 * - IDOR defense & server-side identity derivation
 * - Client profile, dashboard, services, stages, notifications
 * - Financial calculation consistency (remaining = total - paid)
 * - 1-Client to Many-Services relational mapping
 * - Admin dashboard metrics, client directory with search/filtering
 * - Admin stage updates with StageHistory and AuditLogs
 * - Admin SPOC assignments
 * - Strict authorization boundaries
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock Sheet Infrastructure
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
    this.id = "mock_step5_sheet_id";
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
  newBlob: (str) => ({
    getDataAsString: () => str,
    getBytes: () => Buffer.from(str, 'utf8')
  }),
  computeDigest: (algo, value) => {
    const buf = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : String(value));
    const hash = crypto.createHash('sha256').update(buf).digest();
    return Array.from(new Int8Array(hash.buffer, hash.byteOffset, hash.length));
  },
  computeHmacSha256Signature: (val, key) => {
    const valBuf = Buffer.isBuffer(val) ? val : Buffer.from(typeof val === 'string' ? val : String(val));
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(typeof key === 'string' ? key : String(key));
    const hmac = crypto.createHmac('sha256', keyBuf).update(valBuf).digest();
    return Array.from(new Int8Array(hmac.buffer, hmac.byteOffset, hmac.length));
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

// Global environment
global.PropertiesService = PropertiesService;
global.LockService = LockService;
global.Logger = Logger;
global.Utilities = Utilities;
global.ContentService = ContentService;
global.SpreadsheetApp = {
  openById: () => global.mockSS,
  getActiveSpreadsheet: () => global.mockSS
};

// Load Backend Scripts
const backendDir = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend';
const configSrc = fs.readFileSync(path.join(backendDir, 'Config.gs'), 'utf8');
const migrationSrc = fs.readFileSync(path.join(backendDir, 'Migration.gs'), 'utf8');
const securitySrc = fs.readFileSync(path.join(backendDir, 'SecurityService.gs'), 'utf8');
const sessionSrc = fs.readFileSync(path.join(backendDir, 'SessionService.gs'), 'utf8');
const authSrc = fs.readFileSync(path.join(backendDir, 'AuthService.gs'), 'utf8');
const portalSrc = fs.readFileSync(path.join(backendDir, 'PortalService.gs'), 'utf8');
const codeSrc = fs.readFileSync(path.join(backendDir, 'Code.gs'), 'utf8');

eval(configSrc);
eval(migrationSrc);
eval(securitySrc);
eval(sessionSrc);
eval(authSrc);
eval(portalSrc);
eval(codeSrc);

// Populate Mock Database with Initial Test Dataset
function setupTestDatabase() {
  global.mockSS = new MockSpreadsheet();
  migrateDatabase();

  const ss = global.mockSS;

  // 1. Add SPOCs
  const spocSheet = ss.getSheetByName("SPOCs");
  spocSheet.appendRow([
    "SPOC001", "Priya Sharma", "Senior Legal Specialist", "+91 98200 11223", "priya@legalsthal.com", 12, "Active", "https://avatar.url/1", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"
  ]);
  spocSheet.appendRow([
    "SPOC002", "Ankit Verma", "Compliance Manager", "+91 98200 44556", "ankit@legalsthal.com", 8, "Active", "https://avatar.url/2", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"
  ]);

  // 2. Add Clients (CL001: ABC Tech, CL002: XYZ Retail)
  const clientSheet = ss.getSheetByName("Clients");
  const cMap = getColumnIndexMap(getSheetHeaders(clientSheet), "Clients");

  // Client 1: ABC Technologies
  const salt1 = SecurityService.generateSalt();
  const hash1 = SecurityService.hashPassword("LegalClient@2026", salt1);
  const row1 = new Array(clientSheet.getLastColumn()).fill("");
  row1[cMap["client_id"]] = "CL001";
  row1[cMap["name"]] = "ABC Technologies Pvt Ltd";
  row1[cMap["contact_name"]] = "Rahul Mehta";
  row1[cMap["email"]] = "rahul@abctech.com";
  row1[cMap["mobile"]] = "+91 98765 43210";
  row1[cMap["login_id"]] = "rahul@abctech.com";
  row1[cMap["password_hash"]] = hash1;
  row1[cMap["password_salt"]] = salt1;
  row1[cMap["first_login"]] = false;
  row1[cMap["status"]] = "Active";
  row1[cMap["failed_attempts"]] = 0;
  row1[cMap["state"]] = "Gujarat";
  row1[cMap["address"]] = "101 Tech Boulevard, Ahmedabad";
  row1[cMap["gstin"]] = "24AAACA1234A1Z5";
  row1[cMap["created_at"]] = "2026-02-01T10:00:00.000Z";
  row1[cMap["updated_at"]] = "2026-02-01T10:00:00.000Z";
  clientSheet.appendRow(row1);

  // Client 2: XYZ Retail
  const salt2 = SecurityService.generateSalt();
  const hash2 = SecurityService.hashPassword("LegalClient@2026", salt2);
  const row2 = new Array(clientSheet.getLastColumn()).fill("");
  row2[cMap["client_id"]] = "CL002";
  row2[cMap["name"]] = "XYZ Retail Pvt Ltd";
  row2[cMap["contact_name"]] = "Sneha Patel";
  row2[cMap["email"]] = "sneha@xyzretail.com";
  row2[cMap["mobile"]] = "+91 98111 22233";
  row2[cMap["login_id"]] = "sneha@xyzretail.com";
  row2[cMap["password_hash"]] = hash2;
  row2[cMap["password_salt"]] = salt2;
  row2[cMap["first_login"]] = false;
  row2[cMap["status"]] = "Active";
  row2[cMap["failed_attempts"]] = 0;
  row2[cMap["state"]] = "Maharashtra";
  row2[cMap["address"]] = "502 Business Park, Mumbai";
  row2[cMap["gstin"]] = "27AAACX9876B1Z1";
  row2[cMap["created_at"]] = "2026-02-15T11:00:00.000Z";
  row2[cMap["updated_at"]] = "2026-02-15T11:00:00.000Z";
  clientSheet.appendRow(row2);

  // 3. Add Services (CL001 has 2 services: SRV001 and SRV003; CL002 has 1 service: SRV002)
  const serviceSheet = ss.getSheetByName("Services");
  const sMap = getColumnIndexMap(getSheetHeaders(serviceSheet), "Services");

  // SRV001 (for CL001): Private Limited Company Registration
  const srow1 = new Array(serviceSheet.getLastColumn()).fill("");
  srow1[sMap["service_id"]] = "SRV001";
  srow1[sMap["client_id"]] = "CL001";
  srow1[sMap["service_code"]] = "PVT-INC-001";
  srow1[sMap["service_name"]] = "Private Limited Company Registration";
  srow1[sMap["company_type"]] = "Private Limited";
  srow1[sMap["state"]] = "Gujarat";
  srow1[sMap["total_amount"]] = 14999;
  srow1[sMap["paid_amount"]] = 10000;
  srow1[sMap["remaining_amount"]] = 4999;
  srow1[sMap["dsc_count"]] = 2;
  srow1[sMap["current_stage"]] = "Name Approval (RUN)";
  srow1[sMap["current_stage_index"]] = 1;
  srow1[sMap["progress_percentage"]] = 40;
  srow1[sMap["status"]] = "In Progress";
  srow1[sMap["spoc_id"]] = "SPOC001";
  srow1[sMap["created_at"]] = "2026-02-02T10:00:00.000Z";
  srow1[sMap["updated_at"]] = "2026-02-02T10:00:00.000Z";
  serviceSheet.appendRow(srow1);

  // SRV002 (for CL002): GST Registration
  const srow2 = new Array(serviceSheet.getLastColumn()).fill("");
  srow2[sMap["service_id"]] = "SRV002";
  srow2[sMap["client_id"]] = "CL002";
  srow2[sMap["service_code"]] = "GST-REG-002";
  srow2[sMap["service_name"]] = "GST Registration";
  srow2[sMap["company_type"]] = "Private Limited";
  srow2[sMap["state"]] = "Maharashtra";
  srow2[sMap["total_amount"]] = 2999;
  srow2[sMap["paid_amount"]] = 2999;
  srow2[sMap["remaining_amount"]] = 0;
  srow2[sMap["dsc_count"]] = 0;
  srow2[sMap["current_stage"]] = "ARN Generated";
  srow2[sMap["current_stage_index"]] = 1;
  srow2[sMap["progress_percentage"]] = 67;
  srow2[sMap["status"]] = "In Progress";
  srow2[sMap["spoc_id"]] = "SPOC002";
  srow2[sMap["created_at"]] = "2026-02-16T12:00:00.000Z";
  srow2[sMap["updated_at"]] = "2026-02-16T12:00:00.000Z";
  serviceSheet.appendRow(srow2);

  // SRV003 (for CL001): Trademark Filing (Demonstrating 1 client with multiple services!)
  const srow3 = new Array(serviceSheet.getLastColumn()).fill("");
  srow3[sMap["service_id"]] = "SRV003";
  srow3[sMap["client_id"]] = "CL001";
  srow3[sMap["service_code"]] = "TM-REG-003";
  srow3[sMap["service_name"]] = "Trademark Registration (Class 42)";
  srow3[sMap["company_type"]] = "Private Limited";
  srow3[sMap["state"]] = "Gujarat";
  srow3[sMap["total_amount"]] = 6500;
  srow3[sMap["paid_amount"]] = 6500;
  srow3[sMap["remaining_amount"]] = 0;
  srow3[sMap["dsc_count"]] = 1;
  srow3[sMap["current_stage"]] = "Application Filed";
  srow3[sMap["current_stage_index"]] = 2;
  srow3[sMap["progress_percentage"]] = 60;
  srow3[sMap["status"]] = "In Progress";
  srow3[sMap["spoc_id"]] = "SPOC001";
  srow3[sMap["created_at"]] = "2026-02-20T14:00:00.000Z";
  srow3[sMap["updated_at"]] = "2026-02-20T14:00:00.000Z";
  serviceSheet.appendRow(srow3);

  // 4. Add Workflow Stages for SRV001 (5 stages)
  const stageSheet = ss.getSheetByName("ServiceStages");
  const srv1Stages = [
    { id: "STG001", name: "Document Verification", status: "Completed", seq: 1 },
    { id: "STG002", name: "Name Approval (RUN)", status: "In Progress", seq: 2 },
    { id: "STG003", name: "SPICe+ Part B Preparation", status: "Pending", seq: 3 },
    { id: "STG004", name: "MCA Filing & Processing", status: "Pending", seq: 4 },
    { id: "STG005", name: "COI & PAN/TAN Issuance", status: "Pending", seq: 5 }
  ];
  srv1Stages.forEach(st => {
    stageSheet.appendRow([st.id, "SRV001", st.name, st.status, st.status === "Completed" ? "2026-02-03T10:00:00.000Z" : "", "Workflow stage", st.seq]);
  });

  // Stages for SRV002
  const srv2Stages = [
    { id: "STG006", name: "Doc Verification", status: "Completed", seq: 1 },
    { id: "STG007", name: "ARN Generated", status: "In Progress", seq: 2 },
    { id: "STG008", name: "GST Certificate Issued", status: "Pending", seq: 3 }
  ];
  srv2Stages.forEach(st => {
    stageSheet.appendRow([st.id, "SRV002", st.name, st.status, st.status === "Completed" ? "2026-02-17T10:00:00.000Z" : "", "Workflow stage", st.seq]);
  });

  // Stages for SRV003
  const srv3Stages = [
    { id: "STG009", name: "TM Search & Analysis", status: "Completed", seq: 1 },
    { id: "STG010", name: "Form TM-A Prep", status: "Completed", seq: 2 },
    { id: "STG011", name: "Application Filed", status: "In Progress", seq: 3 },
    { id: "STG012", name: "Examination Report", status: "Pending", seq: 4 },
    { id: "STG013", name: "Registration Certificate", status: "Pending", seq: 5 }
  ];
  srv3Stages.forEach(st => {
    stageSheet.appendRow([st.id, "SRV003", st.name, st.status, st.status === "Completed" ? "2026-02-21T10:00:00.000Z" : "", "Workflow stage", st.seq]);
  });

  // 5. Add Admin User (ADM001)
  const adminSheet = ss.getSheetByName("AdminUsers");
  const aMap = getColumnIndexMap(getSheetHeaders(adminSheet), "AdminUsers");
  const aSalt = SecurityService.generateSalt();
  const aHash = SecurityService.hashPassword("SuperAdmin@2026", aSalt);
  const aRow = new Array(adminSheet.getLastColumn()).fill("");
  aRow[aMap["admin_id"]] = "ADM001";
  aRow[aMap["name"]] = "Super Admin";
  aRow[aMap["email"]] = "admin@legalsthal.com";
  aRow[aMap["password_hash"]] = aHash;
  aRow[aMap["password_salt"]] = aSalt;
  aRow[aMap["role"]] = "SUPER_ADMIN";
  aRow[aMap["status"]] = "ACTIVE";
  aRow[aMap["failed_attempts"]] = 0;
  adminSheet.appendRow(aRow);
}

// Helper to simulate doPost
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

async function runStep5TestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING STEP 5 LIVE PORTAL INTEGRATION SUITE");
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

  setupTestDatabase();

  // Log in as Client 1 (CL001)
  const loginRes1 = postApi("login", { login_id: "rahul@abctech.com", password: "LegalClient@2026" });
  const clientToken1 = loginRes1.data.token;

  // Log in as Client 2 (CL002)
  const loginRes2 = postApi("login", { login_id: "sneha@xyzretail.com", password: "LegalClient@2026" });
  const clientToken2 = loginRes2.data.token;

  // Log in as Admin (ADM001)
  const adminLogin = postApi("login", { login_id: "admin@legalsthal.com", password: "SuperAdmin@2026" });
  const adminToken = adminLogin.data.token;

  // 1. PORTAL-CLIENT-001: Valid client profile fetch
  const profRes = postApi("getClientProfile", { token: clientToken1 });
  assert("PORTAL-CLIENT-001", "Valid client profile fetch via getClientProfile",
    profRes.success && profRes.data.clientId === "CL001" && profRes.data.companyName === "ABC Technologies Pvt Ltd",
    `Resolved profile: ${profRes.data?.companyName}`
  );

  // 2. PORTAL-CLIENT-002: Zero sensitive credential leakage
  const profileKeys = Object.keys(profRes.data || {});
  const hasSecrets = profileKeys.some(k => k.includes("password") || k.includes("salt") || k.includes("token") || k.includes("failed"));
  assert("PORTAL-CLIENT-002", "Client profile leaks zero sensitive data",
    !hasSecrets && profRes.data.passwordHash === undefined && profRes.data.passwordSalt === undefined,
    "Confirmed zero passwords, hashes, salts, or counters returned"
  );

  // 3. PORTAL-CLIENT-003: Client dashboard summary calculation
  const dashRes = postApi("getClientDashboard", { token: clientToken1 });
  const dMetrics = dashRes.data?.metrics || {};
  assert("PORTAL-CLIENT-003", "Client dashboard summary calculation",
    dashRes.success && dMetrics.totalServices === 2 && dMetrics.activeServices === 2 && dMetrics.remainingAmount === 4999,
    `Total: 2 services, Active: 2, Total remaining: ₹${dMetrics.remainingAmount}`
  );

  // 4. PORTAL-CLIENT-004: Client services list retrieval
  const srvListRes = postApi("getClientServices", { token: clientToken1 });
  assert("PORTAL-CLIENT-004", "Client services list retrieves all linked services",
    srvListRes.success && srvListRes.data.length === 2 && srvListRes.data[0].serviceId === "SRV001" && srvListRes.data[1].serviceId === "SRV003",
    `Retrieved ${srvListRes.data?.length} services (SRV001, SRV003)`
  );

  // 5. PORTAL-CLIENT-005: Client service detail retrieval with stages & SPOC
  const srvDetailRes = postApi("getClientService", { token: clientToken1, service_id: "SRV001" });
  assert("PORTAL-CLIENT-005", "Client service detail retrieval with stages & SPOC",
    srvDetailRes.success && srvDetailRes.data.service.serviceId === "SRV001" &&
    srvDetailRes.data.stages.length === 5 && srvDetailRes.data.spoc.name === "Priya Sharma",
    `Service: ${srvDetailRes.data?.service?.serviceName}, Stages: 5, SPOC: ${srvDetailRes.data?.spoc?.name}`
  );

  // 6. PORTAL-IDOR-001: Client IDOR protection on service details
  const idorService = postApi("getClientService", { token: clientToken1, service_id: "SRV002" });
  assert("PORTAL-IDOR-001", "Client IDOR protection on foreign service details",
    !idorService.success && idorService.error?.code === "AUTH_FORBIDDEN",
    `Blocked unauthorized access: ${idorService.error?.message}`
  );

  // 7. PORTAL-IDOR-002: Client IDOR protection on foreign stages
  const idorStages = postApi("getClientStages", { token: clientToken1, service_id: "SRV002" });
  assert("PORTAL-IDOR-002", "Client IDOR protection on foreign service stages",
    !idorStages.success && idorStages.error?.code === "AUTH_FORBIDDEN",
    `Blocked foreign stage inspection: ${idorStages.error?.code}`
  );

  // 8. PORTAL-IDOR-003: Untrusted client_id parameter is ignored
  const spoofRes = postApi("getClientDashboard", { token: clientToken1, client_id: "CL002" });
  assert("PORTAL-IDOR-003", "Untrusted client_id payload parameter is ignored",
    spoofRes.success && spoofRes.data.client.clientId === "CL001",
    `Derived client CL001 strictly from session, ignoring spoofed CL002`
  );

  // 9. PORTAL-AUTHZ-001: Client blocked from admin dashboard
  const clientAdminDash = postApi("adminGetDashboard", { token: clientToken1 });
  assert("PORTAL-AUTHZ-001", "Client blocked from admin operations console",
    !clientAdminDash.success && clientAdminDash.error?.code === "AUTH_FORBIDDEN",
    `Access denied with code: ${clientAdminDash.error?.code}`
  );

  // 10. PORTAL-AUTHZ-002: Client blocked from admin client directory
  const clientAdminList = postApi("adminGetClients", { token: clientToken1 });
  assert("PORTAL-AUTHZ-002", "Client blocked from admin client directory",
    !clientAdminList.success && clientAdminList.error?.code === "AUTH_FORBIDDEN",
    `Directory access denied: ${clientAdminList.error?.code}`
  );

  // 11. PORTAL-AUTHZ-003: Client blocked from advancing service stages
  const clientStageAdv = postApi("adminUpdateServiceStage", { token: clientToken1, service_id: "SRV001", stage_index: 2 });
  assert("PORTAL-AUTHZ-003", "Client blocked from administrative stage update",
    !clientStageAdv.success && clientStageAdv.error?.code === "AUTH_FORBIDDEN",
    `Stage mutation rejected: ${clientStageAdv.error?.code}`
  );

  // 12. PORTAL-AUTHZ-004: Client blocked from SPOC assignment
  const clientSpocAdv = postApi("adminAssignSpoc", { token: clientToken1, service_id: "SRV001", spoc_id: "SPOC002" });
  assert("PORTAL-AUTHZ-004", "Client blocked from assigning SPOC",
    !clientSpocAdv.success && clientSpocAdv.error?.code === "AUTH_FORBIDDEN",
    `SPOC assignment rejected: ${clientSpocAdv.error?.code}`
  );

  // 13. PORTAL-ADMIN-001: Admin dashboard metrics calculation
  const adminDash = postApi("adminGetDashboard", { token: adminToken });
  const aMetrics = adminDash.data?.metrics || {};
  assert("PORTAL-ADMIN-001", "Admin dashboard metrics aggregation",
    adminDash.success && aMetrics.totalClients === 2 && aMetrics.activeClients === 2 &&
    aMetrics.totalServices === 3 && aMetrics.totalRevenue === (14999 + 2999 + 6500) &&
    aMetrics.totalPending === 4999,
    `Clients: ${aMetrics.totalClients}, Services: ${aMetrics.totalServices}, Revenue: ₹${aMetrics.totalRevenue}, Pending: ₹${aMetrics.totalPending}`
  );

  // 14. PORTAL-ADMIN-002: Admin client directory with search & status filter
  const searchRes = postApi("adminGetClients", { token: adminToken, search: "Tech", status: "Active" });
  assert("PORTAL-ADMIN-002", "Admin client directory search & filter",
    searchRes.success && searchRes.data.length === 1 && searchRes.data[0].clientId === "CL001" && searchRes.data[0].servicesCount === 2,
    `Found 1 matching client with 2 associated services`
  );

  // 15. PORTAL-ADMIN-003: Admin client detail view with full services portfolio
  const adminClientDetail = postApi("adminGetClient", { token: adminToken, client_id: "CL001" });
  assert("PORTAL-ADMIN-003", "Admin client detail view with associated services",
    adminClientDetail.success && adminClientDetail.data.client.clientId === "CL001" &&
    adminClientDetail.data.services.length === 2,
    `Client: ${adminClientDetail.data?.client?.companyName}, Associated Services: 2`
  );

  // 16. PORTAL-ADMIN-004: Admin service stage update execution
  const updateStageRes = postApi("adminUpdateServiceStage", {
    token: adminToken,
    service_id: "SRV001",
    stage_index: 2, // SPICe+ Part B Preparation (index 2 = stage 3, 60% progress)
    remarks: "Client documents verified and accepted by legal team"
  });
  assert("PORTAL-ADMIN-004", "Admin updates service stage with calculated progress",
    updateStageRes.success && updateStageRes.data.currentStageIndex === 2 &&
    updateStageRes.data.progressPercentage === 60 && updateStageRes.data.currentStage === "SPICe+ Part B Preparation",
    `Advanced SRV001 to: ${updateStageRes.data?.currentStage} (${updateStageRes.data?.progressPercentage}%)`
  );

  // 17. PORTAL-ADMIN-005: Stage update records to StageHistory
  const stageHistSheet = global.mockSS.getSheetByName("StageHistory");
  const lastHist = stageHistSheet.getDataRange().getValues().slice(-1)[0];
  assert("PORTAL-ADMIN-005", "Stage update appends to StageHistory table",
    lastHist && String(lastHist[1]) === "SRV001" && String(lastHist[2]) === "SPICe+ Part B Preparation" &&
    String(lastHist[7]).includes("verified and accepted"),
    `Recorded history: ${lastHist[2]} by ${lastHist[4]} (${lastHist[5]})`
  );

  // 18. PORTAL-ADMIN-006: Stage update logs to AuditLogs
  const auditSheet = global.mockSS.getSheetByName("AuditLogs");
  const lastAudit = auditSheet.getDataRange().getValues().slice(-1)[0];
  assert("PORTAL-ADMIN-006", "Stage update records entry in AuditLogs table",
    lastAudit && String(lastAudit[4]) === "UPDATE_SERVICE_STAGE" && String(lastAudit[6]) === "SRV001",
    `Audit logged: Action=${lastAudit[4]}, ResourceId=${lastAudit[6]}`
  );

  // 19. PORTAL-ADMIN-007: Stage update dispatches client notification
  const notifSheet = global.mockSS.getSheetByName("Notifications");
  const lastNotif = notifSheet.getDataRange().getValues().slice(-1)[0];
  assert("PORTAL-ADMIN-007", "Stage update dispatches notification record for client",
    lastNotif && String(lastNotif[1]) === "CL001" && String(lastNotif[3]) === "STAGE_UPDATE",
    `Notification dispatched to Client CL001: ${lastNotif[4]}`
  );

  // 20. PORTAL-ADMIN-008: Admin assigns dedicated SPOC
  const assignSpocRes = postApi("adminAssignSpoc", {
    token: adminToken,
    service_id: "SRV001",
    spoc_id: "SPOC002"
  });
  assert("PORTAL-ADMIN-008", "Admin assigns dedicated SPOC to service",
    assignSpocRes.success && assignSpocRes.data.spocId === "SPOC002" && assignSpocRes.data.spoc.name === "Ankit Verma",
    `Assigned SPOC: ${assignSpocRes.data?.spoc?.name}`
  );

  // 21. PORTAL-ADMIN-009: Admin SPOC directory retrieval
  const spocsRes = postApi("adminGetSpocs", { token: adminToken });
  assert("PORTAL-ADMIN-009", "Admin SPOC directory retrieval",
    spocsRes.success && spocsRes.data.length === 2 && spocsRes.data[0].spocId === "SPOC001",
    `Retrieved ${spocsRes.data?.length} active SPOCs`
  );

  // 22. PORTAL-MATH-001: Financial arithmetic consistency (remaining = total - paid)
  const clientDashRefresh = postApi("getClientDashboard", { token: clientToken1 });
  const srvs = clientDashRefresh.data.services;
  const mathValid = srvs.every(s => (s.remainingAmount === (s.totalAmount - s.paidAmount)));
  assert("PORTAL-MATH-001", "Financial calculation consistency across all services (remaining = total - paid)",
    mathValid && (srvs[0].totalAmount - srvs[0].paidAmount === srvs[0].remainingAmount),
    `Service 1: ₹${srvs[0].totalAmount} - ₹${srvs[0].paidAmount} = ₹${srvs[0].remainingAmount}`
  );

  // 23. PORTAL-MULTI-001: One client mapped to multiple services without account duplication
  const c1Services = srvListRes.data;
  assert("PORTAL-MULTI-001", "One client to many services relational rule",
    c1Services.length >= 2 && c1Services[0].clientId === "CL001" && c1Services[1].clientId === "CL001",
    `Client CL001 owns services: ${c1Services.map(s => s.serviceCode).join(", ")}`
  );

  // 24. PORTAL-CLIENT-006: Client notifications retrieved & mark as read
  const notifs = postApi("getClientNotifications", { token: clientToken1 });
  assert("PORTAL-CLIENT-006", "Client notifications list retrieval",
    notifs.success && notifs.data.length >= 1 && notifs.data[0].eventType === "STAGE_UPDATE",
    `Client received notification: ${notifs.data[0]?.details}`
  );

  const markReadRes = postApi("markNotificationRead", { token: clientToken1, notification_id: notifs.data[0].notificationId });
  assert("PORTAL-CLIENT-007", "Client marks own notification as read",
    markReadRes.success === true,
    `Notification marked as read`
  );

  console.log("==================================================");
  console.log(`📊 STEP 5 PORTAL SUITE COMPLETE: ${passed} / ${total} PASSED`);
  console.log("==================================================");

  if (passed === total) {
    console.log("STATUS: 100% SUCCESS - ALL STEP 5 CORE REQUIREMENTS SATISFIED");
  } else {
    console.error(`STATUS: FAILED (${total - passed} failures)`);
    process.exit(1);
  }
}

runStep5TestSuite().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
