/**
 * Legal Sthal - Master Google Apps Script Backend (Code.gs)
 * Google Sheets Database Engine, REST API Web App (doGet/doPost), Google Drive Uploader & Form Triggers
 * 
 * Version: 2.0.0
 * Architecture: Serverless Google Apps Script + Google Sheets + Google Drive
 */

// ==========================================
// 1. CONFIGURATION & GLOBALS
// ==========================================
var CONFIG = {
  APP_NAME: "Legal Sthal Portal Engine",
  ADMIN_EMAIL: "admin@legalsthal.com",
  SUPPORT_EMAIL: "support@legalsthal.com",
  DRIVE_FOLDER_NAME: "LegalSthal_Client_Documents",
  DEFAULT_TIMEZONE: "Asia/Kolkata"
};

/**
 * Utility to get active or configured Spreadsheet
 */
function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (prop) {
    return SpreadsheetApp.openById(prop);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Utility to get or create Google Drive Folder for Document Storage
 */
function getDriveFolder() {
  var prop = PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");
  if (prop) {
    try { return DriveApp.getFolderById(prop); } catch (e) {}
  }
  
  var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    var folder = folders.next();
    PropertiesService.getScriptProperties().setProperty("DRIVE_FOLDER_ID", folder.getId());
    return folder;
  }
  
  var newFolder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  PropertiesService.getScriptProperties().setProperty("DRIVE_FOLDER_ID", newFolder.getId());
  return newFolder;
}

// ==========================================
// 2. AUTOMATED DATABASE SHEET SETUP
// ==========================================
/**
 * Run this function ONCE in Apps Script Editor to set up all required database tabs and headers.
 */
function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  
  var schema = {
    "Clients": ["Client ID", "Company Name", "Contact Person", "Email", "Mobile", "State", "Address", "GSTIN", "Password", "Created At", "Status"],
    "Services": ["Service ID", "Client ID", "Service Code", "Service Type", "Company Type", "State", "Status", "Current Stage Index", "Progress %", "SPOC ID", "Total Amount", "Paid Amount", "Remaining Amount", "Created At", "Completed On", "Certificate URL"],
    "ServiceStages": ["Stage ID", "Service ID", "Stage Name", "Stage Status", "Completed On", "Description", "Sequence Order"],
    "Documents": ["Document ID", "Service ID", "Document Name", "Status", "Submitted On", "Rejection Reason", "Required", "Drive File URL"],
    "QuoteRequests": ["Request ID", "Client ID", "Client Name", "Service Name", "Company Type", "State", "Mobile", "Email", "Requested On", "Status", "Quote Amount", "Remarks"],
    "SPOCs": ["SPOC ID", "Name", "Title", "Mobile", "Email", "Assigned Clients", "Status", "Avatar URL"],
    "Notifications": ["Notification ID", "Client ID", "Client Name", "Event Type", "Details", "Channel", "Date", "Status"],
    "AuditLogs": ["Log ID", "Timestamp", "Action", "Performed By", "Details JSON"]
  };
  
  Object.keys(schema).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema[sheetName]);
      var headerRange = sheet.getRange(1, 1, 1, schema[sheetName].length);
      headerRange.setBackground("#0b1325");
      headerRange.setFontColor("#D4AF37");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  });

  // Create document upload folder in Drive
  getDriveFolder();

  Logger.log("Legal Sthal database sheets initialized successfully!");
  return "Success! Database sheets initialized.";
}

// ==========================================
// 3. REST API ENDPOINTS (doGet & doPost)
// ==========================================

/**
 * HTTP GET Handler - Returns JSON Data
 */
