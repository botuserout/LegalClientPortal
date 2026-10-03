// Scratch verification harness to execute AuthTests.gs locally in Node.js
const fs = require('fs');
const crypto = require('crypto');

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
    this.id = "mock_auth_sheet_id";
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
  log: (...args) => console.log(...args)
};

const Utilities = {
  DigestAlgorithm: { SHA_256: "SHA_256" },
  getUuid: () => crypto.randomUUID(),
  newBlob: (str) => ({
    getBytes: () => Array.from(Buffer.from(str, 'utf8'))
  }),
  computeDigest: (alg, val) => {
    const hash = crypto.createHash('sha256');
    hash.update(typeof val === 'string' ? val : Buffer.from(val));
    const buf = hash.digest();
    // Return signed byte array (-128..127) as Apps Script does
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
    // Return signed byte array (-128..127) as Apps Script does
    const arr = [];
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      if (byte > 127) byte -= 256;
      arr.push(byte);
    }
    return arr;
  }
};

const mockSpreadsheetInstance = new MockSpreadsheet();
const SpreadsheetApp = {
  getActiveSpreadsheet: () => mockSpreadsheetInstance,
  openById: () => mockSpreadsheetInstance
};

function padZero(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

// Load backend files
const basePath = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend/';
const configCode = fs.readFileSync(basePath + 'Config.gs', 'utf8');
const securityCode = fs.readFileSync(basePath + 'SecurityService.gs', 'utf8');
const migrationCode = fs.readFileSync(basePath + 'Migration.gs', 'utf8');
const sessionCode = fs.readFileSync(basePath + 'SessionService.gs', 'utf8');
const authCode = fs.readFileSync(basePath + 'AuthService.gs', 'utf8');
const testCode = fs.readFileSync(basePath + 'AuthTests.gs', 'utf8');

eval(configCode);
eval(securityCode);
eval(migrationCode);
eval(sessionCode);
eval(authCode);
eval(testCode);

// Initialize schema v2 database tabs
migrateDatabase();

console.log("\n=== EXECUTING AUTOMATED AUTH TEST SUITE ===");
const report = runAuthTests();
console.log("\n=== TEST RESULTS SUMMARY ===");
console.log(`PASSED: ${report.passedCount} / ${report.totalTests}`);
console.log(`FAILED: ${report.failedCount} / ${report.totalTests}`);

if (report.failedCount > 0) {
  console.error("FAILURES DETECTED:");
  report.testResults.filter(r => !r.passed).forEach(r => console.error(r));
  process.exit(1);
} else {
  console.log("\n>>> ALL AUTH & SECURITY TESTS PASSED (100%) <<<");
}
