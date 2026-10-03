// Scratch test for integrity scanner edge cases & dirty data detection
const fs = require('fs');

const migrationCode = fs.readFileSync('c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend/Migration.gs', 'utf8');

// Environment setup
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
    this.id = "mock_sheet_dirty";
    this.name = "Legal Sthal Dirty Data Test";
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
  getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
};
const Logger = { log: console.log };
const mockSpreadsheetInstance = new MockSpreadsheet();
const SpreadsheetApp = {
  getActiveSpreadsheet: () => mockSpreadsheetInstance,
  openById: () => mockSpreadsheetInstance
};

eval(migrationCode);

// Add dirty data:
// 1. Clients with duplicate email and duplicate mobile
const cSheet = mockSpreadsheetInstance.insertSheet("Clients");
cSheet.appendRow(["client_id", "name", "email", "mobile", "status"]);
cSheet.appendRow(["CL001", "Client One", "info@sample.com", "+91 98765 43210", "Active"]);
cSheet.appendRow(["CL002", "Client Two", "  INFO@Sample.com  ", "9876543210", "Active"]); // duplicate email & mobile!

// 2. Services with orphan client_id, invalid SPOC, and payment inconsistency
const sSheet = mockSpreadsheetInstance.insertSheet("Services");
sSheet.appendRow(["service_id", "client_id", "service_name", "spoc_id", "total_amount", "paid_amount", "remaining_amount"]);
sSheet.appendRow(["SRV001", "CL001", "Incorporation", "SPOC001", 10000, 2000, 8000]); // OK
sSheet.appendRow(["SRV002", "CL999", "Orphan Service", "SPOC999", 5000, 1000, 1000]); // Orphan client CL999, invalid SPOC999, remaining 1000 != 4000!

// 3. SPOCs
const spSheet = mockSpreadsheetInstance.insertSheet("SPOCs");
spSheet.appendRow(["spoc_id", "name"]);
spSheet.appendRow(["SPOC001", "Priya"]);

// 4. Documents with orphan service_id
const dSheet = mockSpreadsheetInstance.insertSheet("Documents");
dSheet.appendRow(["document_id", "service_id", "document_name"]);
dSheet.appendRow(["DOC001", "SRV001", "PAN"]); // OK
dSheet.appendRow(["DOC002", "SRV888", "Aadhaar"]); // Orphan service SRV888!

const scan = runDatabaseIntegrityScan(mockSpreadsheetInstance);
console.log("=== INTEGRITY SCAN RESULTS ON DIRTY DATA ===");
console.log("Duplicate clients detected:", scan.duplicateClients.length);
scan.duplicateClients.forEach(d => console.log(" -", d.type, d.email || d.mobile, `(${d.firstClientId} vs ${d.duplicateClientId})`));

console.log("Orphan services detected:", scan.orphanServices.length);
scan.orphanServices.forEach(o => console.log(" -", o.serviceId, "-> Client", o.clientId));

console.log("Orphan documents detected:", scan.orphanDocuments.length);
scan.orphanDocuments.forEach(o => console.log(" -", o.documentId, "-> Service", o.serviceId));

console.log("SPOC discrepancies detected:", scan.spocInconsistencies.length);
scan.spocInconsistencies.forEach(s => console.log(" -", s.serviceId, "-> SPOC", s.spocId));

console.log("Payment discrepancies detected:", scan.paymentInconsistencies.length);
scan.paymentInconsistencies.forEach(p => console.log(" -", p.serviceId, "Total:", p.totalAmount, "Paid:", p.paidAmount, "Actual Rem:", p.actualRemaining, "Expected Rem:", p.expectedRemaining));

if (scan.duplicateClients.length === 2 &&
    scan.orphanServices.length === 1 &&
    scan.orphanDocuments.length === 1 &&
    scan.spocInconsistencies.length === 1 &&
    scan.paymentInconsistencies.length === 1) {
  console.log("\n>>> ALL INTEGRITY CHECKS DETECTED ANOMALIES WITH 100% ACCURACY! <<<");
} else {
  console.error("\n>>> INTEGRITY SCAN FAILED ACCURACY CHECK <<<");
  process.exit(1);
}