function doGet(e) {
  var output = { success: false, data: null, error: null };
  
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "healthCheck";
    var clientId = (e && e.parameter && e.parameter.clientId) ? e.parameter.clientId : null;
    var serviceId = (e && e.parameter && e.parameter.serviceId) ? e.parameter.serviceId : null;
    
    switch (action) {
      case "healthCheck":
        output = {
          success: true,
          status: "Online",
          message: "Legal Sthal Apps Script Engine is active.",
          timestamp: new Date().toISOString()
        };
        break;
        
      case "getClients":
        output.success = true;
        output.data = getSheetDataAsObjects("Clients");
        break;
        
      case "getServices":
        var services = getSheetDataAsObjects("Services");
        if (clientId) {
          services = services.filter(function(s) { return s["Client ID"] === clientId; });
        }
        output.success = true;
        output.data = services;
        break;

      case "getServiceDetails":
        if (!serviceId) throw new Error("Service ID is required.");
        var allServices = getSheetDataAsObjects("Services");
        var service = allServices.find(function(s) { return s["Service ID"] === serviceId; });
        if (!service) throw new Error("Service not found.");
        
        var stages = getSheetDataAsObjects("ServiceStages").filter(function(st) { return st["Service ID"] === serviceId; });
        var docs = getSheetDataAsObjects("Documents").filter(function(d) { return d["Service ID"] === serviceId; });
        
        output.success = true;
        output.data = { service: service, stages: stages, documents: docs };
        break;
        
      case "getQuoteRequests":
        var quotes = getSheetDataAsObjects("QuoteRequests");
        if (clientId) {
          quotes = quotes.filter(function(q) { return q["Client ID"] === clientId; });
        }
        output.success = true;
        output.data = quotes;
        break;
        
      case "getDocuments":
        var documents = getSheetDataAsObjects("Documents");
        if (serviceId) {
          documents = documents.filter(function(d) { return d["Service ID"] === serviceId; });
        }
        output.success = true;
        output.data = documents;
        break;
        
      default:
        output.error = "Unknown action parameter: " + action;
    }
  } catch (err) {
    output.success = false;
    output.error = err.toString();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTTP POST Handler - Processes Data Writes / Actions
 */
function doPost(e) {
  var output = { success: false, data: null, message: "", error: null };
  
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    var action = payload.action;
    if (!action) throw new Error("Action payload parameter missing.");
    
    switch (action) {
      case "createClient":
        output = handleCreateClient(payload.clientData);
        break;
        
      case "createService":
        output = handleCreateService(payload.clientId, payload.serviceData);
        break;
        
      case "updateServiceStage":
        output = handleUpdateServiceStage(payload.serviceId, payload.stageIndex);
        break;
        
      case "uploadDocument":
        output = handleUploadDocument(payload.serviceId, payload.documentName, payload.fileBase64, payload.mimeType);
        break;

      case "verifyDocument":
        output = handleVerifyDocument(payload.serviceId, payload.documentId);
        break;

      case "rejectDocument":
        output = handleRejectDocument(payload.serviceId, payload.documentId, payload.reason);
        break;
        
      case "createQuoteRequest":
        output = handleCreateQuoteRequest(payload.quoteData);
        break;
        
      case "updateQuoteStatus":
        output = handleUpdateQuoteStatus(payload.quoteId, payload.status, payload.amount, payload.remarks);
        break;
        
      default:
        output.error = "Invalid POST action: " + action;
    }
  } catch (err) {
    output.success = false;
    output.error = err.toString();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 4. BUSINESS LOGIC HANDLERS
// ==========================================

function handleCreateClient(data) {
  var sheet = getSheet("Clients");
  var existing = getSheetDataAsObjects("Clients").find(function(c) {
    return c["Email"].toLowerCase() === (data.email || "").toLowerCase();
  });
  
  if (existing) {
    return { success: false, isExisting: true, client: existing, message: "Client already registered with this email." };
  }
  
  var newId = "CL" + padZero(sheet.getLastRow(), 3);
  var createdAt = formatDate(new Date());
  
  var row = [
    newId,
    data.companyName,
    data.contactPerson || data.companyName,
    data.email,
    data.mobile,
    data.state || "Gujarat",
    data.address || "Pending Address",
    data.gstin || "Pending",
    data.password || "password123",
    createdAt,
    "Active"
  ];
  
  sheet.appendRow(row);
  
  // Send Welcome Email
  sendEmail(data.email, "Welcome to Legal Sthal Client Portal", 
    "Hello " + (data.contactPerson || data.companyName) + ",\n\n" +
    "Your Legal Sthal portal account has been successfully created.\n" +
    "Login Email: " + data.email + "\n" +
    "Access Portal: https://legalsthal.com/portal\n\n" +
    "Best regards,\nLegal Sthal Team"
  );
  
  logAudit("Create Client", newId, JSON.stringify(data));
  return { success: true, client: { id: newId, companyName: data.companyName, email: data.email } };
}

function handleCreateService(clientId, data) {
  var sheet = getSheet("Services");
  var totalCount = sheet.getLastRow();
  var newId = "SRV" + padZero(totalCount, 3);
  var prefix = (data.serviceType || "").toLowerCase().indexOf("gst") !== -1 ? "GST" : "INC";
  var serviceCode = prefix + "-2026-" + padZero(totalCount, 3);
  
  var row = [
    newId,
    clientId,
    serviceCode,
    data.serviceType,
    data.companyType || "Private Limited",
    data.state || "Gujarat",
    "In Progress",
    1,
    25,
    data.spocId || "SPOC001",
    data.totalAmount || 9999,
    data.paidAmount || 0,
    (data.totalAmount || 9999) - (data.paidAmount || 0),
    formatDate(new Date()),
    "",
    ""
  ];
  
  sheet.appendRow(row);
  
  // Append default stages
  var stagesSheet = getSheet("ServiceStages");
  var defaultStages = [
    { name: "Initiation & Verification", desc: "Service request onboarded.", status: "COMPLETED" },
    { name: "Document Verification", desc: "Verifying business and identity proofs.", status: "CURRENT" },
    { name: "Filing & Processing", desc: "Government portal application submission.", status: "PENDING" },
    { name: "Approval & Delivery", desc: "Final registration certificate generation.", status: "PENDING" }
  ];
  
  defaultStages.forEach(function(st, idx) {
    stagesSheet.appendRow([
      "STG_" + newId + "_" + (idx + 1),
      newId,
      st.name,
      st.status,
      st.status === "COMPLETED" ? formatDate(new Date()) : "",
      st.desc,
      idx + 1
    ]);
  });
  
  logAudit("Create Service", newId, serviceCode);
  return { success: true, serviceId: newId, serviceCode: serviceCode };
}

function handleUpdateServiceStage(serviceId, stageIndex) {
  var sheet = getSheet("Services");
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === serviceId) {
      targetRow = i + 1;
      break;
    }
  }
  
  if (targetRow === -1) return { success: false, message: "Service not found" };
  
  // Update Current Stage Index & Progress
  var totalStages = 4; // default
  var progress = Math.round(((stageIndex + 1) / totalStages) * 100);
  
  sheet.getRange(targetRow, 8).setValue(stageIndex);
  sheet.getRange(targetRow, 9).setValue(progress);
  
  if (progress >= 100) {
    sheet.getRange(targetRow, 7).setValue("Completed");
    sheet.getRange(targetRow, 15).setValue(formatDate(new Date()));
  }
  
  logAudit("Update Stage", serviceId, "Stage index: " + stageIndex);
  return { success: true, serviceId: serviceId, newStageIndex: stageIndex, progress: progress };
}

