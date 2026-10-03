/**
 * Legal Sthal - Google Sheets Database Schema Migration Engine (Migration.gs)
 * Version: 2.0.0 (Target Schema Version: 2)
 * 
 * Safe, Non-Destructive, Idempotent Database Schema Migration & Integrity Scanner.
 * Adheres strictly to the Legal Sthal Master Database Schema Specification.
 */

// ==========================================
// 1. CONFIGURATION & VERSIONING
// ==========================================
var MIGRATION_CONFIG = {
  TARGET_SCHEMA_VERSION: 2,
  BACKUP_FOLDER_NAME: "LegalSthal_Database_Backups",
  SNAPSHOT_SHEET_NAME: "_MigrationSnapshots",
  CONFIG_SHEET_NAME: "SystemConfig",
  LOCK_TIMEOUT_MS: 30000,
  DEFAULT_TIMEZONE: "Asia/Kolkata"
};

// ==========================================
// 2. NORMALIZATION UTILITIES
// ==========================================

/**
 * Normalizes email address: trims whitespace and converts to lowercase.
 * RFC 5322 compliant sanitization.
 */
function normalizeEmail(email) {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes Indian mobile number: strips non-digit characters,
 * removes leading 0 or +91 / 91, and formats to standard 10-digit number.
 * Example: "+91 98765-43210" -> "9876543210"
 */
function normalizeMobile(mobile) {
  if (!mobile) return "";
  var str = String(mobile).trim();
  // Remove spaces, hyphens, parentheses
  var digits = str.replace(/[\s\-\(\)\.]/g, "");
  
  // Strip leading + if present
  if (digits.indexOf("+") === 0) {
    digits = digits.substring(1);
  }
  
  // If starts with 91 and length is 12, strip 91
  if (digits.length === 12 && digits.indexOf("91") === 0) {
    digits = digits.substring(2);
  }
  
  // If starts with 0 and length is 11, strip 0
  if (digits.length === 11 && digits.indexOf("0") === 0) {
    digits = digits.substring(1);
  }
  
  return digits;
}

// ==========================================
// 3. TARGET SCHEMA DEFINITION
// ==========================================

/**
 * Returns the authoritative target database schema for all 13 business tables + SystemConfig.
 * Each sheet defines its required column list in canonical order.
 */
function getTargetDatabaseSchema() {
  return {
    "SystemConfig": [
      "config_key",
      "config_value",
      "description",
      "updated_at"
    ],
    "Clients": [
      "client_id",
      "name",
      "contact_name",
      "email",
      "mobile",
      "login_id",
      "password_hash",
      "password_salt",
      "first_login",
      "status",
      "failed_attempts",
      "locked_until",
      "last_login",
      "password_changed_at",
      "state",
      "address",
      "gstin",
      "created_at",
      "updated_at"
    ],
    "Services": [
      "service_id",
      "client_id",
      "service_code",
      "crm_deal_id",
      "service_name",
      "company_type",
      "state",
      "total_amount",
      "paid_amount",
      "remaining_amount",
      "dsc_count",
      "current_stage",
      "current_stage_index",
      "progress_percentage",
      "status",
      "spoc_id",
      "certificate_url",
      "completed_on",
      "created_at",
      "updated_at"
    ],
    "ServiceStages": [
      "stage_id",
      "service_id",
      "stage_name",
      "stage_status",
      "completed_on",
      "description",
      "sequence_order"
    ],
    "StageHistory": [
      "stage_history_id",
      "service_id",
      "stage_name",
      "status",
      "changed_by",
      "changed_by_role",
      "changed_at",
      "remarks"
    ],
    "Documents": [
      "document_id",
      "service_id",
      "client_id",
      "document_name",
      "document_type",
      "form_response_id",
      "file_name",
      "file_url",
      "drive_file_id",
      "status",
      "rejection_reason",
      "required",
      "uploaded_at",
      "verified_at",
      "verified_by",
      "rejected_at",
      "rejected_by"
    ],
    "SPOCs": [
      "spoc_id",
      "name",
      "title",
      "mobile",
      "email",
      "assigned_clients",
      "status",
      "avatar_url",
      "created_at",
      "updated_at"
    ],
    "AdminUsers": [
      "admin_id",
      "name",
      "email",
      "password_hash",
      "password_salt",
      "role",
      "status",
      "failed_attempts",
      "locked_until",
      "last_login",
      "created_at",
      "updated_at"
    ],
    "Sessions": [
      "session_id",
      "token_hash",
      "user_id",
      "role",
      "client_id",
      "created_at",
      "expires_at",
      "last_activity",
      "status"
    ],
    "PasswordResets": [
      "reset_id",
      "user_id",
      "token_hash",
      "created_at",
      "expires_at",
      "used",
      "used_at"
    ],
    "QuoteRequests": [
      "request_id",
      "client_id",
      "client_name",
      "service_name",
      "company_type",
      "state",
      "mobile",
      "email",
      "requested_on",
      "status",
      "quote_amount",
      "remarks"
    ],
    "Notifications": [
      "notification_id",
      "client_id",
      "client_name",
      "event_type",
      "details",
      "channel",
      "date",
      "status"
    ],
    "AuditLogs": [
      "log_id",
      "timestamp",
      "actor_id",
      "actor_role",
      "action",
      "entity_type",
      "entity_id",
      "ip_or_metadata",
      "details"
    ],
    "CRMSyncLogs": [
      "sync_id",
      "entity_type",
      "entity_id",
      "crm_id",
      "operation",
      "status",
      "attempt_count",
      "error_message",
      "started_at",
      "completed_at",
      "next_retry_at"
    ]
  };
}

/**
 * Mapping dictionary between legacy v1 prototype headers and canonical v2 headers.
 * Used for non-destructive in-place column alias resolution without breaking existing data.
 */
function getLegacyHeaderAliases() {
  return {
    "Clients": {
      "Client ID": "client_id",
      "Company Name": "name",
      "Contact Person": "contact_name",
      "Email": "email",
      "Mobile": "mobile",
      "State": "state",
      "Address": "address",
      "GSTIN": "gstin",
      "Password": "legacy_password", // preserved for legacy migration
      "Created At": "created_at",
      "Status": "status"
    },
    "Services": {
      "Service ID": "service_id",
      "Client ID": "client_id",
      "Service Code": "service_code",
      "Service Type": "service_name",
      "Company Type": "company_type",
      "State": "state",
      "Status": "status",
      "Current Stage Index": "current_stage_index",
      "Progress %": "progress_percentage",
      "SPOC ID": "spoc_id",
      "Total Amount": "total_amount",
      "Paid Amount": "paid_amount",
      "Remaining Amount": "remaining_amount",
      "Created At": "created_at",
      "Completed On": "completed_on",
      "Certificate URL": "certificate_url"
    },
    "ServiceStages": {
      "Stage ID": "stage_id",
      "Service ID": "service_id",
      "Stage Name": "stage_name",
      "Stage Status": "stage_status",
      "Completed On": "completed_on",
      "Description": "description",
      "Sequence Order": "sequence_order"
    },
    "Documents": {
      "Document ID": "document_id",
      "Service ID": "service_id",
      "Document Name": "document_name",
      "Status": "status",
      "Submitted On": "uploaded_at",
      "Rejection Reason": "rejection_reason",
      "Required": "required",
      "Drive File URL": "file_url"
    },
    "SPOCs": {
      "SPOC ID": "spoc_id",
      "Name": "name",
      "Title": "title",
      "Mobile": "mobile",
      "Email": "email",
      "Assigned Clients": "assigned_clients",
      "Status": "status",
      "Avatar URL": "avatar_url"
    },
    "QuoteRequests": {
      "Request ID": "request_id",
      "Client ID": "client_id",
      "Client Name": "client_name",
      "Service Name": "service_name",
      "Company Type": "company_type",
      "State": "state",
      "Mobile": "mobile",
      "Email": "email",
      "Requested On": "requested_on",
      "Status": "status",
      "Quote Amount": "quote_amount",
      "Remarks": "remarks"
    },
    "Notifications": {
      "Notification ID": "notification_id",
      "Client ID": "client_id",
      "Client Name": "client_name",
      "Event Type": "event_type",
      "Details": "details",
      "Channel": "channel",
      "Date": "date",
      "Status": "status"
    },
    "AuditLogs": {
      "Log ID": "log_id",
      "Timestamp": "timestamp",
      "Action": "action",
      "Performed By": "actor_id",
      "Details JSON": "details"
    }
  };
}

// ==========================================
// 4. HEADER & SHEET REPOSITORY HELPERS
// ==========================================

function getSpreadsheetInstance() {
  var prop = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (prop) {
    try { return SpreadsheetApp.openById(prop); } catch (e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Returns existing sheet by name or null if missing.
 */
function getSheetByNameSafe(ss, sheetName) {
  return ss.getSheetByName(sheetName);
}

/**
 * Returns array of headers (row 1) from sheet, or empty array if sheet is empty.
 */
function getSheetHeaders(sheet) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return [];
  }
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h).trim();
  });
}

