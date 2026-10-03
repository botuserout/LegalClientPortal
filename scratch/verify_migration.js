// Scratch verification script to test Migration.gs & MigrationTests.gs logic locally in Node.js
const fs = require('fs');
const path = require('path');

// 1. Mock Google Apps Script environment
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
    this.frozenRows = 0;
  }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    let max = 0;
    this.data.forEach(r => { if (r.length > max) max = r.length; });
    return max;
  }
  appendRow(row) {
    this.data.push(row.slice());
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }
  getDataRange() {
    return new MockRange(this, 1, 1, this.getLastRow(), this.getLastColumn());
  }
  setFrozenRows(n) { this.frozenRows = n; }
}

class MockSpreadsheet {
  constructor() {
    this.id = "mock_sheet_id_12345";
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
    getProperty: (k) => mockProps[k] || null,
    setProperty: (k, v) => { mockProps[k] = String(v); }
  })
};

const LockService = {
  getScriptLock: () => ({
    tryLock: () => true,
    releaseLock: () => {}
  })
};

const Logger = {
  log: (...args) => console.log(...args)
};

const mockSpreadsheetInstance = new MockSpreadsheet();
const SpreadsheetApp = {
  getActiveSpreadsheet: () => mockSpreadsheetInstance,
  openById: () => mockSpreadsheetInstance
};

// Populate initial v1 prototype database state (matching backend/Code.gs setupDatabaseSheets)
const v1Schema = {
  "Clients": [
    ["Client ID", "Company Name", "Contact Person", "Email", "Mobile", "State", "Address", "GSTIN", "Password", "Created At", "Status"],
    ["CL001", "ABC Technologies Pvt Ltd", "Rahul Mehta", "abc@gmail.com", "+91 98765 43210", "Gujarat", "102 Tech Park", "24AAACA123411Z5", "password123", "25 Sep 2026", "Active"],
    ["CL002", "Zenith Logistics LLP", "Anita Desai", "contact@zenithlogistics.in", "+91 98123 45678", "Maharashtra", "405 Commercial Center", "27BBBCL987612Z1", "password123", "20 Sep 2026", "Active"]
  ],
  "Services": [
    ["Service ID", "Client ID", "Service Code", "Service Type", "Company Type", "State", "Status", "Current Stage Index", "Progress %", "SPOC ID", "Total Amount", "Paid Amount", "Remaining Amount", "Created At", "Completed On", "Certificate URL"],
    ["SRV001", "CL001", "INC-2026-001", "Company Incorporation", "Private Limited", "Gujarat", "In Progress", 2, 40, "SPOC001", 9999, 499, 9500, "25 Sep 2026", "", ""],
    ["SRV002", "CL001", "GST-2026-042", "GST Registration", "Private Limited", "Gujarat", "Under Review", 1, 60, "SPOC002", 3000, 3000, 0, "28 Sep 2026", "", ""]
  ],
  "ServiceStages": [
    ["Stage ID", "Service ID", "Stage Name", "Stage Status", "Completed On", "Description", "Sequence Order"],
    ["STG_SRV001_1", "SRV001", "RUN (Name Approval)", "COMPLETED", "28 Sep 2026", "Name approved", 1]
  ],
  "Documents": [
    ["Document ID", "Service ID", "Document Name", "Status", "Submitted On", "Rejection Reason", "Required", "Drive File URL"],
    ["DOC001", "SRV001", "PAN Card", "Verified", "28 Sep 2026", "", "TRUE", "https://drive.google.com/file/d/123/view"]
  ],
  "SPOCs": [
    ["SPOC ID", "Name", "Title", "Mobile", "Email", "Assigned Clients", "Status", "Avatar URL"],
    ["SPOC001", "Priya Shah", "Senior Expert", "+91 98980 11223", "priya@legalsthal.com", 18, "Active", ""]
  ],
  "QuoteRequests": [
    ["Request ID", "Client ID", "Client Name", "Service Name", "Company Type", "State", "Mobile", "Email", "Requested On", "Status", "Quote Amount", "Remarks"],
    ["QR001", "CL001", "ABC Technologies Pvt Ltd", "Startup India", "Private Limited", "Gujarat", "+91 98765 43210", "abc@gmail.com", "30 Sep 2026", "Quote Sent", "₹12,500", ""]
  ],
  "Notifications": [
    ["Notification ID", "Client ID", "Client Name", "Event Type", "Details", "Channel", "Date", "Status"],
    ["NTF001", "CL001", "ABC Technologies Pvt Ltd", "Stage Updated", "Stage updated", "WhatsApp & Email", "01 Oct 2026", "Delivered"]
  ],
  "AuditLogs": [
    ["Log ID", "Timestamp", "Action", "Performed By", "Details JSON"],
    ["LOG_001", "2026-09-25T10:00:00Z", "Create Client", "CL001", "Initial setup"]
  ]
};

Object.keys(v1Schema).forEach(tab => {
  const s = mockSpreadsheetInstance.insertSheet(tab);
  v1Schema[tab].forEach(r => s.appendRow(r));
});

// Load backend/Migration.gs and backend/MigrationTests.gs into this context
const migrationCode = fs.readFileSync('c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend/Migration.gs', 'utf8');
const testCode = fs.readFileSync('c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend/MigrationTests.gs', 'utf8');

eval(migrationCode);
eval(testCode);

console.log("=== RUNNING MIGRATION RUN 1 ===");
const rep1 = migrateDatabase();
console.log("Migration 1 success:", rep1.success);
console.log("Tabs created:", rep1.tabsCreated);
console.log("Tabs modified:", rep1.tabsModified);
console.log("Backfill summary:", rep1.backfillSummary);

console.log("\n=== RUNNING MIGRATION TESTS (INCLUDES IDEMPOTENCY RUN 2) ===");
const testReport = runMigrationTests();
console.log("\n=== TEST RESULTS SUMMARY ===");
console.log(`Passed: ${testReport.passedCount} / ${testReport.totalTests}`);
testReport.testResults.forEach(r => {
  console.log(`[${r.status}] ${r.testId}: ${r.name}`);
});
