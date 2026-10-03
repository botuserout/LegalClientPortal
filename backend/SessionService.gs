/**
 * Legal Sthal - Centralized Session Management Layer (SessionService.gs)
 * Version: 2.0.0
 * 
 * Manages opaque session bearer tokens, server-side session persistence in the Sessions sheet,
 * strict TTL validation, activity tracking, and server-side revocation.
 * 
 * Key Security Design:
 * - Browser receives an unguessable 256-bit random opaque token.
 * - Database stores exclusively SHA-256(token) to prevent token compromise from sheet viewing.
 * - Session verification enforces expiration and user account active/lockout state.
 */

var SessionService = (function() {

  /**
   * Helper to retrieve Sessions sheet instance.
   */
  function getSessionsSheet() {
    var ss = getSpreadsheetInstance();
    return ss.getSheetByName("Sessions");
  }

  /**
   * Creates a new authenticated session in the Sessions tab.
   * 
   * @param {string} userId - Client ID or Admin ID.
   * @param {string} role - Authenticated role (CLIENT, SUPER_ADMIN, ADMIN, TEAM_MEMBER).
   * @param {string} clientId - Client tenant ID (or null for admin).
   * @param {boolean} isFirstLogin - Flag indicating restricted first-login state.
   * @returns {Object} Safe session descriptor containing raw token for client bearer transmission.
   */
  function createSession(userId, role, clientId, isFirstLogin) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSessionsSheet();
      if (!sheet) {
        throw new Error("Sessions sheet not found in database.");
      }

      var rawToken = SecurityService.generateSecureToken();
      var tokenHash = SecurityService.hashToken(rawToken);
      var sessionId = SecurityService.generateSecureId("SESS");
      var createdAt = new Date().toISOString();
      var ttlMs = (CONFIG.SESSION.TTL_MINUTES || 60) * 60 * 1000;
      var expiresAt = new Date(new Date().getTime() + ttlMs).toISOString();

      var headers = getSheetHeaders(sheet);
      var colMap = getColumnIndexMap(headers, "Sessions");

      var row = new Array(headers.length);
      for (var i = 0; i < row.length; i++) row[i] = "";

      row[colMap["session_id"]] = sessionId;
      row[colMap["token_hash"]] = tokenHash;
      row[colMap["user_id"]] = userId;
      row[colMap["role"]] = role;
      row[colMap["client_id"]] = clientId || "";
      row[colMap["created_at"]] = createdAt;
      row[colMap["expires_at"]] = expiresAt;
      row[colMap["last_activity"]] = createdAt;
      row[colMap["status"]] = "ACTIVE";

      sheet.appendRow(row);

      return {
        token: rawToken,
        sessionId: sessionId,
        userId: userId,
        role: role,
        clientId: clientId || null,
        expiresAt: expiresAt,
        firstLogin: !!isFirstLogin,
        restrictedPasswordChange: !!isFirstLogin
      };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Validates a raw bearer session token against the Sessions sheet.
   * 
   * @param {string} rawToken - The client-supplied session token.
   * @returns {Object|null} Auth context object if valid, { expired: true } if expired, or null if invalid.
   */
  function validateSession(rawToken) {
    if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
      return null;
    }

    var sheet = getSessionsSheet();
    if (!sheet || sheet.getLastRow() <= 1) {
      return null;
    }

    var tokenHash = SecurityService.hashToken(rawToken);
    var headers = getSheetHeaders(sheet);
    var colMap = getColumnIndexMap(headers, "Sessions");
    var data = sheet.getDataRange().getValues();

    var tokenHashIdx = colMap["token_hash"];
    var statusIdx = colMap["status"];
    var expiresAtIdx = colMap["expires_at"];
    var userIdIdx = colMap["user_id"];
    var roleIdx = colMap["role"];
    var clientIdIdx = colMap["client_id"];
    var sessionIdIdx = colMap["session_id"];
    var lastActivityIdx = colMap["last_activity"];

    var now = new Date();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (SecurityService.secureCompare(row[tokenHashIdx], tokenHash)) {
        var status = String(row[statusIdx]).toUpperCase();

        // 1. Check if session has been revoked or is not active
        if (status !== "ACTIVE") {
          return null;
        }

        // 2. Check session expiration
        var expiresAt = new Date(row[expiresAtIdx]);
        if (expiresAt <= now) {
          // Mark session expired in-place
          sheet.getRange(i + 1, statusIdx + 1).setValue("EXPIRED");
          return { expired: true };
        }

        // 3. Verify underlying user account state
        var userId = row[userIdIdx];
        var role = row[roleIdx];
        var userCheck = checkUserAccountActive(userId, role);
        if (!userCheck.active) {
          // User account is locked, inactive, or not found
          return null;
        }

        // 4. Update last_activity timestamp (throttled to save sheet writes)
        var lastActivity = new Date(row[lastActivityIdx]);
        if ((now.getTime() - lastActivity.getTime()) > 60000) { // Every 1 minute
          sheet.getRange(i + 1, lastActivityIdx + 1).setValue(now.toISOString());
        }

        return {
          authenticated: true,
          userId: userId,
          role: role,
          clientId: row[clientIdIdx] || (role === "CLIENT" ? userId : null),
          sessionId: row[sessionIdIdx],
          firstLogin: !!userCheck.firstLogin,
          restrictedPasswordChange: !!userCheck.firstLogin,
          name: userCheck.name || "",
          email: userCheck.email || "",
          contactPerson: userCheck.contactPerson || ""
        };
      }
    }

    return null;
  }

  /**
   * Helper to inspect user account in Clients or AdminUsers to ensure it is active and not locked.
   */
  function checkUserAccountActive(userId, role) {
    var ss = getSpreadsheetInstance();
    var now = new Date();

    if (role === "CLIENT") {
      var clientSheet = ss.getSheetByName("Clients");
      if (!clientSheet || clientSheet.getLastRow() <= 1) return { active: false };
      var headers = getSheetHeaders(clientSheet);
      var colMap = getColumnIndexMap(headers, "Clients");
      var data = clientSheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][colMap["client_id"]] === userId) {
          var status = String(data[i][colMap["status"]] || "").toUpperCase();
          if (status !== "ACTIVE") return { active: false };

          var lockedUntil = data[i][colMap["locked_until"]];
          if (lockedUntil && new Date(lockedUntil) > now) {
            return { active: false, locked: true };
          }

          var firstLoginVal = data[i][colMap["first_login"]];
          var isFirstLogin = (firstLoginVal === true || firstLoginVal === "TRUE" || firstLoginVal === 1);
          return {
            active: true,
            firstLogin: isFirstLogin,
            name: data[i][colMap["name"]] || "",
            email: data[i][colMap["email"]] || "",
            contactPerson: (colMap["contact_person"] !== undefined ? data[i][colMap["contact_person"]] : "") || data[i][colMap["name"]] || ""
          };
        }
      }
    } else {
      var adminSheet = ss.getSheetByName("AdminUsers");
      if (!adminSheet || adminSheet.getLastRow() <= 1) return { active: false };
      var aHeaders = getSheetHeaders(adminSheet);
      var aMap = getColumnIndexMap(aHeaders, "AdminUsers");
      var aData = adminSheet.getDataRange().getValues();

      for (var j = 1; j < aData.length; j++) {
        if (aData[j][aMap["admin_id"]] === userId) {
          var aStatus = String(aData[j][aMap["status"]] || "").toUpperCase();
          if (aStatus !== "ACTIVE") return { active: false };

          var aLockedUntil = aData[j][aMap["locked_until"]];
          if (aLockedUntil && new Date(aLockedUntil) > now) {
            return { active: false, locked: true };
          }

          return {
            active: true,
            firstLogin: false,
            name: aData[j][aMap["name"]] || "",
            email: aData[j][aMap["email"]] || ""
          };
        }
      }
    }

    return { active: false };
  }

  /**
   * Revokes a single session by token.
   */
  function revokeSession(rawToken) {
    if (!rawToken) return false;
    var sheet = getSessionsSheet();
    if (!sheet || sheet.getLastRow() <= 1) return false;

    var tokenHash = SecurityService.hashToken(rawToken);
    var headers = getSheetHeaders(sheet);
    var colMap = getColumnIndexMap(headers, "Sessions");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (SecurityService.secureCompare(data[i][colMap["token_hash"]], tokenHash)) {
        sheet.getRange(i + 1, colMap["status"] + 1).setValue("REVOKED");
        return true;
      }
    }
    return false;
  }

  /**
   * Revokes all active sessions for a specified user ID (e.g. upon password reset or security revocation).
   */
  function revokeAllUserSessions(userId) {
    var sheet = getSessionsSheet();
    if (!sheet || sheet.getLastRow() <= 1) return 0;

    var headers = getSheetHeaders(sheet);
    var colMap = getColumnIndexMap(headers, "Sessions");
    var data = sheet.getDataRange().getValues();
    var revokedCount = 0;

    for (var i = 1; i < data.length; i++) {
      if (data[i][colMap["user_id"]] === userId && String(data[i][colMap["status"]]).toUpperCase() === "ACTIVE") {
        sheet.getRange(i + 1, colMap["status"] + 1).setValue("REVOKED");
        revokedCount++;
      }
    }
    return revokedCount;
  }

  /**
   * Periodic housekeeping cleanup marking expired sessions.
   */
  function cleanupExpiredSessions() {
    var sheet = getSessionsSheet();
    if (!sheet || sheet.getLastRow() <= 1) return 0;

    var headers = getSheetHeaders(sheet);
    var colMap = getColumnIndexMap(headers, "Sessions");
    var data = sheet.getDataRange().getValues();
    var now = new Date();
    var count = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMap["status"]]).toUpperCase() === "ACTIVE") {
        var exp = new Date(data[i][colMap["expires_at"]]);
        if (exp <= now) {
          sheet.getRange(i + 1, colMap["status"] + 1).setValue("EXPIRED");
          count++;
        }
      }
    }
    return count;
  }

  return {
    createSession: createSession,
    validateSession: validateSession,
    revokeSession: revokeSession,
    revokeAllUserSessions: revokeAllUserSessions,
    cleanupExpiredSessions: cleanupExpiredSessions
  };
})();