/**
 * Builds a column index lookup map: { headerName: 0-based index }.
 * Matches case-insensitively and maps canonical aliases.
 */
function getColumnIndexMap(sheetHeaders, sheetName) {
  var map = {};
  var aliases = (getLegacyHeaderAliases()[sheetName]) || {};
  
  sheetHeaders.forEach(function(header, idx) {
    var key = header.trim();
    map[key] = idx;
    map[key.toLowerCase()] = idx;
    
    // Also map legacy alias if present
    if (aliases[key]) {
      map[aliases[key]] = idx;
      map[aliases[key].toLowerCase()] = idx;
    }
  });
  
  return map;
}

/**
 * Styles a header range with Legal Sthal brand colors (#0b1325 navy background, #D4AF37 gold text).
 */
function styleHeaderRange(sheet, numColumns) {
  if (numColumns < 1) return;
  var range = sheet.getRange(1, 1, 1, numColumns);
  range.setBackground("#0b1325");
  range.setFontColor("#D4AF37");
  range.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

// ==========================================
// 5. VERSION & CONFIG MANAGEMENT
// ==========================================

function getSchemaVersion(ss) {
  // First check ScriptProperties
  var propVersion = PropertiesService.getScriptProperties().getProperty("SCHEMA_VERSION");
  if (propVersion) {
    var vNum = parseInt(propVersion, 10);
    if (!isNaN(vNum)) return vNum;
  }
  
  // Then check SystemConfig sheet if present
  var configSheet = ss.getSheetByName(MIGRATION_CONFIG.CONFIG_SHEET_NAME);
  if (configSheet && configSheet.getLastRow() > 1) {
    var data = configSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === "SCHEMA_VERSION") {
        var val = parseInt(data[i][1], 10);
        if (!isNaN(val)) return val;
      }
    }
  }
  
  return 1; // Default to v1 (initial prototype)
}

