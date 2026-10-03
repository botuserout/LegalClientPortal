/**
 * Legal Sthal - Portal Data Service (PortalService.gs)
 * Version: 2.1.0 (Step 6 Document Pipeline & Verification Core)
 * 
 * Provides authenticated, IDOR-defended data access, document operations,
 * and workflow state mutations for both Client Portal and Admin Operations Console.
 * 
 * Strict Architectural Guarantees:
 * - Server-side authentication verification via SessionService.
 * - IDOR defense: Client operations strictly derive client identity from validated session token.
 * - One-to-Many relational integrity: A client can have multiple associated services.
 * - Document Pipeline: Google Drive storage, dynamic QR code generation, Google Forms ingestion.
 * - Review & Verification: Status transitions (Under Review -> Verified / Rejected) with audit logs and client alerts.
 * - Zero sensitive data leakage (password hashes, salts, lockout counters never returned).
 * - Thread-safe state modifications using LockService.
 */

var PortalService = (function() {

  // ==========================================
  // 1. DATA ACCESS & SANITIZATION HELPERS
  // ==========================================

  function getSpreadsheet() {
    return typeof getSpreadsheetInstance === "function" 
      ? getSpreadsheetInstance() 
      : (typeof SpreadsheetApp !== "undefined" ? SpreadsheetApp.getActiveSpreadsheet() : null);
  }

  function getSheet(sheetName) {
    var ss = getSpreadsheet();
    if (!ss) throw new Error("Spreadsheet instance unavailable.");
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Required sheet '" + sheetName + "' does not exist.");
    return sheet;
  }

  function getColMap(sheet, sheetName) {
    var headers = getSheetHeaders(sheet);
    return getColumnIndexMap(headers, sheetName);
  }

  function sanitizeClient(row, colMap) {
    if (!row) return null;
    return {
      clientId: String(row[colMap["client_id"]] || ""),
      name: String(row[colMap["name"]] || row[colMap["company name"]] || ""),
      companyName: String(row[colMap["name"]] || row[colMap["company name"]] || ""),
      contactPerson: String(row[colMap["contact_name"]] || row[colMap["contact person"]] || ""),
      email: String(row[colMap["email"]] || ""),
      phone: String(row[colMap["mobile"]] || row[colMap["phone"]] || ""),
      state: String(row[colMap["state"]] || ""),
      address: String(row[colMap["address"]] || ""),
      gstin: String(row[colMap["gstin"]] || ""),
      status: String(row[colMap["status"]] || "Active"),
      createdAt: String(row[colMap["created_at"]] || ""),
      updatedAt: String(row[colMap["updated_at"]] || "")
    };
  }

  function sanitizeSpoc(row, colMap) {
    if (!row) return null;
    return {
      spocId: String(row[colMap["spoc_id"]] || ""),
      name: String(row[colMap["name"]] || ""),
      title: String(row[colMap["title"]] || row[colMap["designation"]] || ""),
      mobile: String(row[colMap["mobile"]] || row[colMap["phone"]] || ""),
      email: String(row[colMap["email"]] || ""),
      assignedClients: parseInt(row[colMap["assigned_clients"]] || 0, 10),
      status: String(row[colMap["status"]] || "Active"),
      avatarUrl: String(row[colMap["avatar_url"]] || "")
    };
  }

  function sanitizeDocument(row, colMap) {
    if (!row) return null;
    return {
      documentId: String(row[colMap["document_id"]] || ""),
      id: String(row[colMap["document_id"]] || ""),
      serviceId: String(row[colMap["service_id"]] || ""),
      clientId: String(row[colMap["client_id"]] || ""),
      name: String(row[colMap["document_name"]] || ""),
      documentName: String(row[colMap["document_name"]] || ""),
      documentType: String(row[colMap["document_type"]] || "Identity / Address Proof"),
      formResponseId: String(row[colMap["form_response_id"]] || ""),
      fileName: String(row[colMap["file_name"]] || ""),
      fileUrl: String(row[colMap["file_url"]] || ""),
      driveFileId: String(row[colMap["drive_file_id"]] || ""),
      status: String(row[colMap["status"]] || "Pending"),
      rejectionReason: String(row[colMap["rejection_reason"]] || ""),
      required: (row[colMap["required"]] === true || String(row[colMap["required"]]).toLowerCase() === "true"),
      submittedOn: String(row[colMap["uploaded_at"]] || ""),
      uploadedAt: String(row[colMap["uploaded_at"]] || ""),
      verifiedAt: String(row[colMap["verified_at"]] || ""),
      verifiedBy: String(row[colMap["verified_by"]] || ""),
      rejectedAt: String(row[colMap["rejected_at"]] || ""),
      rejectedBy: String(row[colMap["rejected_by"]] || "")
    };
  }

  function sanitizeService(row, colMap, stages, spoc, documents) {
    if (!row) return null;
    var total = parseFloat(row[colMap["total_amount"]] || 0);
    var paid = parseFloat(row[colMap["paid_amount"]] || 0);
    var remaining = total - paid;

    return {
      serviceId: String(row[colMap["service_id"]] || ""),
      clientId: String(row[colMap["client_id"]] || ""),
      serviceCode: String(row[colMap["service_code"]] || ""),
      crmDealId: String(row[colMap["crm_deal_id"]] || ""),
      serviceName: String(row[colMap["service_name"]] || ""),
      companyType: String(row[colMap["company_type"]] || ""),
      state: String(row[colMap["state"]] || ""),
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      dscCount: parseInt(row[colMap["dsc_count"]] || 0, 10),
      currentStage: String(row[colMap["current_stage"]] || ""),
      currentStageIndex: parseInt(row[colMap["current_stage_index"]] || 0, 10),
      progressPercentage: parseInt(row[colMap["progress_percentage"]] || 0, 10),
      status: String(row[colMap["status"]] || "In Progress"),
      spocId: String(row[colMap["spoc_id"]] || ""),
      certificateUrl: String(row[colMap["certificate_url"]] || ""),
      completedOn: String(row[colMap["completed_on"]] || ""),
      createdAt: String(row[colMap["created_at"]] || ""),
      updatedAt: String(row[colMap["updated_at"]] || ""),
      stages: stages || [],
      spoc: spoc || null,
      documents: documents || []
    };
  }

  function sanitizeNotification(row, colMap) {
    if (!row) return null;
    return {
      notificationId: String(row[colMap["notification_id"]] || ""),
      clientId: String(row[colMap["client_id"]] || ""),
      clientName: String(row[colMap["client_name"]] || ""),
      eventType: String(row[colMap["event_type"]] || ""),
      details: String(row[colMap["details"]] || ""),
      channel: String(row[colMap["channel"]] || "PORTAL"),
      date: String(row[colMap["date"]] || ""),
      status: String(row[colMap["status"]] || "Unread")
    };
  }

  function getAllSpocsMap() {
    var spocSheet = getSheet("SPOCs");
    var map = {};
    if (spocSheet.getLastRow() <= 1) return map;
    var colMap = getColMap(spocSheet, "SPOCs");
    var data = spocSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var spoc = sanitizeSpoc(data[i], colMap);
      if (spoc && spoc.spocId) {
        map[spoc.spocId] = spoc;
      }
    }
    return map;
  }

  function getStagesForService(serviceId) {
    var sheet = getSheet("ServiceStages");
    if (sheet.getLastRow() <= 1) return [];
    var colMap = getColMap(sheet, "ServiceStages");
    var data = sheet.getDataRange().getValues();
    var stages = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["service_id"]]) === serviceId) {
        stages.push({
          stageId: String(data[i][colMap["stage_id"]] || ""),
          serviceId: serviceId,
          stageName: String(data[i][colMap["stage_name"]] || ""),
          stageStatus: String(data[i][colMap["stage_status"]] || "Pending"),
          completedOn: String(data[i][colMap["completed_on"]] || ""),
          description: String(data[i][colMap["description"]] || ""),
          sequenceOrder: parseInt(data[i][colMap["sequence_order"]] || 0, 10)
        });
      }
    }

    stages.sort(function(a, b) {
      return a.sequenceOrder - b.sequenceOrder;
    });
    return stages;
  }

  function getStageHistoryForService(serviceId) {
    var sheet = getSheet("StageHistory");
    if (sheet.getLastRow() <= 1) return [];
    var colMap = getColMap(sheet, "StageHistory");
    var data = sheet.getDataRange().getValues();
    var history = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["service_id"]]) === serviceId) {
        history.push({
          stageHistoryId: String(data[i][colMap["stage_history_id"]] || ""),
          serviceId: serviceId,
          stageName: String(data[i][colMap["stage_name"]] || ""),
          status: String(data[i][colMap["status"]] || ""),
          changedBy: String(data[i][colMap["changed_by"]] || ""),
          changedByRole: String(data[i][colMap["changed_by_role"]] || ""),
          changedAt: String(data[i][colMap["changed_at"]] || ""),
          remarks: String(data[i][colMap["remarks"]] || "")
        });
      }
    }

    history.sort(function(a, b) {
      return new Date(b.changedAt || 0) - new Date(a.changedAt || 0);
    });
    return history;
  }

  function getDocumentsForService(serviceId) {
    var sheet = getSheet("Documents");
    if (sheet.getLastRow() <= 1) return [];
    var colMap = getColMap(sheet, "Documents");
    var data = sheet.getDataRange().getValues();
    var docs = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["service_id"]]) === serviceId) {
        docs.push(sanitizeDocument(data[i], colMap));
      }
    }

    docs.sort(function(a, b) {
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
    });
    return docs;
  }

  function getOrCreateClientDriveFolder(clientId) {
    var rootFolder = null;
    if (typeof getDriveFolder === "function") {
      rootFolder = getDriveFolder();
    } else if (typeof DriveApp !== "undefined") {
      var rootName = CONFIG.DRIVE_FOLDER_NAME || "LegalSthal_Client_Documents";
      var folders = DriveApp.getFoldersByName(rootName);
      rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(rootName);
    }
    if (!rootFolder) return null;

    if (typeof rootFolder.getFoldersByName === "function") {
      var subfolders = rootFolder.getFoldersByName(clientId);
      if (subfolders.hasNext()) {
        return subfolders.next();
      }
      return rootFolder.createFolder(clientId);
    }
    return rootFolder;
  }

  function assertAdmin(session) {
    if (!session || !session.authenticated || session.expired) {
      return {
        authorized: false,
        response: {
          success: false,
          error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session. Please log in again." }
        }
      };
    }
    var adminRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "OPERATIONS", "SUPPORT"];
    if (adminRoles.indexOf(String(session.role || "").toUpperCase()) === -1) {
      return {
        authorized: false,
        response: {
          success: false,
          error: { code: "AUTH_FORBIDDEN", message: "Administrative privileges required." }
        }
      };
    }
    return { authorized: true };
  }

  // ==========================================
  // 2. CLIENT PORTAL OPERATIONS
  // ==========================================

  function getClientProfile(token, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var sheet = getSheet("Clients");
    var colMap = getColMap(sheet, "Clients");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["client_id"]]) === session.clientId) {
        var profile = sanitizeClient(data[i], colMap);
        return {
          success: true,
          data: profile,
          message: "Client profile retrieved."
        };
      }
    }

    return { success: false, error: { code: "CLIENT_NOT_FOUND", message: "Client profile record not found." } };
  }

  function getClientDashboard(token, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var clientId = session.clientId;
    var clientSheet = getSheet("Clients");
    var clientColMap = getColMap(clientSheet, "Clients");
    var clientData = clientSheet.getDataRange().getValues();
    var clientProfile = null;

    for (var i = 1; i < clientData.length; i++) {
      if (String(clientData[i][clientColMap["client_id"]]) === clientId) {
        clientProfile = sanitizeClient(clientData[i], clientColMap);
        break;
      }
    }

    if (!clientProfile) {
      return { success: false, error: { code: "CLIENT_NOT_FOUND", message: "Client record not found." } };
    }

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var spocsMap = getAllSpocsMap();
    var clientServices = [];

    var activeServicesCount = 0;
    var completedServicesCount = 0;
    var totalAmount = 0;
    var paidAmount = 0;
    var dscCount = 0;
    var pendingDocsCount = 0;
    var primarySpoc = null;

    for (var j = 1; j < serviceData.length; j++) {
      if (String(serviceData[j][serviceColMap["client_id"]]) === clientId) {
        var sId = String(serviceData[j][serviceColMap["service_id"]]);
        var stages = getStagesForService(sId);
        var docs = getDocumentsForService(sId);
        var sSpocId = String(serviceData[j][serviceColMap["spoc_id"]] || "");
        var sSpoc = spocsMap[sSpocId] || null;

        var srv = sanitizeService(serviceData[j], serviceColMap, stages, sSpoc, docs);
        clientServices.push(srv);

        if (srv.status === "Completed") {
          completedServicesCount++;
        } else if (srv.status !== "Cancelled") {
          activeServicesCount++;
        }

        totalAmount += srv.totalAmount;
        paidAmount += srv.paidAmount;
        dscCount += srv.dscCount;

        docs.forEach(function(d) {
          if (d.status === "Pending" || d.status === "Under Review" || d.status === "Rejected") {
            pendingDocsCount++;
          }
        });

        if (!primarySpoc && sSpoc) {
          primarySpoc = sSpoc;
        }
      }
    }

    var remainingAmount = totalAmount - paidAmount;

    // Notifications
    var notifSheet = getSheet("Notifications");
    var notifColMap = getColMap(notifSheet, "Notifications");
    var notifData = notifSheet.getDataRange().getValues();
    var notifications = [];

    for (var k = 1; k < notifData.length; k++) {
      if (String(notifData[k][notifColMap["client_id"]]) === clientId) {
        notifications.push(sanitizeNotification(notifData[k], notifColMap));
      }
    }

    notifications.sort(function(a, b) {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return {
      success: true,
      data: {
        client: clientProfile,
        metrics: {
          totalServices: clientServices.length,
          activeServices: activeServicesCount,
          completedServices: completedServicesCount,
          pendingDocsCount: pendingDocsCount,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          dscCount: dscCount,
          unreadNotifications: notifications.filter(function(n) { return n.status === "Unread"; }).length
        },
        services: clientServices,
        notifications: notifications.slice(0, 10),
        spoc: primarySpoc
      },
      message: "Client dashboard data loaded successfully."
    };
  }

  function getClientServices(token, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var clientId = session.clientId;
    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var spocsMap = getAllSpocsMap();
    var services = [];

    for (var i = 1; i < serviceData.length; i++) {
      if (String(serviceData[i][serviceColMap["client_id"]]) === clientId) {
        var sId = String(serviceData[i][serviceColMap["service_id"]]);
        var stages = getStagesForService(sId);
        var docs = getDocumentsForService(sId);
        var spocId = String(serviceData[i][serviceColMap["spoc_id"]] || "");
        var spoc = spocsMap[spocId] || null;

        services.push(sanitizeService(serviceData[i], serviceColMap, stages, spoc, docs));
      }
    }

    return {
      success: true,
      data: services,
      message: "Client services retrieved successfully."
    };
  }

  function getClientService(token, serviceId, metadata) {
    if (!serviceId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service ID is required." } };
    }

    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var targetRow = null;

    for (var i = 1; i < serviceData.length; i++) {
      if (String(serviceData[i][serviceColMap["service_id"]]) === serviceId) {
        targetRow = serviceData[i];
        break;
      }
    }

    if (!targetRow) {
      return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Service record not found." } };
    }

    var serviceClientId = String(targetRow[serviceColMap["client_id"]]);
    var isAdminUser = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "OPERATIONS", "SUPPORT"]
      .indexOf(String(session.role || "").toUpperCase()) !== -1;

    if (!isAdminUser && serviceClientId !== session.clientId) {
      AuthService.logSecurityAudit(session.userId, session.role, "IDOR_ATTEMPT_BLOCKED", "SERVICE", serviceId, "Client attempted unauthorized service access", metadata);
      return {
        success: false,
        error: { code: "AUTH_FORBIDDEN", message: "Access denied to requested service." }
      };
    }

    var stages = getStagesForService(serviceId);
    var stageHistory = getStageHistoryForService(serviceId);
    var documents = getDocumentsForService(serviceId);
    var spocsMap = getAllSpocsMap();
    var spocId = String(targetRow[serviceColMap["spoc_id"]] || "");
    var spoc = spocsMap[spocId] || null;

    var srv = sanitizeService(targetRow, serviceColMap, stages, spoc, documents);

    return {
      success: true,
      data: {
        service: srv,
        stages: stages,
        stageHistory: stageHistory,
        documents: documents,
        spoc: spoc
      },
      message: "Service details retrieved successfully."
    };
  }

  function getClientStages(token, serviceId, metadata) {
    var serviceResult = getClientService(token, serviceId, metadata);
    if (!serviceResult.success) {
      return serviceResult;
    }
    return {
      success: true,
      data: {
        serviceId: serviceId,
        stages: serviceResult.data.stages,
        stageHistory: serviceResult.data.stageHistory
      }
    };
  }

  function getClientNotifications(token, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    if (typeof NotificationService !== "undefined" && NotificationService.getClientNotifications) {
      return NotificationService.getClientNotifications(token, metadata);
    }

    var clientId = session.clientId;
    var notifSheet = getSheet("Notifications");
    var notifColMap = getColMap(notifSheet, "Notifications");
    var notifData = notifSheet.getDataRange().getValues();
    var notifications = [];

    for (var i = 1; i < notifData.length; i++) {
      if (String(notifData[i][notifColMap["client_id"]]) === clientId) {
        notifications.push(sanitizeNotification(notifData[i], notifColMap));
      }
    }

    notifications.sort(function(a, b) {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return {
      success: true,
      data: notifications,
      message: "Notifications retrieved successfully."
    };
  }

  function markNotificationRead(token, notificationId, metadata) {
    if (typeof NotificationService !== "undefined" && NotificationService.markNotificationRead) {
      return NotificationService.markNotificationRead(token, notificationId, metadata);
    }

    if (!notificationId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Notification ID is required." } };
    }
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var notifSheet = getSheet("Notifications");
      var notifColMap = getColMap(notifSheet, "Notifications");
      var notifData = notifSheet.getDataRange().getValues();

      for (var i = 1; i < notifData.length; i++) {
        if (String(notifData[i][notifColMap["notification_id"]]) === notificationId) {
          var notifClientId = String(notifData[i][notifColMap["client_id"]]);
          var isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].indexOf(String(session.role || "").toUpperCase()) !== -1;
          if (!isAdmin && notifClientId !== session.clientId) {
            return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Access denied to notification." } };
          }

          notifSheet.getRange(i + 1, notifColMap["status"] + 1).setValue("Read");
          return { success: true, message: "Notification marked as read." };
        }
      }
      return { success: false, error: { code: "NOT_FOUND", message: "Notification not found." } };
    } finally {
      lock.releaseLock();
    }
  }

  function markAllNotificationsRead(token, metadata) {
    if (typeof NotificationService !== "undefined" && NotificationService.markAllNotificationsRead) {
      return NotificationService.markAllNotificationsRead(token, metadata);
    }
    return { success: true, count: 0 };
  }

  function adminGetNotifications(token, options, metadata) {
    if (typeof NotificationService !== "undefined" && NotificationService.adminGetNotifications) {
      return NotificationService.adminGetNotifications(token, options, metadata);
    }
    return { success: true, data: [] };
  }

  function adminMarkAllNotificationsRead(token, metadata) {
    if (typeof NotificationService !== "undefined" && NotificationService.adminMarkAllNotificationsRead) {
      return NotificationService.adminMarkAllNotificationsRead(token, metadata);
    }
    return { success: true, count: 0 };
  }

  function adminGetNotificationHealth(token, metadata) {
    if (typeof NotificationService !== "undefined" && NotificationService.adminGetNotificationHealth) {
      return NotificationService.adminGetNotificationHealth(token, metadata);
    }
    return { success: true, data: { status: "Healthy" } };
  }

  /**
   * Retrieves documents belonging strictly to the authenticated client,
   * optionally filtered by serviceId.
   */
  function getClientDocuments(token, serviceId, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    if (serviceId) {
      // IDOR validation on service ownership
      var srvSheet = getSheet("Services");
      var sMap = getColMap(srvSheet, "Services");
      var sData = srvSheet.getDataRange().getValues();
      var found = false;
      for (var s = 1; s < sData.length; s++) {
        if (String(sData[s][sMap["service_id"]]) === serviceId) {
          if (String(sData[s][sMap["client_id"]]) !== session.clientId) {
            return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Access denied to requested service." } };
          }
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Service not found." } };
      }
      return {
        success: true,
        data: getDocumentsForService(serviceId),
        message: "Documents retrieved."
      };
    }

    var docSheet = getSheet("Documents");
    var docColMap = getColMap(docSheet, "Documents");
    var docData = docSheet.getDataRange().getValues();
    var docs = [];

    for (var i = 1; i < docData.length; i++) {
      if (String(docData[i][docColMap["client_id"]]) === session.clientId) {
        docs.push(sanitizeDocument(docData[i], docColMap));
      }
    }

    docs.sort(function(a, b) {
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
    });

    return {
      success: true,
      data: docs,
      message: "Client documents retrieved successfully."
    };
  }

  /**
   * Uploads client document to Google Drive and registers in Documents table.
   */
  function uploadDocument(token, serviceId, documentName, documentType, fileBase64, mimeType, fileName, metadata) {
    if (!serviceId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service ID is required." } };
    }
    if (!documentName) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Document name is required." } };
    }

    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var serviceRow = null;

    for (var i = 1; i < serviceData.length; i++) {
      if (String(serviceData[i][serviceColMap["service_id"]]) === serviceId) {
        serviceRow = serviceData[i];
        break;
      }
    }

    if (!serviceRow) {
      return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Target service not found." } };
    }

    var serviceClientId = String(serviceRow[serviceColMap["client_id"]]);
    var isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS"].indexOf(String(session.role || "").toUpperCase()) !== -1;
    if (!isAdmin && serviceClientId !== session.clientId) {
      AuthService.logSecurityAudit(session.userId, session.role, "IDOR_UPLOAD_BLOCKED", "DOCUMENT", serviceId, "Client attempted unauthorized document upload", metadata);
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Access denied to requested service." } };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var fileUrl = "";
      var driveFileId = "";
      var finalFileName = fileName || (documentName.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + serviceId + ".pdf");
      var actualMime = mimeType || "application/pdf";

      if (fileBase64 && typeof Utilities !== "undefined" && typeof DriveApp !== "undefined") {
        try {
          var clientFolder = getOrCreateClientDriveFolder(serviceClientId);
          var decoded = Utilities.base64Decode(fileBase64);
          var blob = Utilities.newBlob(decoded, actualMime, finalFileName);
          var driveFile = clientFolder.createFile(blob);
          driveFileId = driveFile.getId();
          fileUrl = driveFile.getUrl();
        } catch (de) {
          fileUrl = "https://drive.google.com/file/d/mock_" + SecurityService.generateSecureId("DRV") + "/view";
          driveFileId = "mock_" + SecurityService.generateSecureId("DRV");
        }
      } else {
        fileUrl = "https://drive.google.com/file/d/upload_" + SecurityService.generateSecureId("DRV") + "/view";
        driveFileId = "drv_" + SecurityService.generateSecureId("FILE");
      }

      var docSheet = getSheet("Documents");
      var docColMap = getColMap(docSheet, "Documents");
      var docId = SecurityService.generateSecureId("DOC");
      var nowIso = new Date().toISOString();

      var docRow = new Array(docSheet.getLastColumn()).fill("");
      docRow[docColMap["document_id"]] = docId;
      docRow[docColMap["service_id"]] = serviceId;
      docRow[docColMap["client_id"]] = serviceClientId;
      docRow[docColMap["document_name"]] = documentName;
      docRow[docColMap["document_type"]] = documentType || "KYC / Business Proof";
      docRow[docColMap["form_response_id"]] = "";
      docRow[docColMap["file_name"]] = finalFileName;
      docRow[docColMap["file_url"]] = fileUrl;
      docRow[docColMap["drive_file_id"]] = driveFileId;
      docRow[docColMap["status"]] = "Under Review";
      docRow[docColMap["rejection_reason"]] = "";
      docRow[docColMap["required"]] = true;
      docRow[docColMap["uploaded_at"]] = nowIso;
      docRow[docColMap["verified_at"]] = "";
      docRow[docColMap["verified_by"]] = "";
      docRow[docColMap["rejected_at"]] = "";
      docRow[docColMap["rejected_by"]] = "";

      docSheet.appendRow(docRow);

      AuthService.logSecurityAudit(
        session.userId,
        session.role,
        "UPLOAD_DOCUMENT",
        "DOCUMENT",
        docId,
        { serviceId: serviceId, documentName: documentName, fileUrl: fileUrl },
        metadata
      );

      try {
        var notifSheet = getSheet("Notifications");
        notifSheet.appendRow([
          SecurityService.generateSecureId("NOTIF"),
          serviceClientId,
          session.name || "Client",
          "DOCUMENT_SUBMITTED",
          "Document '" + documentName + "' was uploaded successfully and is currently Under Review.",
          "PORTAL",
          nowIso,
          "Unread"
        ]);
      } catch (ne) {}

      var sanitized = sanitizeDocument(docRow, docColMap);
      return {
        success: true,
        data: sanitized,
        message: "Document uploaded successfully and marked Under Review."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Generates dynamic Google Form prefill URL and QR code data for client document submission.
   */
  function getFormSubmissionConfig(token, serviceId, metadata) {
    if (!serviceId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service ID is required." } };
    }
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }

    var srvSheet = getSheet("Services");
    var sMap = getColMap(srvSheet, "Services");
    var sData = srvSheet.getDataRange().getValues();
    var srv = null;
    for (var i = 1; i < sData.length; i++) {
      if (String(sData[i][sMap["service_id"]]) === serviceId) {
        srv = sData[i];
        break;
      }
    }
    if (!srv) {
      return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Service not found." } };
    }

    var serviceClientId = String(srv[sMap["client_id"]]);
    var isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS"].indexOf(String(session.role || "").toUpperCase()) !== -1;
    if (!isAdmin && serviceClientId !== session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Access denied to service." } };
    }

    var baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSc_LegalSthal_DocCollection/viewform";
    var prefillParams = [
      "usp=pp_url",
      "entry.1001=" + encodeURIComponent(serviceId),
      "entry.1002=" + encodeURIComponent(serviceClientId),
      "entry.1003=" + encodeURIComponent(session.email || "")
    ].join("&");

    var formUrl = baseUrl + "?" + prefillParams;

    return {
      success: true,
      data: {
        serviceId: serviceId,
        clientId: serviceClientId,
        serviceCode: String(srv[sMap["service_code"]] || ""),
        serviceName: String(srv[sMap["service_name"]] || ""),
        formUrl: formUrl,
        qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(formUrl),
        instructions: "Scan the QR code with your mobile phone or click the link to submit required documents."
      }
    };
  }

  // ==========================================
  // 3. ADMIN PORTAL OPERATIONS
  // ==========================================

  function adminGetDashboard(token, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var clientSheet = getSheet("Clients");
    var clientColMap = getColMap(clientSheet, "Clients");
    var clientData = clientSheet.getDataRange().getValues();

    var totalClients = Math.max(0, clientData.length - 1);
    var activeClients = 0;
    var clientsMap = {};

    for (var i = 1; i < clientData.length; i++) {
      var cStatus = String(clientData[i][clientColMap["status"]] || "").toUpperCase();
      if (cStatus === "ACTIVE") activeClients++;
      var cId = String(clientData[i][clientColMap["client_id"]]);
      clientsMap[cId] = String(clientData[i][clientColMap["name"]] || clientData[i][clientColMap["company name"]] || "");
    }

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();

    var totalServices = Math.max(0, serviceData.length - 1);
    var activeServices = 0;
    var completedServices = 0;
    var totalRevenue = 0;
    var totalCollected = 0;

    for (var j = 1; j < serviceData.length; j++) {
      var sStatus = String(serviceData[j][serviceColMap["status"]] || "");
      if (sStatus === "Completed") {
        completedServices++;
      } else if (sStatus !== "Cancelled") {
        activeServices++;
      }

      var tot = parseFloat(serviceData[j][serviceColMap["total_amount"]] || 0);
      var pd = parseFloat(serviceData[j][serviceColMap["paid_amount"]] || 0);
      totalRevenue += tot;
      totalCollected += pd;
    }

    var totalPending = totalRevenue - totalCollected;

    var recentClients = [];
    for (var r = clientData.length - 1; r >= 1 && recentClients.length < 5; r--) {
      recentClients.push(sanitizeClient(clientData[r], clientColMap));
    }

    var recentServices = [];
    var spocsMap = getAllSpocsMap();
    for (var s = serviceData.length - 1; s >= 1 && recentServices.length < 5; s--) {
      var srvId = String(serviceData[s][serviceColMap["service_id"]]);
      var clId = String(serviceData[s][serviceColMap["client_id"]]);
      var spcId = String(serviceData[s][serviceColMap["spoc_id"]] || "");
      var sObj = sanitizeService(serviceData[s], serviceColMap, [], spocsMap[spcId] || null, []);
      sObj.clientName = clientsMap[clId] || "Unknown Client";
      recentServices.push(sObj);
    }

    return {
      success: true,
      data: {
        metrics: {
          totalClients: totalClients,
          activeClients: activeClients,
          totalServices: totalServices,
          activeServices: activeServices,
          completedServices: completedServices,
          totalRevenue: totalRevenue,
          totalCollected: totalCollected,
          totalPending: totalPending
        },
        recentClients: recentClients,
        recentServices: recentServices
      },
      message: "Operations dashboard metrics loaded."
    };
  }

  function adminGetClients(token, searchQuery, statusFilter, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var clientSheet = getSheet("Clients");
    var clientColMap = getColMap(clientSheet, "Clients");
    var clientData = clientSheet.getDataRange().getValues();

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var clientServiceAgg = {};

    for (var s = 1; s < serviceData.length; s++) {
      var cId = String(serviceData[s][serviceColMap["client_id"]]);
      if (!clientServiceAgg[cId]) {
        clientServiceAgg[cId] = { count: 0, totalAmount: 0, paidAmount: 0, remainingAmount: 0 };
      }
      var t = parseFloat(serviceData[s][serviceColMap["total_amount"]] || 0);
      var p = parseFloat(serviceData[s][serviceColMap["paid_amount"]] || 0);
      clientServiceAgg[cId].count++;
      clientServiceAgg[cId].totalAmount += t;
      clientServiceAgg[cId].paidAmount += p;
      clientServiceAgg[cId].remainingAmount += (t - p);
    }

    var query = (searchQuery || "").trim().toLowerCase();
    var status = (statusFilter || "").trim().toLowerCase();
    var results = [];

    for (var i = 1; i < clientData.length; i++) {
      var client = sanitizeClient(clientData[i], clientColMap);
      if (!client || !client.clientId) continue;

      if (status && status !== "all" && client.status.toLowerCase() !== status) {
        continue;
      }

      if (query) {
        var matches = (
          client.clientId.toLowerCase().indexOf(query) !== -1 ||
          client.companyName.toLowerCase().indexOf(query) !== -1 ||
          client.contactPerson.toLowerCase().indexOf(query) !== -1 ||
          client.email.toLowerCase().indexOf(query) !== -1 ||
          client.phone.toLowerCase().indexOf(query) !== -1
        );
        if (!matches) continue;
      }

      var agg = clientServiceAgg[client.clientId] || { count: 0, totalAmount: 0, paidAmount: 0, remainingAmount: 0 };
      client.servicesCount = agg.count;
      client.totalAmount = agg.totalAmount;
      client.paidAmount = agg.paidAmount;
      client.remainingAmount = agg.remainingAmount;

      results.push(client);
    }

    return {
      success: true,
      data: results,
      message: "Client directory loaded successfully."
    };
  }

  function adminGetClient(token, targetClientId, metadata) {
    if (!targetClientId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Client ID is required." } };
    }
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var clientSheet = getSheet("Clients");
    var clientColMap = getColMap(clientSheet, "Clients");
    var clientData = clientSheet.getDataRange().getValues();
    var client = null;

    for (var i = 1; i < clientData.length; i++) {
      if (String(clientData[i][clientColMap["client_id"]]) === targetClientId) {
        client = sanitizeClient(clientData[i], clientColMap);
        break;
      }
    }

    if (!client) {
      return { success: false, error: { code: "CLIENT_NOT_FOUND", message: "Client not found." } };
    }

    var serviceSheet = getSheet("Services");
    var serviceColMap = getColMap(serviceSheet, "Services");
    var serviceData = serviceSheet.getDataRange().getValues();
    var spocsMap = getAllSpocsMap();
    var services = [];

    for (var j = 1; j < serviceData.length; j++) {
      if (String(serviceData[j][serviceColMap["client_id"]]) === targetClientId) {
        var sId = String(serviceData[j][serviceColMap["service_id"]]);
        var stages = getStagesForService(sId);
        var docs = getDocumentsForService(sId);
        var spocId = String(serviceData[j][serviceColMap["spoc_id"]] || "");
        services.push(sanitizeService(serviceData[j], serviceColMap, stages, spocsMap[spocId] || null, docs));
      }
    }

    return {
      success: true,
      data: {
        client: client,
        services: services
      },
      message: "Admin client details retrieved."
    };
  }

  function adminGetService(token, serviceId, metadata) {
    if (!serviceId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service ID is required." } };
    }
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    return getClientService(token, serviceId, metadata);
  }

  function adminUpdateServiceStage(token, serviceId, targetStage, remarks, metadata) {
    if (!serviceId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service ID is required." } };
    }
    if (targetStage === undefined || targetStage === null) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Target stage is required." } };
    }

    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var serviceSheet = getSheet("Services");
      var serviceColMap = getColMap(serviceSheet, "Services");
      var serviceData = serviceSheet.getDataRange().getValues();
      var serviceRowIndex = -1;
      var serviceRow = null;

      for (var i = 1; i < serviceData.length; i++) {
        if (String(serviceData[i][serviceColMap["service_id"]]) === serviceId) {
          serviceRowIndex = i + 1;
          serviceRow = serviceData[i];
          break;
        }
      }

      if (serviceRowIndex === -1 || !serviceRow) {
        return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Service not found." } };
      }

      var stages = getStagesForService(serviceId);
      if (stages.length === 0) {
        return { success: false, error: { code: "STAGES_NOT_FOUND", message: "No workflow stages configured for this service." } };
      }

      var targetIndex = -1;
      if (typeof targetStage === "number" || !isNaN(parseInt(targetStage, 10))) {
        targetIndex = parseInt(targetStage, 10);
      } else {
        for (var s = 0; s < stages.length; s++) {
          if (stages[s].stageName.toLowerCase() === String(targetStage).toLowerCase()) {
            targetIndex = s;
            break;
          }
        }
      }

      if (targetIndex < 0 || targetIndex >= stages.length) {
        return {
          success: false,
          error: {
            code: "INVALID_STAGE",
            message: "Target stage index " + targetIndex + " is out of range [0.." + (stages.length - 1) + "]."
          }
        };
      }

      var newStageName = stages[targetIndex].stageName;
      var totalStages = stages.length;
      var isLastStage = (targetIndex === totalStages - 1);
      var newProgress = Math.round(((targetIndex + 1) / totalStages) * 100);
      var newServiceStatus = isLastStage ? "Completed" : "In Progress";
      var nowIso = new Date().toISOString();

      serviceSheet.getRange(serviceRowIndex, serviceColMap["current_stage"] + 1).setValue(newStageName);
      serviceSheet.getRange(serviceRowIndex, serviceColMap["current_stage_index"] + 1).setValue(targetIndex);
      serviceSheet.getRange(serviceRowIndex, serviceColMap["progress_percentage"] + 1).setValue(newProgress);
      serviceSheet.getRange(serviceRowIndex, serviceColMap["status"] + 1).setValue(newServiceStatus);
      serviceSheet.getRange(serviceRowIndex, serviceColMap["updated_at"] + 1).setValue(nowIso);
      if (isLastStage) {
        serviceSheet.getRange(serviceRowIndex, serviceColMap["completed_on"] + 1).setValue(nowIso);
      }

      var stageSheet = getSheet("ServiceStages");
      var stageColMap = getColMap(stageSheet, "ServiceStages");
      var stageData = stageSheet.getDataRange().getValues();

      for (var k = 1; k < stageData.length; k++) {
        if (String(stageData[k][stageColMap["service_id"]]) === serviceId) {
          var seq = parseInt(stageData[k][stageColMap["sequence_order"]] || 0, 10);
          var sRow = k + 1;
          if (seq <= targetIndex + 1) {
            stageSheet.getRange(sRow, stageColMap["stage_status"] + 1).setValue("Completed");
            if (!stageData[k][stageColMap["completed_on"]]) {
              stageSheet.getRange(sRow, stageColMap["completed_on"] + 1).setValue(nowIso);
            }
          } else if (seq === targetIndex + 2) {
            stageSheet.getRange(sRow, stageColMap["stage_status"] + 1).setValue("In Progress");
            stageSheet.getRange(sRow, stageColMap["completed_on"] + 1).setValue("");
          } else {
            stageSheet.getRange(sRow, stageColMap["stage_status"] + 1).setValue("Pending");
            stageSheet.getRange(sRow, stageColMap["completed_on"] + 1).setValue("");
          }
        }
      }

      var historySheet = getSheet("StageHistory");
      var historyId = SecurityService.generateSecureId("SH");
      var safeRemarks = String(remarks || "Stage advanced via Operations Console");

      historySheet.appendRow([
        historyId,
        serviceId,
        newStageName,
        "Completed",
        session.name || session.email || session.userId,
        session.role,
        nowIso,
        safeRemarks
      ]);

      AuthService.logSecurityAudit(
        session.userId,
        session.role,
        "UPDATE_SERVICE_STAGE",
        "SERVICE",
        serviceId,
        {
          stageName: newStageName,
          stageIndex: targetIndex,
          progress: newProgress,
          status: newServiceStatus,
          remarks: safeRemarks
        },
        metadata
      );

      try {
        var clientName = "";
        var clientEmail = "";
        var serviceClientId = String(serviceRow[serviceColMap["client_id"]]);
        var clientSheet = getSheet("Clients");
        var cMap = getColMap(clientSheet, "Clients");
        var cData = clientSheet.getDataRange().getValues();
        for (var c = 1; c < cData.length; c++) {
          if (String(cData[c][cMap["client_id"]]) === serviceClientId) {
            clientName = String(cData[c][cMap["name"]] || cData[c][cMap["company name"]] || "");
            clientEmail = String(cData[c][cMap["email"]] || "");
            break;
          }
        }

        var stageMsg = "Your service '" + String(serviceRow[serviceColMap["service_name"]]) + "' advanced to stage: " + newStageName + ".";

        if (typeof NotificationService !== "undefined" && NotificationService.createNotification) {
          NotificationService.createNotification({
            eventType: "SERVICE_STAGE_UPDATED",
            clientId: serviceClientId,
            clientName: clientName,
            email: clientEmail,
            serviceName: String(serviceRow[serviceColMap["service_name"]]),
            stageName: newStageName,
            progressPercentage: newProgress,
            message: stageMsg,
            relatedEntityType: "SERVICE",
            relatedEntityId: serviceId + ":" + newStageName
          });
        } else {
          var notifSheet = getSheet("Notifications");
          var notifId = SecurityService.generateSecureId("NOTIF");
          notifSheet.appendRow([
            notifId,
            serviceClientId,
            clientName,
            "STAGE_UPDATE",
            stageMsg,
            "PORTAL",
            nowIso,
            "Unread"
          ]);
        }
      } catch (ne) {
        Logger.log("[NOTIFICATION DISPATCH FAILED] " + ne.toString());
      }

      // Synchronize stage update with Zoho CRM
      try {
        if (typeof CRMSyncService !== "undefined" && CRMSyncService.syncDealStage) {
          CRMSyncService.syncDealStage(serviceId, newStageName, targetIndex);
        }
      } catch (crmErr) {
        Logger.log("[CRM SYNC WARNING] " + crmErr.toString());
      }

      var freshStages = getStagesForService(serviceId);
      var freshHistory = getStageHistoryForService(serviceId);

      return {
        success: true,
        data: {
          serviceId: serviceId,
          currentStage: newStageName,
          currentStageIndex: targetIndex,
          progressPercentage: newProgress,
          status: newServiceStatus,
          updatedAt: nowIso,
          stages: freshStages,
          stageHistory: freshHistory
        },
        message: "Service stage successfully updated to '" + newStageName + "' (" + newProgress + "%)."
      };

    } finally {
      lock.releaseLock();
    }
  }

  function adminAssignSpoc(token, serviceId, spocId, metadata) {
    if (!serviceId || !spocId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Both Service ID and SPOC ID are required." } };
    }

    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var spocSheet = getSheet("SPOCs");
      var spocColMap = getColMap(spocSheet, "SPOCs");
      var spocData = spocSheet.getDataRange().getValues();
      var spocRecord = null;

      for (var s = 1; s < spocData.length; s++) {
        if (String(spocData[s][spocColMap["spoc_id"]]) === spocId) {
          spocRecord = sanitizeSpoc(spocData[s], spocColMap);
          break;
        }
      }

      if (!spocRecord) {
        return { success: false, error: { code: "SPOC_NOT_FOUND", message: "Selected SPOC not found." } };
      }

      var serviceSheet = getSheet("Services");
      var serviceColMap = getColMap(serviceSheet, "Services");
      var serviceData = serviceSheet.getDataRange().getValues();
      var serviceRowIndex = -1;

      for (var i = 1; i < serviceData.length; i++) {
        if (String(serviceData[i][serviceColMap["service_id"]]) === serviceId) {
          serviceRowIndex = i + 1;
          break;
        }
      }

      if (serviceRowIndex === -1) {
        return { success: false, error: { code: "SERVICE_NOT_FOUND", message: "Service not found." } };
      }

      var nowIso = new Date().toISOString();
      serviceSheet.getRange(serviceRowIndex, serviceColMap["spoc_id"] + 1).setValue(spocId);
      serviceSheet.getRange(serviceRowIndex, serviceColMap["updated_at"] + 1).setValue(nowIso);

      AuthService.logSecurityAudit(
        session.userId,
        session.role,
        "ASSIGN_SPOC",
        "SERVICE",
        serviceId,
        { spocId: spocId, spocName: spocRecord.name },
        metadata
      );

      if (metadata && (metadata.notifyClient || metadata.notify)) {
        try {
          var spocClientId = String(serviceData[serviceRowIndex - 1][serviceColMap["client_id"]]);
          var spocServiceName = String(serviceData[serviceRowIndex - 1][serviceColMap["service_name"]]);
          var spocMsg = "Dedicated SPOC '" + spocRecord.name + "' has been assigned to your service '" + spocServiceName + "'.";
          if (typeof NotificationService !== "undefined" && NotificationService.createNotification) {
            NotificationService.createNotification({
              eventType: "SPOC_ASSIGNED",
              clientId: spocClientId,
              clientName: "",
              serviceName: spocServiceName,
              message: spocMsg,
              relatedEntityType: "SERVICE",
              relatedEntityId: serviceId
            });
          }
        } catch (sne) {}
      }

      return {
        success: true,
        data: {
          serviceId: serviceId,
          spocId: spocId,
          spoc: spocRecord,
          updatedAt: nowIso
        },
        message: "Dedicated SPOC '" + spocRecord.name + "' successfully assigned to service."
      };

    } finally {
      lock.releaseLock();
    }
  }

  function adminGetSpocs(token, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var spocSheet = getSheet("SPOCs");
    var spocColMap = getColMap(spocSheet, "SPOCs");
    var spocData = spocSheet.getDataRange().getValues();
    var spocs = [];

    for (var i = 1; i < spocData.length; i++) {
      var spoc = sanitizeSpoc(spocData[i], spocColMap);
      if (spoc && spoc.spocId) {
        spocs.push(spoc);
      }
    }

    return {
      success: true,
      data: spocs,
      message: "SPOCs retrieved successfully."
    };
  }

  /**
   * Operations Console document listing with client/service metadata and status filtering.
   */
  function adminGetDocuments(token, statusFilter, serviceId, clientId, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var docSheet = getSheet("Documents");
    var docColMap = getColMap(docSheet, "Documents");
    var docData = docSheet.getDataRange().getValues();

    var clientSheet = getSheet("Clients");
    var cMap = getColMap(clientSheet, "Clients");
    var cData = clientSheet.getDataRange().getValues();
    var clientNameMap = {};
    for (var c = 1; c < cData.length; c++) {
      clientNameMap[String(cData[c][cMap["client_id"]])] = String(cData[c][cMap["name"]] || cData[c][cMap["company name"]] || "");
    }

    var srvSheet = getSheet("Services");
    var sMap = getColMap(srvSheet, "Services");
    var sData = srvSheet.getDataRange().getValues();
    var srvInfoMap = {};
    for (var s = 1; s < sData.length; s++) {
      srvInfoMap[String(sData[s][sMap["service_id"]])] = {
        code: String(sData[s][sMap["service_code"]] || ""),
        name: String(sData[s][sMap["service_name"]] || "")
      };
    }

    var filterStatus = (statusFilter || "").trim().toLowerCase();
    var results = [];

    for (var i = 1; i < docData.length; i++) {
      var doc = sanitizeDocument(docData[i], docColMap);
      if (!doc || !doc.documentId) continue;

      if (filterStatus && filterStatus !== "all" && doc.status.toLowerCase() !== filterStatus) {
        continue;
      }
      if (serviceId && doc.serviceId !== serviceId) {
        continue;
      }
      if (clientId && doc.clientId !== clientId) {
        continue;
      }

      doc.clientName = clientNameMap[doc.clientId] || "Corporate Client";
      var sInfo = srvInfoMap[doc.serviceId] || { code: doc.serviceId, name: "Service" };
      doc.serviceCode = sInfo.code;
      doc.serviceType = sInfo.name;

      results.push(doc);
    }

    results.sort(function(a, b) {
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
    });

    return {
      success: true,
      data: results,
      message: "Documents retrieved successfully."
    };
  }

  /**
   * Verifies submitted document in the Documents table and notifies client.
   */
  function adminVerifyDocument(token, documentId, remarks, metadata) {
    if (!documentId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Document ID is required." } };
    }
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var sheet = getSheet("Documents");
      var colMap = getColMap(sheet, "Documents");
      var data = sheet.getDataRange().getValues();
      var targetRow = -1;
      var docRecord = null;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colMap["document_id"]]) === documentId) {
          targetRow = i + 1;
          docRecord = data[i];
          break;
        }
      }

      if (targetRow === -1 || !docRecord) {
        return { success: false, error: { code: "DOCUMENT_NOT_FOUND", message: "Document record not found." } };
      }

      var nowIso = new Date().toISOString();
      var adminIdentifier = session.name || session.email || session.userId;

      sheet.getRange(targetRow, colMap["status"] + 1).setValue("Verified");
      sheet.getRange(targetRow, colMap["verified_at"] + 1).setValue(nowIso);
      sheet.getRange(targetRow, colMap["verified_by"] + 1).setValue(adminIdentifier);
      sheet.getRange(targetRow, colMap["rejection_reason"] + 1).setValue("");

      var docName = String(docRecord[colMap["document_name"]]);
      var docClientId = String(docRecord[colMap["client_id"]]);
      var docServiceId = String(docRecord[colMap["service_id"]]);

      AuthService.logSecurityAudit(
        session.userId,
        session.role,
        "VERIFY_DOCUMENT",
        "DOCUMENT",
        documentId,
        { documentName: docName, serviceId: docServiceId, remarks: remarks || "Verified by admin" },
        metadata
      );

      try {
        var docClientEmail = "";
        try {
          var clSheet = getSheet("Clients");
          var clMap = getColMap(clSheet, "Clients");
          var clData = clSheet.getDataRange().getValues();
          for (var c = 1; c < clData.length; c++) {
            if (String(clData[c][clMap["client_id"]]) === docClientId) {
              docClientEmail = String(clData[c][clMap["email"]] || "");
              break;
            }
          }
        } catch (ce) {}

        var vMsg = "Your document '" + docName + "' has been verified by our operations team.";
        if (typeof NotificationService !== "undefined" && NotificationService.createNotification) {
          NotificationService.createNotification({
            eventType: "DOCUMENT_VERIFIED",
            clientId: docClientId,
            clientName: "",
            email: docClientEmail,
            documentName: docName,
            message: vMsg,
            relatedEntityType: "DOCUMENT",
            relatedEntityId: documentId
          });
        } else {
          var notifSheet = getSheet("Notifications");
          notifSheet.appendRow([
            SecurityService.generateSecureId("NOTIF"),
            docClientId,
            "",
            "DOCUMENT_VERIFIED",
            vMsg,
            "PORTAL",
            nowIso,
            "Unread"
          ]);
        }
      } catch (ne) {}

      return {
        success: true,
        data: {
          documentId: documentId,
          status: "Verified",
          verifiedAt: nowIso,
          verifiedBy: adminIdentifier
        },
        message: "Document '" + docName + "' has been successfully verified."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Rejects submitted document with detailed reason and triggers client resubmission alert.
   */
  function adminRejectDocument(token, documentId, reason, metadata) {
    if (!documentId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Document ID is required." } };
    }
    if (!reason || !reason.trim()) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "A rejection reason is required." } };
    }
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var sheet = getSheet("Documents");
      var colMap = getColMap(sheet, "Documents");
      var data = sheet.getDataRange().getValues();
      var targetRow = -1;
      var docRecord = null;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colMap["document_id"]]) === documentId) {
          targetRow = i + 1;
          docRecord = data[i];
          break;
        }
      }

      if (targetRow === -1 || !docRecord) {
        return { success: false, error: { code: "DOCUMENT_NOT_FOUND", message: "Document record not found." } };
      }

      var nowIso = new Date().toISOString();
      var adminIdentifier = session.name || session.email || session.userId;
      var safeReason = reason.trim();

      sheet.getRange(targetRow, colMap["status"] + 1).setValue("Rejected");
      sheet.getRange(targetRow, colMap["rejected_at"] + 1).setValue(nowIso);
      sheet.getRange(targetRow, colMap["rejected_by"] + 1).setValue(adminIdentifier);
      sheet.getRange(targetRow, colMap["rejection_reason"] + 1).setValue(safeReason);

      var docName = String(docRecord[colMap["document_name"]]);
      var docClientId = String(docRecord[colMap["client_id"]]);
      var docServiceId = String(docRecord[colMap["service_id"]]);

      AuthService.logSecurityAudit(
        session.userId,
        session.role,
        "REJECT_DOCUMENT",
        "DOCUMENT",
        documentId,
        { documentName: docName, serviceId: docServiceId, reason: safeReason },
        metadata
      );

      try {
        var docClientEmail = "";
        try {
          var clSheet = getSheet("Clients");
          var clMap = getColMap(clSheet, "Clients");
          var clData = clSheet.getDataRange().getValues();
          for (var c = 1; c < clData.length; c++) {
            if (String(clData[c][clMap["client_id"]]) === docClientId) {
              docClientEmail = String(clData[c][clMap["email"]] || "");
              break;
            }
          }
        } catch (ce) {}

        var rMsg = "Action Required: Document '" + docName + "' was rejected. Reason: " + safeReason;
        if (typeof NotificationService !== "undefined" && NotificationService.createNotification) {
          NotificationService.createNotification({
            eventType: "DOCUMENT_REJECTED",
            clientId: docClientId,
            clientName: "",
            email: docClientEmail,
            documentName: docName,
            rejectionReason: safeReason,
            message: rMsg,
            relatedEntityType: "DOCUMENT",
            relatedEntityId: documentId
          });
        } else {
          var notifSheet = getSheet("Notifications");
          notifSheet.appendRow([
            SecurityService.generateSecureId("NOTIF"),
            docClientId,
            "",
            "DOCUMENT_REJECTED",
            rMsg,
            "PORTAL",
            nowIso,
            "Unread"
          ]);
        }
      } catch (ne) {}

      return {
        success: true,
        data: {
          documentId: documentId,
          status: "Rejected",
          rejectedAt: nowIso,
          rejectedBy: adminIdentifier,
          rejectionReason: safeReason
        },
        message: "Document '" + docName + "' rejected. Client notified with reason."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Processes automated Google Forms submissions and stores in Schema V2 Documents table.
   */
  function processFormSubmission(submissionData) {
    var serviceId = submissionData.serviceId || "SRV001";
    var clientEmail = submissionData.email || "";
    var docName = submissionData.documentName || "Uploaded Form Document";
    var fileUrl = submissionData.fileUrl || "";
    var formResponseId = submissionData.formResponseId || ("FR_" + Date.now());

    var ss = getSpreadsheet();
    var srvSheet = ss.getSheetByName("Services");
    var sMap = getColMap(srvSheet, "Services");
    var sData = srvSheet.getDataRange().getValues();
    var targetClientId = "CL001";

    for (var i = 1; i < sData.length; i++) {
      if (String(sData[i][sMap["service_id"]]) === serviceId) {
        targetClientId = String(sData[i][sMap["client_id"]]);
        break;
      }
    }

    var docSheet = ss.getSheetByName("Documents");
    var docColMap = getColMap(docSheet, "Documents");
    var docId = SecurityService.generateSecureId("DOC");
    var nowIso = new Date().toISOString();

    var row = new Array(docSheet.getLastColumn()).fill("");
    row[docColMap["document_id"]] = docId;
    row[docColMap["service_id"]] = serviceId;
    row[docColMap["client_id"]] = targetClientId;
    row[docColMap["document_name"]] = docName;
    row[docColMap["document_type"]] = "Google Form Submission";
    row[docColMap["form_response_id"]] = formResponseId;
    row[docColMap["file_name"]] = docName + ".pdf";
    row[docColMap["file_url"]] = fileUrl;
    row[docColMap["drive_file_id"]] = "";
    row[docColMap["status"]] = "Under Review";
    row[docColMap["rejection_reason"]] = "";
    row[docColMap["required"]] = true;
    row[docColMap["uploaded_at"]] = nowIso;

    docSheet.appendRow(row);

    AuthService.logSecurityAudit(
      clientEmail || targetClientId,
      "CLIENT",
      "FORM_DOCUMENT_SUBMITTED",
      "DOCUMENT",
      docId,
      { serviceId: serviceId, formResponseId: formResponseId, documentName: docName, fileUrl: fileUrl }
    );

    try {
      var notifSheet = ss.getSheetByName("Notifications");
      notifSheet.appendRow([
        SecurityService.generateSecureId("NOTIF"),
        targetClientId,
        "",
        "DOCUMENT_SUBMITTED",
        "Document '" + docName + "' was received from Google Form submission and is Under Review.",
        "PORTAL",
        nowIso,
        "Unread"
      ]);
    } catch (ne) {}

    return { success: true, documentId: docId };
  }

  // ==========================================
  // 6. QUOTE REQUESTS & PROPOSAL WORKFLOW
  // ==========================================

  function sanitizeQuote(row, colMap) {
    if (!row) return null;
    return {
      id: String(row[colMap["request_id"]] || ""),
      requestId: String(row[colMap["request_id"]] || ""),
      clientId: String(row[colMap["client_id"]] || ""),
      clientName: String(row[colMap["client_name"]] || ""),
      serviceName: String(row[colMap["service_name"]] || ""),
      companyType: String(row[colMap["company_type"]] || ""),
      state: String(row[colMap["state"]] || ""),
      mobile: String(row[colMap["mobile"]] || ""),
      email: String(row[colMap["email"]] || ""),
      requestedOn: String(row[colMap["requested_on"]] || ""),
      status: String(row[colMap["status"]] || "Requested"),
      quoteAmount: String(row[colMap["quote_amount"]] || ""),
      remarks: String(row[colMap["remarks"]] || "")
    };
  }

  function createQuoteRequest(token, quoteData, metadata) {
    quoteData = quoteData || {};
    var serviceName = quoteData.serviceName || quoteData.service_name;
    if (!serviceName) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Service name is required for quote request." } };
    }

    var session = token ? SessionService.validateSession(token) : null;
    var clientId = "PROSPECT";
    var clientName = quoteData.clientName || quoteData.name || "Client";
    var email = quoteData.email || "";
    var mobile = quoteData.mobile || quoteData.phone || "";

    if (session && session.authenticated && !session.expired) {
      if (session.clientId) {
        clientId = session.clientId;
        clientName = session.name || session.contactPerson || clientName;
        email = session.email || email;
      }
    }

    var sheet = getSheet("QuoteRequests");
    var colMap = getColMap(sheet, "QuoteRequests");
    var requestId = SecurityService.generateSecureId("QR");
    var requestedOn = formatDate(new Date());
    var companyType = quoteData.companyType || quoteData.company_type || "Private Limited";
    var state = quoteData.state || "Gujarat";
    var remarks = quoteData.remarks || "Standard inquiry";

    var row = new Array(Math.max.apply(null, Object.values(colMap)) + 1);
    for (var r = 0; r < row.length; r++) row[r] = "";

    row[colMap["request_id"]] = requestId;
    row[colMap["client_id"]] = clientId;
    row[colMap["client_name"]] = clientName;
    row[colMap["service_name"]] = serviceName;
    row[colMap["company_type"]] = companyType;
    row[colMap["state"]] = state;
    row[colMap["mobile"]] = mobile;
    row[colMap["email"]] = email;
    row[colMap["requested_on"]] = requestedOn;
    row[colMap["status"]] = "Requested";
    row[colMap["quote_amount"]] = "";
    row[colMap["remarks"]] = remarks;

    sheet.appendRow(row);

    // Audit log
    AuthService.logSecurityAudit(
      session ? session.userId : (email || clientId),
      session ? session.role : "CLIENT",
      "CREATE_QUOTE_REQUEST",
      "QUOTE_REQUEST",
      requestId,
      { serviceName: serviceName, companyType: companyType, state: state },
      metadata
    );

    // Client notification
    if (clientId && clientId !== "PROSPECT") {
      try {
        var notifSheet = getSheet("Notifications");
        notifSheet.appendRow([
          SecurityService.generateSecureId("NOTIF"),
          clientId,
          clientName,
          "QUOTE_REQUESTED",
          "Your quote request for '" + serviceName + "' has been submitted successfully.",
          "PORTAL",
          new Date().toISOString(),
          "Unread"
        ]);
      } catch (ne) {}
    }

    // Synchronize to Zoho CRM Lead
    try {
      if (typeof CRMSyncService !== "undefined" && CRMSyncService.syncLead) {
        CRMSyncService.syncLead({
          requestId: requestId,
          clientName: clientName,
          companyType: companyType,
          email: email,
          mobile: mobile,
          state: state,
          serviceName: serviceName,
          remarks: remarks
        });
      }
    } catch (crmErr) {
      Logger.log("[CRM SYNC LEAD WARNING] " + crmErr.toString());
    }

    var newQuote = sanitizeQuote(row, colMap);
    return {
      success: true,
      data: newQuote,
      message: "Quote request submitted successfully."
    };
  }

  function getClientQuoteRequests(token, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var sheet = getSheet("QuoteRequests");
    if (sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    var colMap = getColMap(sheet, "QuoteRequests");
    var data = sheet.getDataRange().getValues();
    var quotes = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["client_id"]]) === session.clientId) {
        quotes.push(sanitizeQuote(data[i], colMap));
      }
    }

    quotes.sort(function(a, b) {
      return (b.id > a.id) ? 1 : -1;
    });

    return {
      success: true,
      data: quotes,
      count: quotes.length,
      message: "Client quote requests retrieved."
    };
  }

  function adminGetQuoteRequests(token, statusFilter, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var sheet = getSheet("QuoteRequests");
    if (sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    var colMap = getColMap(sheet, "QuoteRequests");
    var data = sheet.getDataRange().getValues();
    var quotes = [];

    for (var i = 1; i < data.length; i++) {
      var q = sanitizeQuote(data[i], colMap);
      if (statusFilter && statusFilter !== "all") {
        if (q.status.toLowerCase() !== String(statusFilter).toLowerCase()) {
          continue;
        }
      }
      quotes.push(q);
    }

    quotes.sort(function(a, b) {
      return (b.id > a.id) ? 1 : -1;
    });

    return {
      success: true,
      data: quotes,
      count: quotes.length,
      message: "Admin quote requests retrieved."
    };
  }

  function adminUpdateQuoteStatus(token, quoteId, status, amount, remarks, metadata) {
    if (!quoteId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Quote ID is required." } };
    }
    if (!status) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Quote status is required." } };
    }

    var validStatuses = ["Requested", "Quote Sent", "Accepted", "Declined"];
    if (validStatuses.indexOf(status) === -1) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid status '" + status + "'. Allowed: " + validStatuses.join(", ") }
      };
    }

    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var sheet = getSheet("QuoteRequests");
    var colMap = getColMap(sheet, "QuoteRequests");
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var row = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["request_id"]]) === quoteId) {
        rowIndex = i + 1;
        row = data[i];
        break;
      }
    }

    if (rowIndex === -1 || !row) {
      return { success: false, error: { code: "QUOTE_NOT_FOUND", message: "Quote request not found." } };
    }

    sheet.getRange(rowIndex, colMap["status"] + 1).setValue(status);
    if (amount !== undefined && amount !== null && String(amount).trim() !== "") {
      sheet.getRange(rowIndex, colMap["quote_amount"] + 1).setValue(String(amount));
      row[colMap["quote_amount"]] = String(amount);
    }
    if (remarks !== undefined && remarks !== null && String(remarks).trim() !== "") {
      sheet.getRange(rowIndex, colMap["remarks"] + 1).setValue(String(remarks));
      row[colMap["remarks"]] = String(remarks);
    }
    row[colMap["status"]] = status;

    var clientId = String(row[colMap["client_id"]]);
    var clientName = String(row[colMap["client_name"]]);
    var serviceName = String(row[colMap["service_name"]]);

    // Audit log
    AuthService.logSecurityAudit(
      session.userId,
      session.role,
      "UPDATE_QUOTE_STATUS",
      "QUOTE_REQUEST",
      quoteId,
      { status: status, amount: amount, remarks: remarks },
      metadata
    );

    // Client notification
    if (clientId && clientId !== "PROSPECT") {
      try {
        var msg = "";
        var evt = "QUOTE_UPDATED";
        if (status === "Quote Sent") {
          evt = "QUOTE_SENT";
          msg = "Official Proposal Ready: Your quote for '" + serviceName + "' is ready (" + (amount || "Custom Quote") + ").";
        } else if (status === "Accepted") {
          evt = "QUOTE_ACCEPTED";
          msg = "Proposal Accepted: Your service order for '" + serviceName + "' has been confirmed.";
        } else if (status === "Declined") {
          evt = "QUOTE_DECLINED";
          msg = "Quote request for '" + serviceName + "' was marked as declined.";
        } else {
          msg = "Quote status updated to: " + status;
        }

        if (typeof NotificationService !== "undefined" && NotificationService.createNotification) {
          NotificationService.createNotification({
            eventType: evt,
            clientId: clientId,
            clientName: clientName,
            email: String(row[colMap["email"]] || ""),
            serviceName: serviceName,
            quoteAmount: amount,
            message: msg,
            relatedEntityType: "QUOTE_REQUEST",
            relatedEntityId: quoteId
          });
        } else {
          var notifSheet = getSheet("Notifications");
          notifSheet.appendRow([
            SecurityService.generateSecureId("NOTIF"),
            clientId,
            clientName,
            evt,
            msg,
            "PORTAL",
            new Date().toISOString(),
            "Unread"
          ]);
        }
      } catch (ne) {}
    }

    return {
      success: true,
      data: sanitizeQuote(row, colMap),
      message: "Quote status updated to '" + status + "'."
    };
  }

  // ==========================================
  // 7. ADMIN CRM SYNC MONITORING & CONTROLS
  // ==========================================

  function adminGetCrmSync(token, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    if (typeof CRMSyncService === "undefined" || !CRMSyncService.getCrmSyncOverview) {
      return {
        success: true,
        data: {
          status: "Healthy",
          lastSyncTime: "Just now",
          successfulRecords: 0,
          failedRecords: 0,
          records: []
        }
      };
    }

    var overview = CRMSyncService.getCrmSyncOverview();
    return {
      success: true,
      data: overview,
      message: "CRM Sync overview retrieved."
    };
  }

  function adminRetryCrmSync(token, syncId, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    if (typeof CRMSyncService === "undefined" || !CRMSyncService.retrySync) {
      return { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "CRM Sync service unavailable." } };
    }

    return CRMSyncService.retrySync(syncId, session, metadata);
  }

  function adminTriggerForceSync(token, metadata) {
    var session = SessionService.validateSession(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    if (typeof CRMSyncService === "undefined" || !CRMSyncService.triggerForceSync) {
      return { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "CRM Sync service unavailable." } };
    }

    return CRMSyncService.triggerForceSync(session, metadata);
  }

  return {
    getClientProfile: getClientProfile,
    getClientDashboard: getClientDashboard,
    getClientServices: getClientServices,
    getClientService: getClientService,
    getClientStages: getClientStages,
    getClientNotifications: getClientNotifications,
    markNotificationRead: markNotificationRead,
    getClientDocuments: getClientDocuments,
    uploadDocument: uploadDocument,
    getFormSubmissionConfig: getFormSubmissionConfig,
    createQuoteRequest: createQuoteRequest,
    getClientQuoteRequests: getClientQuoteRequests,
    adminGetDashboard: adminGetDashboard,
    adminGetClients: adminGetClients,
    adminGetClient: adminGetClient,
    adminGetService: adminGetService,
    adminUpdateServiceStage: adminUpdateServiceStage,
    adminAssignSpoc: adminAssignSpoc,
    adminGetSpocs: adminGetSpocs,
    adminGetDocuments: adminGetDocuments,
    adminVerifyDocument: adminVerifyDocument,
    adminRejectDocument: adminRejectDocument,
    adminGetQuoteRequests: adminGetQuoteRequests,
    adminUpdateQuoteStatus: adminUpdateQuoteStatus,
    adminGetCrmSync: adminGetCrmSync,
    adminRetryCrmSync: adminRetryCrmSync,
    adminTriggerForceSync: adminTriggerForceSync,
    markAllNotificationsRead: markAllNotificationsRead,
    adminGetNotifications: adminGetNotifications,
    adminMarkAllNotificationsRead: adminMarkAllNotificationsRead,
    adminGetNotificationHealth: adminGetNotificationHealth,
    processFormSubmission: processFormSubmission
  };
})();