function handleUploadDocument(serviceId, documentName, fileBase64, mimeType) {
  var folder = getDriveFolder();
  var decoded = Utilities.base64Decode(fileBase64);
  var blob = Utilities.newBlob(decoded, mimeType || "application/pdf", documentName + "_" + serviceId + ".pdf");
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var fileUrl = file.getUrl();
  var sheet = getSheet("Documents");
  var docId = "DOC_" + new Date().getTime();
  
  sheet.appendRow([
    docId,
    serviceId,
    documentName,
    "Under Review",
    formatDate(new Date()),
    "",
    "TRUE",
    fileUrl
  ]);
  
  logAudit("Upload Document", serviceId, docId + " - " + fileUrl);
  return { success: true, documentId: docId, fileUrl: fileUrl };
}

function handleVerifyDocument(serviceId, docId) {
  var sheet = getSheet("Documents");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === docId) {
      sheet.getRange(i + 1, 4).setValue("Verified");
      sheet.getRange(i + 1, 6).setValue("");
      return { success: true, documentId: docId, status: "Verified" };
    }
  }
  return { success: false, message: "Document ID not found." };
}

function handleRejectDocument(serviceId, docId, reason) {
  var sheet = getSheet("Documents");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === docId) {
      sheet.getRange(i + 1, 4).setValue("Rejected");
      sheet.getRange(i + 1, 6).setValue(reason || "Unclear copy. Please re-upload.");
      return { success: true, documentId: docId, status: "Rejected" };
    }
  }
  return { success: false, message: "Document ID not found." };
}