function setSchemaVersion(ss, versionNumber) {
  PropertiesService.getScriptProperties().setProperty("SCHEMA_VERSION", String(versionNumber));
  
  var configSheet = ss.getSheetByName(MIGRATION_CONFIG.CONFIG_SHEET_NAME);
  if (!configSheet) {
    configSheet = ss.insertSheet(MIGRATION_CONFIG.CONFIG_SHEET_NAME);
    configSheet.appendRow(getTargetDatabaseSchema()[MIGRATION_CONFIG.CONFIG_SHEET_NAME]);
    styleHeaderRange(configSheet, 4);
  }
  
  var data = configSheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === "SCHEMA_VERSION") {
      configSheet.getRange(i + 1, 2).setValue(versionNumber);
      configSheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }
  
  if (!found) {
    configSheet.appendRow([
      "SCHEMA_VERSION",
      versionNumber,
      "Current applied database schema version",
      new Date().toISOString()
    ]);
  }
}

// ==========================================
// 6. BACKUP & PRE-MIGRATION SNAPSHOT
// ==========================================

/**
 * Creates an immutable snapshot of current tab names, headers, and row counts.
 * Appends the snapshot metadata to the `_MigrationSnapshots` tab.
 */
function createPreMigrationSnapshot(ss, migrationId) {
  var snapshot = {
    migrationId: migrationId,
    timestamp: new Date().toISOString(),
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    tabs: []
  };
  
  var sheets = ss.getSheets();
  sheets.forEach(function(sh) {
    var name = sh.getName();
    if (name === MIGRATION_CONFIG.SNAPSHOT_SHEET_NAME) return;
    
    var rowCount = sh.getLastRow();
    var colCount = sh.getLastColumn();
    var headers = getSheetHeaders(sh);
    
    snapshot.tabs.push({
      tabName: name,
      rowCount: rowCount,
      colCount: colCount,
      headers: headers
    });
  });
  
  // Store snapshot in _MigrationSnapshots sheet
  var snapSheet = ss.getSheetByName(MIGRATION_CONFIG.SNAPSHOT_SHEET_NAME);
  if (!snapSheet) {
    snapSheet = ss.insertSheet(MIGRATION_CONFIG.SNAPSHOT_SHEET_NAME);
    snapSheet.appendRow(["migration_id", "timestamp", "spreadsheet_id", "from_version", "to_version", "snapshot_json"]);
    styleHeaderRange(snapSheet, 6);
  }
  
  var fromVersion = getSchemaVersion(ss);
  snapSheet.appendRow([
    migrationId,
    snapshot.timestamp,
    snapshot.spreadsheetId,
    fromVersion,
    MIGRATION_CONFIG.TARGET_SCHEMA_VERSION,
    JSON.stringify(snapshot)
  ]);
  
  Logger.log("[BACKUP] Pre-migration snapshot recorded with ID: " + migrationId);
  return snapshot;
}

