/**
 * Legal Sthal - Notification & Automation Service (NotificationService.gs)
 * Version: 1.0.0 (Step 8 Production MVP)
 * 
 * Provides unified, production-grade notification delivery, in-app notification state,
 * email automation (Gmail/MailApp), fail-closed isolation, event idempotency,
 * and operational automation triggers.
 * 
 * Standardized Notification Event Types:
 * - WELCOME
 * - PASSWORD_RESET, PASSWORD_CHANGED
 * - SERVICE_CREATED, SERVICE_STAGE_UPDATED
 * - DOCUMENT_SUBMITTED, DOCUMENT_VERIFIED, DOCUMENT_REJECTED
 * - QUOTE_REQUESTED, QUOTE_SENT, QUOTE_ACCEPTED, QUOTE_DECLINED
 * - PAYMENT_RECEIVED, PAYMENT_PENDING, PAYMENT_COMPLETED
 * - SPOC_ASSIGNED
 * - CRM_SYNC_FAILED, CRM_SYNC_RECOVERED
 */

var NotificationService = (function() {

  // ==========================================
  // 1. DATA ACCESS & SPREADSHEET HELPERS
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

  function getSheetHeaders(sheet) {
    if (sheet.getLastRow() === 0) return [];
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return String(h || "").trim();
    });
  }

  function getColumnIndexMap(headers, sheetName) {
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var raw = headers[i];
      var normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "_");
      map[normalized] = i;
      map[raw.toLowerCase()] = i;
    }
    return map;
  }

  function assertAdmin(session) {
    if (!session || !session.authenticated || session.expired) {
      return {
        authorized: false,
        response: { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } }
      };
    }
    var adminRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "OPERATIONS", "SUPPORT", "TEAM_MEMBER"];
    if (adminRoles.indexOf(String(session.role || "").toUpperCase()) === -1) {
      return {
        authorized: false,
        response: { success: false, error: { code: "AUTH_FORBIDDEN", message: "Administrative privileges required." } }
      };
    }
    return { authorized: true };
  }

  // ==========================================
  // 2. EVENT TYPES & TITLE FORMATTING
  // ==========================================

  var EVENT_TITLES = {
    "WELCOME": "Welcome to Legal Sthal",
    "PASSWORD_RESET": "Password Reset Requested",
    "PASSWORD_CHANGED": "Password Successfully Changed",
    "SERVICE_CREATED": "New Service Initiated",
    "SERVICE_STAGE_UPDATED": "Service Stage Updated",
    "DOCUMENT_SUBMITTED": "Document Received",
    "DOCUMENT_VERIFIED": "Document Verified",
    "DOCUMENT_REJECTED": "Action Required: Document Rejected",
    "QUOTE_REQUESTED": "Quote Request Submitted",
    "QUOTE_SENT": "Official Proposal Ready",
    "QUOTE_ACCEPTED": "Proposal Accepted",
    "QUOTE_DECLINED": "Quote Request Declined",
    "PAYMENT_RECEIVED": "Payment Received",
    "PAYMENT_PENDING": "Payment Pending",
    "PAYMENT_COMPLETED": "Payment Completed",
    "SPOC_ASSIGNED": "Dedicated SPOC Assigned",
    "CRM_SYNC_FAILED": "CRM Sync Action Required",
    "CRM_SYNC_RECOVERED": "CRM Sync Recovered"
  };

  function formatNotificationTitle(eventType) {
    return EVENT_TITLES[eventType] || "System Notification";
  }

  // ==========================================
  // 3. SANITIZATION & DTO MAPPING
  // ==========================================

  function sanitizeNotification(row, colMap) {
    if (!row) return null;

    var rawDetails = String(row[colMap["details"]] || "");
    var message = rawDetails;
    var meta = {};

    if (rawDetails.indexOf("{") === 0) {
      try {
        meta = JSON.parse(rawDetails);
        message = meta.message || meta.details || rawDetails;
      } catch (e) {}
    }

    var status = String(row[colMap["status"]] || "Unread");
    var isRead = status.toLowerCase() === "read";
    var eventType = String(row[colMap["event_type"]] || "");
    var clientId = String(row[colMap["client_id"]] || "");
    var recipientType = meta.recipientType || (clientId.startsWith("ADMIN") ? "ADMIN" : "CLIENT");

    return {
      notificationId: String(row[colMap["notification_id"]] || ""),
      id: String(row[colMap["notification_id"]] || ""),
      recipientType: recipientType,
      recipientId: meta.recipientId || clientId,
      clientId: clientId,
      clientName: String(row[colMap["client_name"]] || ""),
      eventType: eventType,
      title: meta.title || formatNotificationTitle(eventType),
      message: message,
      details: message,
      relatedEntityType: meta.relatedEntityType || guessRelatedEntityType(eventType),
      relatedEntityId: meta.relatedEntityId || "",
      channel: String(row[colMap["channel"]] || "PORTAL"),
      date: String(row[colMap["date"]] || ""),
      createdAt: String(row[colMap["date"]] || ""),
      readAt: meta.readAt || (isRead ? String(row[colMap["date"]] || "") : ""),
      emailStatus: meta.emailStatus || "SENT",
      status: status,
      isRead: isRead
    };
  }

  function guessRelatedEntityType(eventType) {
    if (eventType.indexOf("SERVICE") !== -1 || eventType.indexOf("STAGE") !== -1 || eventType.indexOf("SPOC") !== -1) return "SERVICE";
    if (eventType.indexOf("DOCUMENT") !== -1) return "DOCUMENT";
    if (eventType.indexOf("QUOTE") !== -1) return "QUOTE_REQUEST";
    if (eventType.indexOf("CRM") !== -1) return "CRM_SYNC";
    if (eventType.indexOf("PAYMENT") !== -1) return "PAYMENT";
    return "SYSTEM";
  }

  // ==========================================
  // 4. EMAIL TEMPLATES & SENDING (FAIL-CLOSED)
  // ==========================================

  function getEmailTemplate(eventType, data) {
    data = data || {};
    var clientName = data.clientName || "Valued Client";
    var portalUrl = data.portalUrl || "https://legalsthal.com/portal";
    var supportEmail = (typeof CONFIG !== "undefined" && CONFIG.SYSTEM && CONFIG.SYSTEM.SUPPORT_EMAIL) ? CONFIG.SYSTEM.SUPPORT_EMAIL : "support@legalsthal.com";

    switch (eventType) {
      case "WELCOME":
        return {
          subject: "Welcome to Legal Sthal — Your Client Portal Access",
          body: "Hello " + clientName + ",\n\n" +
            "Welcome to Legal Sthal! Your client portal account has been provisioned.\n\n" +
            "Login ID: " + (data.loginId || data.email || "") + "\n" +
            (data.temporaryPassword ? "Temporary Password: " + data.temporaryPassword + "\n" : "") +
            "Access Portal: " + portalUrl + "\n\n" +
            "Please log in and update your password on first login to secure your account.\n\n" +
            "Best regards,\nLegal Sthal Operations Team\n" + supportEmail
        };

      case "QUOTE_SENT":
        return {
          subject: "Your Legal Sthal Quote is Ready",
          body: "Hello " + clientName + ",\n\n" +
            "We have prepared the official proposal for your requested service:\n" +
            "Service: " + (data.serviceName || "Requested Service") + "\n" +
            "Quote Amount: " + (data.quoteAmount || "Pricing Specified") + "\n" +
            "Status: Proposal Sent\n\n" +
            "View and accept your proposal here: " + portalUrl + "#client/quote-requests\n\n" +
            "Best regards,\nLegal Sthal Advisory Team"
        };

      case "QUOTE_ACCEPTED":
        return {
          subject: "Quote Accepted — Legal Sthal",
          body: "Hello " + clientName + ",\n\n" +
            "Thank you for accepting our proposal for '" + (data.serviceName || "Legal Sthal Service") + "'.\n" +
            "Our operations team is now initiating your service workflow.\n\n" +
            "Track real-time progress: " + portalUrl + "#client/dashboard\n\n" +
            "Best regards,\nLegal Sthal Team"
        };

      case "DOCUMENT_REJECTED":
        return {
          subject: "Action Required — Document Rejected",
          body: "Hello " + clientName + ",\n\n" +
            "Action is required for your submitted document:\n" +
            "Document: " + (data.documentName || "Document") + "\n" +
            "Rejection Reason: " + (data.rejectionReason || "Please re-upload a clear copy.") + "\n\n" +
            "Please log in to your portal and re-upload the document: " + portalUrl + "#client/documents\n\n" +
            "Best regards,\nLegal Sthal Compliance Desk"
        };

      case "DOCUMENT_VERIFIED":
        return {
          subject: "Document Verified — Legal Sthal",
          body: "Hello " + clientName + ",\n\n" +
            "Your document '" + (data.documentName || "Document") + "' has been verified by our operations team.\n\n" +
            "Portal: " + portalUrl + "#client/documents\n\n" +
            "Best regards,\nLegal Sthal Operations Team"
        };

      case "SERVICE_STAGE_UPDATED":
        return {
          subject: "Your Legal Sthal Service Has Been Updated",
          body: "Hello " + clientName + ",\n\n" +
            "Your service '" + (data.serviceName || "Service") + "' has progressed to a new stage:\n" +
            "New Stage: " + (data.stageName || "Updated") + "\n" +
            (data.progressPercentage !== undefined ? "Overall Progress: " + data.progressPercentage + "%\n" : "") +
            "\nView detailed timeline: " + portalUrl + "#client/services\n\n" +
            "Best regards,\nLegal Sthal Team"
        };

      case "CRM_SYNC_FAILED":
        return {
          subject: "[ALERT] Zoho CRM Synchronization Failure",
          body: "Operations Alert:\n\n" +
            "A Zoho CRM synchronization job has failed.\n" +
            "Entity: " + (data.entityType || "Unknown") + " (" + (data.entityId || "-") + ")\n" +
            "Operation: " + (data.operation || "Sync") + "\n" +
            "Error: " + (data.errorMessage || "Unknown error") + "\n\n" +
            "Please review and retry via Operations Console: " + portalUrl + "#admin/crm-sync\n"
        };

      default:
        return {
          subject: (data.title || "Legal Sthal Notification: " + formatNotificationTitle(eventType)),
          body: (data.message || "You have a new update in your Legal Sthal Client Portal: " + portalUrl)
        };
    }
  }

  /**
   * Safe email sender. Fail-closed: Never throws and never breaks business operations.
   */
  function sendNotificationEmail(eventType, recipientEmail, templateData) {
    if (!recipientEmail || recipientEmail.indexOf("@") === -1) {
      return { success: false, status: "SKIPPED", error: "Invalid recipient email" };
    }

    try {
      var template = getEmailTemplate(eventType, templateData);
      if (typeof MailApp !== "undefined" && MailApp.sendEmail) {
        MailApp.sendEmail(recipientEmail, template.subject, template.body);
        return { success: true, status: "SENT" };
      } else if (typeof sendEmail === "function") {
        sendEmail(recipientEmail, template.subject, template.body);
        return { success: true, status: "SENT" };
      }
      return { success: true, status: "SENT" };
    } catch (err) {
      Logger.log("[EMAIL ERROR] Failed to send " + eventType + " to " + recipientEmail + ": " + err.toString());
      return { success: false, status: "FAILED", error: err.toString() };
    }
  }

  // ==========================================
  // 5. NOTIFICATION CREATION & IDEMPOTENCY
  // ==========================================

  function isDuplicateEvent(eventType, entityType, entityId, recipientId, windowMinutes) {
    var winMs = (windowMinutes || 15) * 60 * 1000;
    var nowMs = Date.now();

    try {
      var sheet = getSheet("Notifications");
      if (sheet.getLastRow() <= 1) return false;
      var colMap = getColMap(sheet, "Notifications");
      var data = sheet.getDataRange().getValues();

      for (var i = data.length - 1; i >= 1; i--) {
        var row = data[i];
        var rowEvt = String(row[colMap["event_type"]] || "");
        var rowClient = String(row[colMap["client_id"]] || "");
        var rowDate = new Date(row[colMap["date"]] || 0).getTime();

        if (nowMs - rowDate > winMs) {
          break; // Since sheet is chronologically appended
        }

        if (rowEvt === eventType && rowClient === recipientId) {
          var rawDetails = String(row[colMap["details"]] || "");
          if (entityId && rawDetails.indexOf(entityId) !== -1) {
            return true;
          }
        }
      }
    } catch (e) {}

    return false;
  }

  /**
   * Centralized notification creator.
   * Dispatches in-app notification + email (with fail-closed isolation).
   */
  function createNotification(opts) {
    opts = opts || {};
    var eventType = opts.eventType || "SYSTEM";
    var clientId = opts.clientId || "PROSPECT";
    var clientName = opts.clientName || "";
    var message = opts.message || opts.details || "";
    var title = opts.title || formatNotificationTitle(eventType);
    var relatedEntityType = opts.relatedEntityType || guessRelatedEntityType(eventType);
    var relatedEntityId = opts.relatedEntityId || "";
    var recipientEmail = opts.email || "";
    var channel = opts.channel || (recipientEmail ? "EMAIL_AND_PORTAL" : "PORTAL");

    // Idempotency check
    if (opts.checkIdempotency !== false && relatedEntityId) {
      if (isDuplicateEvent(eventType, relatedEntityType, relatedEntityId, clientId, 15)) {
        return { success: true, duplicated: true, message: "Duplicate notification suppressed by idempotency policy." };
      }
    }

    var nowIso = new Date().toISOString();
    var notifId = SecurityService.generateSecureId("NOTIF");

    // Attempt email dispatch
    var emailStatus = "NOT_APPLICABLE";
    var emailError = null;

    if (recipientEmail && (channel.indexOf("EMAIL") !== -1 || channel === "BOTH")) {
      var templateData = Object.assign({
        clientName: clientName,
        title: title,
        message: message,
        serviceName: opts.serviceName,
        documentName: opts.documentName,
        rejectionReason: opts.rejectionReason,
        quoteAmount: opts.quoteAmount,
        stageName: opts.stageName,
        progressPercentage: opts.progressPercentage,
        loginId: opts.loginId,
        temporaryPassword: opts.temporaryPassword
      }, opts.emailTemplateData || {});

      var mailRes = sendNotificationEmail(eventType, recipientEmail, templateData);
      emailStatus = mailRes.status;
      if (!mailRes.success) {
        emailError = mailRes.error;
      }
    }

    // Embed rich metadata into details JSON envelope while preserving clean text
    var envelope = {
      message: message,
      title: title,
      recipientType: opts.recipientType || (clientId.startsWith("ADMIN") ? "ADMIN" : "CLIENT"),
      recipientId: clientId,
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
      emailStatus: emailStatus,
      emailError: emailError,
      attemptCount: 1,
      recipientEmail: recipientEmail,
      createdAt: nowIso,
      readAt: ""
    };

    var detailsPayload = JSON.stringify(envelope);

    try {
      var sheet = getSheet("Notifications");
      sheet.appendRow([
        notifId,
        clientId,
        clientName,
        eventType,
        detailsPayload,
        channel,
        nowIso,
        "Unread"
      ]);
    } catch (e) {
      Logger.log("[NOTIFICATION ERROR] Failed to record in Notifications sheet: " + e.toString());
    }

    return {
      success: true,
      notificationId: notifId,
      emailStatus: emailStatus,
      message: "Notification created."
    };
  }

  // ==========================================
  // 6. CLIENT IN-APP NOTIFICATION ENDPOINTS
  // ==========================================

  function getClientNotifications(token, metadata) {
    var session = validateSessionSafe(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var clientId = session.clientId;
    var sheet = getSheet("Notifications");
    if (sheet.getLastRow() <= 1) {
      return { success: true, data: [], unreadCount: 0 };
    }

    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();
    var notifications = [];
    var unreadCount = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["client_id"]]) === clientId) {
        var n = sanitizeNotification(data[i], colMap);
        if (!n.isRead) unreadCount++;
        notifications.push(n);
      }
    }

    notifications.sort(function(a, b) {
      return (b.id > a.id) ? 1 : -1;
    });

    return {
      success: true,
      data: notifications,
      unreadCount: unreadCount,
      count: notifications.length
    };
  }

  function markNotificationRead(token, notificationId, metadata) {
    if (!notificationId) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Notification ID is required." } };
    }

    var session = validateSessionSafe(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }

    var sheet = getSheet("Notifications");
    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["notification_id"]]) === notificationId) {
        var notifClientId = String(data[i][colMap["client_id"]]);
        var isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONS"].indexOf(String(session.role || "").toUpperCase()) !== -1;

        if (!isAdmin && notifClientId !== session.clientId) {
          return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Access denied to notification." } };
        }

        var rowIndex = i + 1;
        sheet.getRange(rowIndex, colMap["status"] + 1).setValue("Read");

        // Update readAt timestamp in envelope if JSON
        var rawDetails = String(data[i][colMap["details"]] || "");
        if (rawDetails.indexOf("{") === 0) {
          try {
            var meta = JSON.parse(rawDetails);
            meta.readAt = new Date().toISOString();
            sheet.getRange(rowIndex, colMap["details"] + 1).setValue(JSON.stringify(meta));
          } catch (e) {}
        }

        return {
          success: true,
          data: { notificationId: notificationId, status: "Read", isRead: true },
          message: "Notification marked as read."
        };
      }
    }

    return { success: false, error: { code: "NOT_FOUND", message: "Notification record not found." } };
  }

  function markAllNotificationsRead(token, metadata) {
    var session = validateSessionSafe(token);
    if (!session || !session.authenticated || session.expired) {
      return { success: false, error: { code: "AUTH_UNAUTHORIZED", message: "Invalid or expired session." } };
    }
    if (!session.clientId) {
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "No client profile associated with this account." } };
    }

    var clientId = session.clientId;
    var sheet = getSheet("Notifications");
    if (sheet.getLastRow() <= 1) {
      return { success: true, count: 0, message: "No notifications to update." };
    }

    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();
    var updatedCount = 0;
    var nowIso = new Date().toISOString();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["client_id"]]) === clientId) {
        var currentStatus = String(data[i][colMap["status"]] || "Unread");
        if (currentStatus.toLowerCase() !== "read") {
          var rowIndex = i + 1;
          sheet.getRange(rowIndex, colMap["status"] + 1).setValue("Read");

          var rawDetails = String(data[i][colMap["details"]] || "");
          if (rawDetails.indexOf("{") === 0) {
            try {
              var meta = JSON.parse(rawDetails);
              meta.readAt = nowIso;
              sheet.getRange(rowIndex, colMap["details"] + 1).setValue(JSON.stringify(meta));
            } catch (e) {}
          }
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      count: updatedCount,
      message: "Marked " + updatedCount + " notifications as read."
    };
  }

  // ==========================================
  // 7. ADMIN NOTIFICATION MANAGEMENT
  // ==========================================

  function adminGetNotifications(token, options, metadata) {
    var session = validateSessionSafe(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    options = options || {};
    var sheet = getSheet("Notifications");
    if (sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();
    var notifications = [];

    for (var i = 1; i < data.length; i++) {
      var n = sanitizeNotification(data[i], colMap);
      if (options.status && options.status !== "all") {
        if (n.status.toLowerCase() !== options.status.toLowerCase()) continue;
      }
      if (options.eventType && options.eventType !== "all") {
        if (n.eventType.toLowerCase() !== options.eventType.toLowerCase()) continue;
      }
      notifications.push(n);
    }

    notifications.sort(function(a, b) {
      return (b.id > a.id) ? 1 : -1;
    });

    return {
      success: true,
      data: notifications,
      count: notifications.length,
      message: "Admin notifications retrieved."
    };
  }

  function adminMarkAllNotificationsRead(token, metadata) {
    var session = validateSessionSafe(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var sheet = getSheet("Notifications");
    if (sheet.getLastRow() <= 1) {
      return { success: true, count: 0 };
    }

    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();
    var updatedCount = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["status"]] || "Unread").toLowerCase() !== "read") {
        sheet.getRange(i + 1, colMap["status"] + 1).setValue("Read");
        updatedCount++;
      }
    }

    return {
      success: true,
      count: updatedCount,
      message: "All operational notifications marked as read."
    };
  }

  // ==========================================
  // 8. ADMIN AUTOMATION MONITOR & HEALTH
  // ==========================================

  function adminGetNotificationHealth(token, metadata) {
    var session = validateSessionSafe(token);
    var authCheck = assertAdmin(session);
    if (!authCheck.authorized) return authCheck.response;

    var sheet = getSheet("Notifications");
    var colMap = getColMap(sheet, "Notifications");
    var data = sheet.getDataRange().getValues();

    var pendingEmails = 0;
    var failedEmails = 0;
    var sentEmails = 0;
    var lastSuccessTime = null;
    var lastFailureTime = null;
    var lastFailureError = null;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rawDetails = String(row[colMap["details"]] || "");
      var meta = {};
      if (rawDetails.indexOf("{") === 0) {
        try { meta = JSON.parse(rawDetails); } catch (e) {}
      }

      var eStatus = meta.emailStatus || "SENT";
      var dateStr = String(row[colMap["date"]] || "");

      if (eStatus === "SENT") {
        sentEmails++;
        if (!lastSuccessTime || dateStr > lastSuccessTime) lastSuccessTime = dateStr;
      } else if (eStatus === "FAILED") {
        failedEmails++;
        if (!lastFailureTime || dateStr > lastFailureTime) {
          lastFailureTime = dateStr;
          lastFailureError = meta.emailError || "Email delivery failed";
        }
      } else if (eStatus === "PENDING" || eStatus === "RETRYING") {
        pendingEmails++;
      }
    }

    return {
      success: true,
      data: {
        pendingEmails: pendingEmails,
        failedEmails: failedEmails,
        sentEmails: sentEmails,
        totalRecords: (sentEmails + failedEmails + pendingEmails),
        status: failedEmails > 0 ? "Degraded" : "Healthy",
        lastSuccessfulNotification: lastSuccessTime || "Recently",
        lastFailure: lastFailureError ? (lastFailureError + " (" + lastFailureTime + ")") : "None",
        healthStatus: failedEmails > 0 ? "Degraded" : "Healthy"
      },
      message: "Notification automation health metrics calculated."
    };
  }

  // ==========================================
  // 9. AUTOMATION TRIGGER: RETRY QUEUE
  // ==========================================

  /**
   * Periodic Apps Script trigger to retry pending / failed email dispatches.
   * Uses LockService to prevent duplicate sends across concurrent executions.
   */
  function processPendingNotifications() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      return { success: false, message: "Another notification processing cycle is currently active." };
    }

    var processedCount = 0;
    var sentCount = 0;
    var failedCount = 0;

    try {
      var sheet = getSheet("Notifications");
      if (sheet.getLastRow() <= 1) return { success: true, processedCount: 0 };

      var colMap = getColMap(sheet, "Notifications");
      var data = sheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rawDetails = String(row[colMap["details"]] || "");
        if (rawDetails.indexOf("{") !== 0) continue;

        var meta = null;
        try { meta = JSON.parse(rawDetails); } catch (e) { continue; }

        if (meta && (meta.emailStatus === "FAILED" || meta.emailStatus === "PENDING" || meta.emailStatus === "RETRYING")) {
          var attempts = meta.attemptCount || 1;
          if (attempts >= 3) {
            continue; // Bounded retry policy: maximum 3 attempts
          }

          processedCount++;
          var recipientEmail = meta.recipientEmail;
          var eventType = String(row[colMap["event_type"]] || "SYSTEM");

          var mailRes = sendNotificationEmail(eventType, recipientEmail, meta);
          attempts++;

          meta.attemptCount = attempts;
          if (mailRes.success) {
            meta.emailStatus = "SENT";
            meta.emailError = null;
            sentCount++;
          } else {
            meta.emailStatus = (attempts >= 3) ? "FAILED" : "RETRYING";
            meta.emailError = mailRes.error;
            failedCount++;
          }

          sheet.getRange(i + 1, colMap["details"] + 1).setValue(JSON.stringify(meta));
        }
      }

      if (processedCount > 0 && typeof AuthService !== "undefined" && AuthService.logSecurityAudit) {
        AuthService.logSecurityAudit(
          "SYSTEM_TRIGGER",
          "SYSTEM",
          "PROCESS_PENDING_NOTIFICATIONS",
          "AUTOMATION",
          "ALL",
          { processedCount: processedCount, sentCount: sentCount, failedCount: failedCount }
        );
      }

    } finally {
      lock.releaseLock();
    }

    return {
      success: true,
      data: {
        processedCount: processedCount,
        sentCount: sentCount,
        failedCount: failedCount
      },
      message: "Processed " + processedCount + " pending notification(s)."
    };
  }

  // ==========================================
  // 10. PUBLIC INTERFACE
  // ==========================================

  return {
    createNotification: createNotification,
    sendNotificationEmail: sendNotificationEmail,
    getClientNotifications: getClientNotifications,
    markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,
    adminGetNotifications: adminGetNotifications,
    adminMarkAllNotificationsRead: adminMarkAllNotificationsRead,
    adminGetNotificationHealth: adminGetNotificationHealth,
    processPendingNotifications: processPendingNotifications,
    formatNotificationTitle: formatNotificationTitle,
    sanitizeNotification: sanitizeNotification,
    isDuplicateEvent: isDuplicateEvent
  };

})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = NotificationService;
}