function handleCreateQuoteRequest(quoteData) {
  var sheet = getSheet("QuoteRequests");
  var newId = "QR" + padZero(sheet.getLastRow(), 3);
  
  sheet.appendRow([
    newId,
    quoteData.clientId || "CL001",
    quoteData.clientName || "Client",
    quoteData.serviceName,
    quoteData.companyType || "Private Limited",
    quoteData.state || "Gujarat",
    quoteData.mobile,
    quoteData.email,
    formatDate(new Date()),
    "Requested",
    "",
    quoteData.remarks || "Standard inquiry"
  ]);
  
  // Alert Admin via Email
  sendEmail(CONFIG.ADMIN_EMAIL, "New Legal Sthal Quote Request: " + quoteData.serviceName,
    "New quote inquiry received!\n\n" +
    "Client: " + quoteData.clientName + "\n" +
    "Service: " + quoteData.serviceName + "\n" +
    "Mobile: " + quoteData.mobile + "\n" +
    "State: " + quoteData.state + "\n" +
    "Remarks: " + (quoteData.remarks || "None")
  );
  
  return { success: true, quoteId: newId };
}

function handleUpdateQuoteStatus(quoteId, status, amount, remarks) {
  var sheet = getSheet("QuoteRequests");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === quoteId) {
      sheet.getRange(i + 1, 10).setValue(status);
      if (amount) sheet.getRange(i + 1, 11).setValue(amount);
      if (remarks) sheet.getRange(i + 1, 12).setValue(remarks);
      return { success: true, quoteId: quoteId, status: status };
    }
  }
  return { success: false, message: "Quote ID not found." };
}

// ==========================================
// 5. GOOGLE FORMS SUBMISSION TRIGGER
// ==========================================

/**
 * Automated Trigger Handler for Google Form Responses
 */
function onFormSubmit(e) {
  try {
    var itemResponses = e.response.getItemResponses();
    var clientEmail = "";
    var docName = "";
    var fileUrl = "";
    
    itemResponses.forEach(function(response) {
      var title = response.getItem().getTitle().toLowerCase();
      var answer = response.getResponse();
      
      if (title.indexOf("email") !== -1) clientEmail = answer;
      if (title.indexOf("document name") !== -1 || title.indexOf("document type") !== -1) docName = answer;
      if (title.indexOf("upload") !== -1) fileUrl = Array.isArray(answer) ? answer.join(", ") : answer;
    });

    if (clientEmail && fileUrl) {
      var docsSheet = getSheet("Documents");
      docsSheet.appendRow([
        "DOC_FORM_" + new Date().getTime(),
        "SRV001", // default attached service
        docName || "Uploaded Document",
        "Under Review",
        formatDate(new Date()),
        "",
        "TRUE",
        fileUrl
      ]);
      
      logAudit("Form Submit", clientEmail, "Uploaded: " + docName);
    }
  } catch (err) {
    Logger.log("onFormSubmit Error: " + err.toString());
  }
}

// ==========================================
// 6. HELPER FUNCTIONS
// ==========================================

function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabaseSheets();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

function getSheetDataAsObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function sendEmail(recipient, subject, body) {
  try {
    MailApp.sendEmail(recipient, subject, body, {
      name: "Legal Sthal Operations"
    });
  } catch (e) {
    Logger.log("Failed to send email to " + recipient + ": " + e.toString());
  }
}

function logAudit(action, entityId, details) {
  try {
    var sheet = getSheet("AuditLogs");
    sheet.appendRow([
      "LOG_" + new Date().getTime(),
      new Date().toISOString(),
      action,
      entityId,
      details
    ]);
  } catch (e) {}
}

function padZero(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

function formatDate(date) {
  return Utilities.formatDate(date, CONFIG.DEFAULT_TIMEZONE, "dd MMM yyyy");
}