// ==========================================
// 7. CORE MIGRATION ENGINE (migrateDatabase)
// ==========================================

/**
 * Main migration entry point.
 * Safe, idempotent, non-destructive migration transforming v1 prototype sheets into v2 production schema.
 * 
 * Safe execution guarantees:
 * 1. Acquires script lock to prevent race conditions.
 * 2. Takes pre-migration snapshot.
 * 3. Inspects every tab in target schema.
 * 4. Never deletes existing tabs or columns.
 * 5. Appends missing columns to the right of existing columns.
 * 6. Non-destructively backfills mandatory foreign keys and flags.
 * 7. Records audit entry and updates version to 2.
 */
function migrateDatabase() {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(MIGRATION_CONFIG.LOCK_TIMEOUT_MS);
  if (!hasLock) {
    throw new Error("Could not acquire script lock for database migration. Another process is running.");
  }
  
  var report = {
    migrationId: "MIG_" + new Date().getTime(),
    timestamp: new Date().toISOString(),
    fromVersion: 1,
    toVersion: MIGRATION_CONFIG.TARGET_SCHEMA_VERSION,
    tabsCreated: [],
    tabsModified: [],
    tabsUnchanged: [],
    columnsAdded: {},
    backfillSummary: {},
    warnings: [],
    success: false
  };
  
  try {
    var ss = getSpreadsheetInstance();
    report.fromVersion = getSchemaVersion(ss);
    
    // Check if already fully migrated
    if (report.fromVersion >= MIGRATION_CONFIG.TARGET_SCHEMA_VERSION) {
      Logger.log("[MIGRATE] Database is already at schema version " + report.fromVersion + ". Running idempotency verification...");
    }
    
    // Step 1: Record Pre-Migration Snapshot
    createPreMigrationSnapshot(ss, report.migrationId);
    
    var targetSchema = getTargetDatabaseSchema();
    var targetTabNames = Object.keys(targetSchema);
    
    // Step 2: Iterate over each required table
    targetTabNames.forEach(function(sheetName) {
      var requiredColumns = targetSchema[sheetName];
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        // Tab does NOT exist: Create it cleanly with target schema headers
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(requiredColumns);
        styleHeaderRange(sheet, requiredColumns.length);
        report.tabsCreated.push(sheetName);
        report.columnsAdded[sheetName] = requiredColumns.slice();
        Logger.log("[MIGRATE] Created missing tab: " + sheetName);
      } else {
        // Tab exists: Inspect headers and add only missing columns non-destructively
        var currentHeaders = getSheetHeaders(sheet);
        
        if (currentHeaders.length === 0) {
          // Empty sheet with no headers
          sheet.appendRow(requiredColumns);
          styleHeaderRange(sheet, requiredColumns.length);
          report.tabsModified.push(sheetName);
          report.columnsAdded[sheetName] = requiredColumns.slice();
        } else {
          var colMap = getColumnIndexMap(currentHeaders, sheetName);
          var missingCols = [];
          
          requiredColumns.forEach(function(col) {
            var colLower = col.toLowerCase();
            if (colMap[col] === undefined && colMap[colLower] === undefined) {
              missingCols.push(col);
            }
          });
          
          if (missingCols.length > 0) {
            // Append missing columns to the right
            var startCol = sheet.getLastColumn() + 1;
            missingCols.forEach(function(newCol, idx) {
              sheet.getRange(1, startCol + idx).setValue(newCol);
            });
            styleHeaderRange(sheet, sheet.getLastColumn());
            report.tabsModified.push(sheetName);
            report.columnsAdded[sheetName] = missingCols;
            Logger.log("[MIGRATE] Tab " + sheetName + ": Added missing columns: " + missingCols.join(", "));
          } else {
            report.tabsUnchanged.push(sheetName);
          }
        }
      }
    });
    
    // Step 3: Non-Destructive Data Backfill
    performSafeDataBackfill(ss, report);
    
    // Step 4: Record Migration Audit Log
    recordMigrationAudit(ss, report);
    
    // Step 5: Update Schema Version
    setSchemaVersion(ss, MIGRATION_CONFIG.TARGET_SCHEMA_VERSION);
    report.success = true;
    Logger.log("[MIGRATE] Migration completed successfully. Schema version updated to " + MIGRATION_CONFIG.TARGET_SCHEMA_VERSION);
    
  } catch (err) {
    report.success = false;
    report.error = err.toString();
    report.stack = err.stack;
    Logger.log("[MIGRATE ERROR] " + err.toString());
  } finally {
    lock.releaseLock();
  }
  
  return report;
}

/**
 * Non-destructive data backfilling:
 * - Initializes `first_login: TRUE` for clients needing password migration
 * - Initializes `status: ACTIVE` and `failed_attempts: 0`
 * - Injects baseline `MIGRATED_EXISTING_STAGE` in StageHistory for existing services if empty
 * - Resolves missing `client_id` in Documents from parent service
 */
function performSafeDataBackfill(ss, report) {
  var backfill = {
    clientsBackfilled: 0,
    servicesBackfilled: 0,
    stageHistoryInitialized: 0,
    documentsBackfilled: 0
  };
  
  // 1. Backfill Clients
  var clientSheet = ss.getSheetByName("Clients");
  if (clientSheet && clientSheet.getLastRow() > 1) {
    var clientHeaders = getSheetHeaders(clientSheet);
    var colMap = getColumnIndexMap(clientHeaders, "Clients");
    var clientData = clientSheet.getDataRange().getValues();
    
    var emailIdx = colMap["email"];
    var loginIdIdx = colMap["login_id"];
    var firstLoginIdx = colMap["first_login"];
    var statusIdx = colMap["status"];
    var failedAttemptsIdx = colMap["failed_attempts"];
    var updatedAtIdx = colMap["updated_at"];
    
    for (var i = 1; i < clientData.length; i++) {
      var rowNum = i + 1;
      var row = clientData[i];
      var changed = false;
      
      // Populate login_id if empty
      if (loginIdIdx !== undefined && !row[loginIdIdx] && emailIdx !== undefined && row[emailIdx]) {
        clientSheet.getRange(rowNum, loginIdIdx + 1).setValue(normalizeEmail(row[emailIdx]));
        changed = true;
      }
      
      // Populate first_login flag if empty (marks for credential reset/migration)
      if (firstLoginIdx !== undefined && (row[firstLoginIdx] === "" || row[firstLoginIdx] === null || row[firstLoginIdx] === undefined)) {
        clientSheet.getRange(rowNum, firstLoginIdx + 1).setValue(true);
        changed = true;
      }
      
      // Populate status if empty
      if (statusIdx !== undefined && !row[statusIdx]) {
        clientSheet.getRange(rowNum, statusIdx + 1).setValue("Active");
        changed = true;
      }
      
      // Populate failed_attempts if empty
      if (failedAttemptsIdx !== undefined && (row[failedAttemptsIdx] === "" || row[failedAttemptsIdx] === null)) {
        clientSheet.getRange(rowNum, failedAttemptsIdx + 1).setValue(0);
        changed = true;
      }
      
      if (updatedAtIdx !== undefined && !row[updatedAtIdx]) {
        clientSheet.getRange(rowNum, updatedAtIdx + 1).setValue(new Date().toISOString());
        changed = true;
      }
      
      if (changed) backfill.clientsBackfilled++;
    }
  }
  
  // 2. Backfill Services (remaining_amount, dsc_count, current_stage)
  var serviceSheet = ss.getSheetByName("Services");
  if (serviceSheet && serviceSheet.getLastRow() > 1) {
    var srvHeaders = getSheetHeaders(serviceSheet);
    var srvColMap = getColumnIndexMap(srvHeaders, "Services");
    var srvData = serviceSheet.getDataRange().getValues();
    
    var totalIdx = srvColMap["total_amount"];
    var paidIdx = srvColMap["paid_amount"];
    var remIdx = srvColMap["remaining_amount"];
    var dscIdx = srvColMap["dsc_count"];
    
    for (var j = 1; j < srvData.length; j++) {
      var sRow = j + 1;
      var sData = srvData[j];
      var sChanged = false;
      
      if (remIdx !== undefined && (sData[remIdx] === "" || sData[remIdx] === null)) {
        var total = parseFloat(sData[totalIdx]) || 0;
        var paid = parseFloat(sData[paidIdx]) || 0;
        serviceSheet.getRange(sRow, remIdx + 1).setValue(total - paid);
        sChanged = true;
      }
      
      if (dscIdx !== undefined && (sData[dscIdx] === "" || sData[dscIdx] === null)) {
        serviceSheet.getRange(sRow, dscIdx + 1).setValue(2); // standard 2 DSCs
        sChanged = true;
      }
      
      if (sChanged) backfill.servicesBackfilled++;
    }
  }
  
  // 3. Initialize StageHistory baseline if tab was just created
  var historySheet = ss.getSheetByName("StageHistory");
  if (historySheet && historySheet.getLastRow() <= 1 && serviceSheet && serviceSheet.getLastRow() > 1) {
    var sDataAll = serviceSheet.getDataRange().getValues();
    var srvMap = getColumnIndexMap(getSheetHeaders(serviceSheet), "Services");
    var sIdIdx = srvMap["service_id"];
    var sStageIdx = srvMap["current_stage"];
    var sStatusIdx = srvMap["status"];
    
    for (var k = 1; k < sDataAll.length; k++) {
      var sId = sDataAll[k][sIdIdx];
      var stageName = (sStageIdx !== undefined && sDataAll[k][sStageIdx]) ? sDataAll[k][sStageIdx] : "Initial Stage";
      var status = (sStatusIdx !== undefined && sDataAll[k][sStatusIdx]) ? sDataAll[k][sStatusIdx] : "In Progress";
      
      historySheet.appendRow([
        "STGH_MIG_" + sId,
        sId,
        stageName,
        status,
        "SYSTEM_MIGRATION",
        "SYSTEM",
        new Date().toISOString(),
        "MIGRATED_EXISTING_STAGE: Baseline recorded during v2 schema migration."
      ]);
      backfill.stageHistoryInitialized++;
    }
  }
  
  // 4. Backfill Documents (link missing client_id from service)
  var docSheet = ss.getSheetByName("Documents");
  if (docSheet && docSheet.getLastRow() > 1 && serviceSheet && serviceSheet.getLastRow() > 1) {
    var docHeaders = getSheetHeaders(docSheet);
    var docMap = getColumnIndexMap(docHeaders, "Documents");
    var docData = docSheet.getDataRange().getValues();
    
    var dSrvIdIdx = docMap["service_id"];
    var dClientIdIdx = docMap["client_id"];
    
    // Build service -> client lookup
    var srvClientMap = {};
    var srvDataRows = serviceSheet.getDataRange().getValues();
    var sHeaders = getSheetHeaders(serviceSheet);
    var sMap = getColumnIndexMap(sHeaders, "Services");
    for (var m = 1; m < srvDataRows.length; m++) {
      var srvIdVal = srvDataRows[m][sMap["service_id"]];
      var cIdVal = srvDataRows[m][sMap["client_id"]];
      if (srvIdVal && cIdVal) srvClientMap[srvIdVal] = cIdVal;
    }
    
    if (dClientIdIdx !== undefined && dSrvIdIdx !== undefined) {
      for (var n = 1; n < docData.length; n++) {
        var docRow = n + 1;
        var existingCId = docData[n][dClientIdIdx];
        var parentSrvId = docData[n][dSrvIdIdx];
        
        if (!existingCId && parentSrvId && srvClientMap[parentSrvId]) {
          docSheet.getRange(docRow, dClientIdIdx + 1).setValue(srvClientMap[parentSrvId]);
          backfill.documentsBackfilled++;
        }
      }
    }
  }
  
  report.backfillSummary = backfill;
}

/**
 * Records a single migration audit entry in the AuditLogs tab.
 */
function recordMigrationAudit(ss, report) {
  var auditSheet = ss.getSheetByName("AuditLogs");
  if (!auditSheet) return;
  
  auditSheet.appendRow([
    "LOG_" + new Date().getTime(),
    new Date().toISOString(),
    "SYSTEM_MIGRATION",
    "SYSTEM",
    "DATABASE_SCHEMA_MIGRATED",
    "SYSTEM",
    report.migrationId,
    "Google Apps Script Runtime",
    JSON.stringify({
      migrationId: report.migrationId,
      fromVersion: report.fromVersion,
      toVersion: report.toVersion,
      tabsCreated: report.tabsCreated,
      tabsModified: report.tabsModified,
      tabsUnchanged: report.tabsUnchanged,
      backfillSummary: report.backfillSummary
    })
  ]);
}

// ==========================================
// 8. DATABASE INTEGRITY & AUDIT SCANNER
// ==========================================

/**
 * Executes a comprehensive relationship and consistency audit across all database tables.
 * Returns a detailed integrity report without modifying any data.
 */
function runDatabaseIntegrityScan(ss) {
  if (!ss) ss = getSpreadsheetInstance();
  
  var result = {
    scannedAt: new Date().toISOString(),
    duplicateClients: [],
    orphanServices: [],
    orphanDocuments: [],
    orphanStageHistory: [],
    paymentInconsistencies: [],
    spocInconsistencies: [],
    formulaCheck: [],
    summary: {
      totalClients: 0,
      totalServices: 0,
      totalDocuments: 0,
      totalSPOCs: 0,
      issuesFoundCount: 0
    }
  };
  
  // 1. Audit Clients
  var clientSheet = ss.getSheetByName("Clients");
  var clientIds = {};
  var emailMap = {};
  var mobileMap = {};
  
  if (clientSheet && clientSheet.getLastRow() > 1) {
    var cHeaders = getSheetHeaders(clientSheet);
    var cMap = getColumnIndexMap(cHeaders, "Clients");
    var cData = clientSheet.getDataRange().getValues();
    result.summary.totalClients = cData.length - 1;
    
    for (var i = 1; i < cData.length; i++) {
      var cId = cData[i][cMap["client_id"]];
      var email = normalizeEmail(cData[i][cMap["email"]]);
      var mobile = normalizeMobile(cData[i][cMap["mobile"]]);
      var cName = cData[i][cMap["name"]] || cData[i][cMap["company name"]];
      
      if (cId) clientIds[cId] = true;
      
      // Check duplicate email
      if (email) {
        if (emailMap[email]) {
          result.duplicateClients.push({
            type: "DUPLICATE_EMAIL",
            email: email,
            firstClientId: emailMap[email].clientId,
            duplicateClientId: cId,
            companyName: cName
          });
          result.summary.issuesFoundCount++;
        } else {
          emailMap[email] = { clientId: cId, name: cName };
        }
      }
      
      // Check duplicate mobile
      if (mobile && mobile.length >= 10) {
        if (mobileMap[mobile]) {
          result.duplicateClients.push({
            type: "DUPLICATE_MOBILE",
            mobile: mobile,
            firstClientId: mobileMap[mobile].clientId,
            duplicateClientId: cId,
            companyName: cName
          });
          result.summary.issuesFoundCount++;
        } else {
          mobileMap[mobile] = { clientId: cId, name: cName };
        }
      }
    }
  }
  
  // 2. Audit SPOCs
  var spocSheet = ss.getSheetByName("SPOCs");
  var spocIds = {};
  if (spocSheet && spocSheet.getLastRow() > 1) {
    var spHeaders = getSheetHeaders(spocSheet);
    var spMap = getColumnIndexMap(spHeaders, "SPOCs");
    var spData = spocSheet.getDataRange().getValues();
    result.summary.totalSPOCs = spData.length - 1;
    
    for (var s = 1; s < spData.length; s++) {
      var spId = spData[s][spMap["spoc_id"]];
      if (spId) spocIds[spId] = true;
    }
  }
  
  // 3. Audit Services & Payments
  var serviceSheet = ss.getSheetByName("Services");
  var serviceIds = {};
  if (serviceSheet && serviceSheet.getLastRow() > 1) {
    var srvHeaders = getSheetHeaders(serviceSheet);
    var srvMap = getColumnIndexMap(srvHeaders, "Services");
    var srvData = serviceSheet.getDataRange().getValues();
    result.summary.totalServices = srvData.length - 1;
    
    for (var j = 1; j < srvData.length; j++) {
      var srvId = srvData[j][srvMap["service_id"]];
      var parentClientId = srvData[j][srvMap["client_id"]];
      var spocId = srvData[j][srvMap["spoc_id"]];
      var total = parseFloat(srvData[j][srvMap["total_amount"]]) || 0;
      var paid = parseFloat(srvData[j][srvMap["paid_amount"]]) || 0;
      var remaining = parseFloat(srvData[j][srvMap["remaining_amount"]]) || 0;
      
      if (srvId) serviceIds[srvId] = true;
      
      // Orphan service check
      if (parentClientId && !clientIds[parentClientId]) {
        result.orphanServices.push({
          serviceId: srvId,
          clientId: parentClientId,
          reason: "Referenced client_id does not exist in Clients sheet."
        });
        result.summary.issuesFoundCount++;
      }
      
      // Invalid SPOC reference check
      if (spocId && !spocIds[spocId]) {
        result.spocInconsistencies.push({
          serviceId: srvId,
          spocId: spocId,
          reason: "Referenced spoc_id does not exist in SPOCs sheet."
        });
        result.summary.issuesFoundCount++;
      }
      
      // Payment arithmetic check: remaining === total - paid
      var expectedRemaining = total - paid;
      if (Math.abs(remaining - expectedRemaining) > 0.01) {
        result.paymentInconsistencies.push({
          serviceId: srvId,
          totalAmount: total,
          paidAmount: paid,
          actualRemaining: remaining,
          expectedRemaining: expectedRemaining,
          discrepancy: remaining - expectedRemaining
        });
        result.summary.issuesFoundCount++;
      }
    }
  }
  
  // 4. Audit Documents
  var docSheet = ss.getSheetByName("Documents");
  if (docSheet && docSheet.getLastRow() > 1) {
    var docHeaders = getSheetHeaders(docSheet);
    var docMap = getColumnIndexMap(docHeaders, "Documents");
    var docData = docSheet.getDataRange().getValues();
    result.summary.totalDocuments = docData.length - 1;
    
    for (var k = 1; k < docData.length; k++) {
      var docId = docData[k][docMap["document_id"]];
      var docSrvId = docData[k][docMap["service_id"]];
      
      if (docSrvId && !serviceIds[docSrvId]) {
        result.orphanDocuments.push({
          documentId: docId,
          serviceId: docSrvId,
          reason: "Referenced service_id does not exist in Services sheet."
        });
        result.summary.issuesFoundCount++;
      }
    }
  }
  
  return result;
}
