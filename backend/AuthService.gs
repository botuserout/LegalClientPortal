/**
 * Legal Sthal - Centralized Authentication Core & Identity Engine (AuthService.gs)
 * Version: 2.0.0
 * 
 * Manages user authentication, lockout defense, password lifecycle,
 * legacy credential on-login migration, secure admin bootstrapping, and auditable security events.
 * 
 * Strict Security Principles:
 * - Fail-closed execution.
 * - Atomic state mutations via LockService.
 * - Generic error envelopes on credential verification to prevent user enumeration.
 * - Zero plaintext password retention after migration.
 * - Passwords, hashes, salts, and tokens are strictly excluded from logs and audit trails.
 */

var AuthService = (function() {

  /**
   * Primary login handler for Client and Admin users.
   * 
   * @param {string} loginId - Email address or login ID.
   * @param {string} password - Attempted password.
   * @param {Object} metadata - Optional request context (IP, User-Agent).
   * @returns {Object} Standard API response envelope.
   */
  function login(loginId, password, metadata) {
    if (!loginId || !password) {
      return {
        success: false,
        error: {
          code: "AUTH_INVALID_CREDENTIALS",
          message: "Please provide both login ID and password."
        }
      };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var normLogin = SecurityService.normalizeEmail(loginId);
      var account = findAccountByLogin(normLogin);

      if (!account) {
        logSecurityAudit("UNKNOWN", "PUBLIC", "LOGIN_FAILED", "USER", normLogin, "Account not found", metadata);
        return {
          success: false,
          error: {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid email/login ID or password."
          }
        };
      }

      var now = new Date();

      // 1. Check account active status
      if (account.status !== "ACTIVE" && account.status !== "Active") {
        logSecurityAudit(account.userId, account.role, "LOGIN_BLOCKED_INACTIVE", "USER", account.userId, "Account inactive", metadata);
        return {
          success: false,
          error: {
            code: "AUTH_ACCOUNT_INACTIVE",
            message: "This account has been deactivated. Please contact support."
          }
        };
      }

      // 2. Check brute-force lockout
      if (account.lockedUntil && new Date(account.lockedUntil) > now) {
        var remainingMins = Math.ceil((new Date(account.lockedUntil).getTime() - now.getTime()) / 60000);
        logSecurityAudit(account.userId, account.role, "LOGIN_FAILED_LOCKED", "USER", account.userId, "Attempted during lockout", metadata);
        return {
          success: false,
          error: {
            code: "AUTH_ACCOUNT_LOCKED",
            message: "Account is temporarily locked. Try again in " + remainingMins + " minutes."
          }
        };
      }

      // 3. Verify credentials (supporting on-login legacy migration)
      var credentialVerified = false;
      var migratedLegacy = false;

      if (!account.passwordHash && account.legacyPassword) {
        // Legacy Plaintext Verification & Seamless Salted KDF Migration
        if (password === account.legacyPassword) {
          credentialVerified = true;
          migratedLegacy = true;

          // Migrate to PBKDF2-HMAC-SHA256
          var salt = SecurityService.generateSalt();
          var hash = SecurityService.hashPassword(password, salt);
          account.passwordHash = hash;
          account.passwordSalt = salt;
          account.firstLogin = true; // Force password change on first modern login

          // Update record in sheet and permanently wipe legacy plaintext cell
          updateUserCredentials(account, hash, salt, true, true);
          logSecurityAudit(account.userId, account.role, "LEGACY_CREDENTIAL_MIGRATED", "USER", account.userId, "Plaintext migrated to PBKDF2", metadata);
        }
      } else if (account.passwordHash && account.passwordSalt) {
        // Modern PBKDF2 Verification
        credentialVerified = SecurityService.verifyPassword(password, account.passwordSalt, account.passwordHash);
      }

      if (!credentialVerified) {
        // Record failed attempt
        var newFailedCount = (account.failedAttempts || 0) + 1;
        var lockedUntilVal = "";

        if (newFailedCount >= (CONFIG.LOCKOUT.MAX_FAILED_ATTEMPTS || 5)) {
          var lockMs = (CONFIG.LOCKOUT.LOCKOUT_DURATION_MINUTES || 15) * 60 * 1000;
          lockedUntilVal = new Date(now.getTime() + lockMs).toISOString();
          recordAccountLockout(account, newFailedCount, lockedUntilVal);
          logSecurityAudit(account.userId, account.role, "ACCOUNT_LOCKED", "USER", account.userId, "Locked after " + newFailedCount + " failed attempts", metadata);

          return {
            success: false,
            error: {
              code: "AUTH_ACCOUNT_LOCKED",
              message: "Account is temporarily locked due to multiple failed login attempts. Try again in " + CONFIG.LOCKOUT.LOCKOUT_DURATION_MINUTES + " minutes."
            }
          };
        } else {
          recordFailedAttempt(account, newFailedCount);
          logSecurityAudit(account.userId, account.role, "LOGIN_FAILED", "USER", account.userId, "Invalid password attempt " + newFailedCount, metadata);

          return {
            success: false,
            error: {
              code: "AUTH_INVALID_CREDENTIALS",
              message: "Invalid email/login ID or password."
            }
          };
        }
      }

      // 4. Verification Successful: Reset failed attempts atomically
      resetFailedAttempts(account, now.toISOString());

      // 5. Create secure session
      var isFirstLogin = !!account.firstLogin;
      var session = SessionService.createSession(account.userId, account.role, account.clientId, isFirstLogin);

      logSecurityAudit(account.userId, account.role, "LOGIN_SUCCESS", "SESSION", session.sessionId, "Login successful", metadata);

      // 6. Return safe client descriptor
      return {
        success: true,
        data: {
          token: session.token,
          user: {
            userId: account.userId,
            role: account.role,
            email: account.email,
            name: account.name,
            contactPerson: account.contactPerson || account.name,
            firstLogin: isFirstLogin
          },
          expiresAt: session.expiresAt
        },
        message: isFirstLogin 
          ? "Authentication successful. Password change required." 
          : "Authentication successful."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Changes user password, clears first_login flag, and logs audit event.
   */
  function changePassword(token, currentPassword, newPassword, metadata) {
    var session = SessionService.validateSession(token);
    if (!session || !session.authenticated) {
      return {
        success: false,
        error: { code: "AUTH_UNAUTHORIZED", message: "Active session required to change password." }
      };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var account = findAccountById(session.userId, session.role);
      if (!account) {
        return { success: false, error: { code: "AUTH_INVALID_CREDENTIALS", message: "User account not found." } };
      }

      // 1. Verify current password
      var currentVerified = false;
      if (account.passwordHash && account.passwordSalt) {
        currentVerified = SecurityService.verifyPassword(currentPassword, account.passwordSalt, account.passwordHash);
      } else if (account.legacyPassword) {
        currentVerified = (currentPassword === account.legacyPassword);
      }

      if (!currentVerified) {
        logSecurityAudit(session.userId, session.role, "PASSWORD_CHANGE_FAILED", "USER", session.userId, "Incorrect current password", metadata);
        return {
          success: false,
          error: { code: "AUTH_INVALID_CREDENTIALS", message: "Current password does not match our records." }
        };
      }

      // 2. Validate new password complexity
      var policyCheck = SecurityService.validatePassword(newPassword);
      if (!policyCheck.valid) {
        return {
          success: false,
          error: {
            code: "PASSWORD_POLICY_VIOLATION",
            message: policyCheck.errors.join(" ")
          }
        };
      }

      // 3. Ensure new password is not identical to current
      if (currentPassword === newPassword) {
        return {
          success: false,
          error: {
            code: "PASSWORD_POLICY_VIOLATION",
            message: "New password cannot be identical to the current password."
          }
        };
      }

      // 4. Hash and persist new password
      var newSalt = SecurityService.generateSalt();
      var newHash = SecurityService.hashPassword(newPassword, newSalt);

      updateUserCredentials(account, newHash, newSalt, false, true);
      logSecurityAudit(session.userId, session.role, "PASSWORD_CHANGED", "USER", session.userId, "Password updated successfully", metadata);

      return {
        success: true,
        message: "Password has been successfully updated."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Dispatches a single-use password reset link without revealing whether the email exists.
   */
  function requestPasswordReset(email, metadata) {
    if (!email) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Email address is required." } };
    }

    var normEmail = SecurityService.normalizeEmail(email);
    var account = findAccountByLogin(normEmail);

    if (account && (account.status === "ACTIVE" || account.status === "Active")) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        var ss = getSpreadsheetInstance();
        var resetSheet = ss.getSheetByName("PasswordResets");
        if (resetSheet) {
          var rawResetToken = SecurityService.generateSecureToken();
          var tokenHash = SecurityService.hashToken(rawResetToken);
          var resetId = SecurityService.generateSecureId("RST");
          var createdAt = new Date().toISOString();
          var ttlMs = (CONFIG.RESET.TOKEN_TTL_MINUTES || 30) * 60 * 1000;
          var expiresAt = new Date(new Date().getTime() + ttlMs).toISOString();

          resetSheet.appendRow([
            resetId,
            account.userId,
            tokenHash,
            createdAt,
            expiresAt,
            false,
            ""
          ]);

          logSecurityAudit(account.userId, account.role, "PASSWORD_RESET_REQUESTED", "TOKEN", resetId, "Reset token created", metadata);

          // Centralized notification dispatch
          if (typeof sendEmail === "function") {
            var resetLink = "https://legalsthal.com/portal#reset-password?token=" + rawResetToken;
            sendEmail(account.email, "Legal Sthal Password Reset Instructions",
              "Hello " + account.name + ",\n\n" +
              "A password reset request was initiated for your Legal Sthal account.\n" +
              "Click the link below to set a new password:\n" + resetLink + "\n\n" +
              "This link is single-use and will expire in " + CONFIG.RESET.TOKEN_TTL_MINUTES + " minutes.\n" +
              "If you did not request this reset, please contact support immediately."
            );
          }
        }
      } finally {
        lock.releaseLock();
      }
    }

    // Generic safe response to prevent user enumeration
    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been dispatched."
    };
  }

  /**
   * Resets password using a validated single-use reset token and revokes active user sessions.
   */
  function resetPassword(rawResetToken, newPassword, metadata) {
    if (!rawResetToken || !newPassword) {
      return { success: false, error: { code: "VALIDATION_ERROR", message: "Token and new password are required." } };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var ss = getSpreadsheetInstance();
      var resetSheet = ss.getSheetByName("PasswordResets");
      if (!resetSheet || resetSheet.getLastRow() <= 1) {
        return { success: false, error: { code: "RESET_TOKEN_INVALID", message: "Reset token is invalid or has expired." } };
      }

      var tokenHash = SecurityService.hashToken(rawResetToken);
      var headers = getSheetHeaders(resetSheet);
      var colMap = getColumnIndexMap(headers, "PasswordResets");
      var data = resetSheet.getDataRange().getValues();

      var matchRow = -1;
      var targetUserId = null;
      var now = new Date();

      for (var i = 1; i < data.length; i++) {
        if (SecurityService.secureCompare(data[i][colMap["token_hash"]], tokenHash)) {
          matchRow = i + 1;
          targetUserId = data[i][colMap["user_id"]];

          var used = data[i][colMap["used"]];
          if (used === true || used === "TRUE" || used === 1) {
            return { success: false, error: { code: "RESET_TOKEN_USED", message: "This password reset token has already been used." } };
          }

          var exp = new Date(data[i][colMap["expires_at"]]);
          if (exp <= now) {
            return { success: false, error: { code: "RESET_TOKEN_EXPIRED", message: "This password reset token has expired. Please request a new link." } };
          }
          break;
        }
      }

      if (matchRow === -1 || !targetUserId) {
        return { success: false, error: { code: "RESET_TOKEN_INVALID", message: "Reset token is invalid or has expired." } };
      }

      // Validate new password complexity
      var policyCheck = SecurityService.validatePassword(newPassword);
      if (!policyCheck.valid) {
        return { success: false, error: { code: "PASSWORD_POLICY_VIOLATION", message: policyCheck.errors.join(" ") } };
      }

      // Hash new password and update user account
      var newSalt = SecurityService.generateSalt();
      var newHash = SecurityService.hashPassword(newPassword, newSalt);

      var account = findAccountById(targetUserId, targetUserId.indexOf("ADM") === 0 ? "ADMIN" : "CLIENT");
      if (!account) {
        return { success: false, error: { code: "AUTH_INVALID_CREDENTIALS", message: "Associated account not found." } };
      }

      updateUserCredentials(account, newHash, newSalt, false, true);

      // Invalidate the reset token
      resetSheet.getRange(matchRow, colMap["used"] + 1).setValue(true);
      resetSheet.getRange(matchRow, colMap["used_at"] + 1).setValue(now.toISOString());

      // Invalidate all active sessions for this user
      SessionService.revokeAllUserSessions(targetUserId);

      logSecurityAudit(targetUserId, account.role, "PASSWORD_RESET_COMPLETED", "USER", targetUserId, "Password reset via token", metadata);

      return {
        success: true,
        message: "Password has been successfully reset. Please log in with your new credentials."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * One-time secure administrative bootstrap mechanism to create the initial SUPER_ADMIN user.
   */
  function bootstrapSuperAdmin(bootstrapSecret, adminEmail, adminName, adminPassword, metadata) {
    var storedSecret = CONFIG.getAdminBootstrapSecret();
    if (!storedSecret || !SecurityService.secureCompare(bootstrapSecret, storedSecret)) {
      logSecurityAudit("ANONYMOUS", "PUBLIC", "ADMIN_BOOTSTRAP_REJECTED", "SECURITY", "SYSTEM", "Invalid bootstrap secret", metadata);
      return { success: false, error: { code: "AUTH_FORBIDDEN", message: "Invalid bootstrap secret." } };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var ss = getSpreadsheetInstance();
      var adminSheet = ss.getSheetByName("AdminUsers");
      if (!adminSheet) {
        throw new Error("AdminUsers sheet not found. Please run database setup.");
      }

      // Check if an active SUPER_ADMIN already exists
      var headers = getSheetHeaders(adminSheet);
      var colMap = getColumnIndexMap(headers, "AdminUsers");
      var data = adminSheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colMap["role"]]).toUpperCase() === "SUPER_ADMIN" &&
            String(data[i][colMap["status"]]).toUpperCase() === "ACTIVE") {
          return {
            success: false,
            error: {
              code: "ADMIN_ALREADY_BOOTSTRAPPED",
              message: "A SUPER_ADMIN user already exists. Additional administrators must be created by an existing administrator."
            }
          };
        }
      }

      // Validate password policy
      var policyCheck = SecurityService.validatePassword(adminPassword);
      if (!policyCheck.valid) {
        return { success: false, error: { code: "PASSWORD_POLICY_VIOLATION", message: policyCheck.errors.join(" ") } };
      }

      var normEmail = SecurityService.normalizeEmail(adminEmail);
      var adminId = "ADM" + padZero(adminSheet.getLastRow(), 3);
      var salt = SecurityService.generateSalt();
      var hash = SecurityService.hashPassword(adminPassword, salt);
      var now = new Date().toISOString();

      adminSheet.appendRow([
        adminId,
        adminName || "Super Administrator",
        normEmail,
        hash,
        salt,
        "SUPER_ADMIN",
        "ACTIVE",
        0,
        "",
        "",
        now,
        now
      ]);

      // Invalidate the bootstrap secret to prevent reuse
      CONFIG.setScriptProperty("ADMIN_BOOTSTRAPPED", "true");
      logSecurityAudit(adminId, "SUPER_ADMIN", "ADMIN_BOOTSTRAPPED", "USER", adminId, "Super admin account bootstrapped", metadata);

      return {
        success: true,
        data: {
          adminId: adminId,
          email: normEmail,
          role: "SUPER_ADMIN"
        },
        message: "SUPER_ADMIN account created successfully."
      };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Helper to find user account in Clients or AdminUsers by normalized login ID or email.
   */
  function findAccountByLogin(normalizedLogin) {
    var ss = getSpreadsheetInstance();

    // 1. Search AdminUsers
    var adminSheet = ss.getSheetByName("AdminUsers");
    if (adminSheet && adminSheet.getLastRow() > 1) {
      var aHeaders = getSheetHeaders(adminSheet);
      var aMap = getColumnIndexMap(aHeaders, "AdminUsers");
      var aData = adminSheet.getDataRange().getValues();

      for (var i = 1; i < aData.length; i++) {
        var aEmail = SecurityService.normalizeEmail(aData[i][aMap["email"]]);
        if (aEmail === normalizedLogin) {
          return {
            rowNum: i + 1,
            sheetName: "AdminUsers",
            userId: aData[i][aMap["admin_id"]],
            role: String(aData[i][aMap["role"]] || "ADMIN").toUpperCase(),
            clientId: null,
            name: aData[i][aMap["name"]],
            email: aEmail,
            passwordHash: aData[i][aMap["password_hash"]],
            passwordSalt: aData[i][aMap["password_salt"]],
            legacyPassword: null,
            firstLogin: false,
            status: aData[i][aMap["status"]],
            failedAttempts: parseInt(aData[i][aMap["failed_attempts"]] || 0, 10),
            lockedUntil: aData[i][aMap["locked_until"]]
          };
        }
      }
    }

    // 2. Search Clients
    var clientSheet = ss.getSheetByName("Clients");
    if (clientSheet && clientSheet.getLastRow() > 1) {
      var cHeaders = getSheetHeaders(clientSheet);
      var cMap = getColumnIndexMap(cHeaders, "Clients");
      var cData = clientSheet.getDataRange().getValues();

      for (var j = 1; j < cData.length; j++) {
        var cEmail = SecurityService.normalizeEmail(cData[j][cMap["email"]]);
        var cLoginId = cMap["login_id"] !== undefined ? SecurityService.normalizeEmail(cData[j][cMap["login_id"]]) : "";

        if (cEmail === normalizedLogin || (cLoginId && cLoginId === normalizedLogin)) {
          var firstLoginVal = cData[j][cMap["first_login"]];
          var isFirstLogin = (firstLoginVal === true || firstLoginVal === "TRUE" || firstLoginVal === 1);

          return {
            rowNum: j + 1,
            sheetName: "Clients",
            userId: cData[j][cMap["client_id"]],
            role: "CLIENT",
            clientId: cData[j][cMap["client_id"]],
            name: cData[j][cMap["name"]] || cData[j][cMap["company name"]],
            contactPerson: cData[j][cMap["contact_name"]] || cData[j][cMap["contact person"]],
            email: cEmail,
            passwordHash: cData[j][cMap["password_hash"]],
            passwordSalt: cData[j][cMap["password_salt"]],
            legacyPassword: cMap["password"] !== undefined ? cData[j][cMap["password"]] : null,
            firstLogin: isFirstLogin,
            status: cData[j][cMap["status"]],
            failedAttempts: parseInt(cData[j][cMap["failed_attempts"]] || 0, 10),
            lockedUntil: cData[j][cMap["locked_until"]]
          };
        }
      }
    }

    return null;
  }

  /**
   * Helper to find user account by primary key ID.
   */
  function findAccountById(userId, roleHint) {
    var ss = getSpreadsheetInstance();

    if (roleHint === "CLIENT" || userId.indexOf("CL") === 0) {
      var clientSheet = ss.getSheetByName("Clients");
      if (!clientSheet || clientSheet.getLastRow() <= 1) return null;
      var cHeaders = getSheetHeaders(clientSheet);
      var cMap = getColumnIndexMap(cHeaders, "Clients");
      var cData = clientSheet.getDataRange().getValues();

      for (var i = 1; i < cData.length; i++) {
        if (cData[i][cMap["client_id"]] === userId) {
          return {
            rowNum: i + 1,
            sheetName: "Clients",
            userId: userId,
            role: "CLIENT",
            clientId: userId,
            name: cData[i][cMap["name"]] || cData[i][cMap["company name"]],
            email: SecurityService.normalizeEmail(cData[i][cMap["email"]]),
            passwordHash: cData[i][cMap["password_hash"]],
            passwordSalt: cData[i][cMap["password_salt"]],
            legacyPassword: (cMap["password"] !== undefined ? cData[i][cMap["password"]] : (cMap["legacy_password"] !== undefined ? cData[i][cMap["legacy_password"]] : null)),
            firstLogin: (cData[i][cMap["first_login"]] === true || cData[i][cMap["first_login"]] === "TRUE"),
            status: cData[i][cMap["status"]]
          };
        }
      }
    } else {
      var adminSheet = ss.getSheetByName("AdminUsers");
      if (!adminSheet || adminSheet.getLastRow() <= 1) return null;
      var aHeaders = getSheetHeaders(adminSheet);
      var aMap = getColumnIndexMap(aHeaders, "AdminUsers");
      var aData = adminSheet.getDataRange().getValues();

      for (var j = 1; j < aData.length; j++) {
        if (aData[j][aMap["admin_id"]] === userId) {
          return {
            rowNum: j + 1,
            sheetName: "AdminUsers",
            userId: userId,
            role: String(aData[j][aMap["role"]] || "ADMIN").toUpperCase(),
            clientId: null,
            name: aData[j][aMap["name"]],
            email: SecurityService.normalizeEmail(aData[j][aMap["email"]]),
            passwordHash: aData[j][aMap["password_hash"]],
            passwordSalt: aData[j][aMap["password_salt"]],
            status: aData[j][aMap["status"]]
          };
        }
      }
    }
    return null;
  }

  function recordFailedAttempt(account, count) {
    var ss = getSpreadsheetInstance();
    var sheet = ss.getSheetByName(account.sheetName);
    var colMap = getColumnIndexMap(getSheetHeaders(sheet), account.sheetName);
    sheet.getRange(account.rowNum, colMap["failed_attempts"] + 1).setValue(count);
  }

  function recordAccountLockout(account, count, lockedUntil) {
    var ss = getSpreadsheetInstance();
    var sheet = ss.getSheetByName(account.sheetName);
    var colMap = getColumnIndexMap(getSheetHeaders(sheet), account.sheetName);
    sheet.getRange(account.rowNum, colMap["failed_attempts"] + 1).setValue(count);
    sheet.getRange(account.rowNum, colMap["locked_until"] + 1).setValue(lockedUntil);
  }

  function resetFailedAttempts(account, lastLoginIso) {
    var ss = getSpreadsheetInstance();
    var sheet = ss.getSheetByName(account.sheetName);
    var colMap = getColumnIndexMap(getSheetHeaders(sheet), account.sheetName);
    sheet.getRange(account.rowNum, colMap["failed_attempts"] + 1).setValue(0);
    sheet.getRange(account.rowNum, colMap["locked_until"] + 1).setValue("");
    if (colMap["last_login"] !== undefined) {
      sheet.getRange(account.rowNum, colMap["last_login"] + 1).setValue(lastLoginIso);
    }
  }

  function updateUserCredentials(account, hash, salt, firstLogin, wipeLegacy) {
    var ss = getSpreadsheetInstance();
    var sheet = ss.getSheetByName(account.sheetName);
    var colMap = getColumnIndexMap(getSheetHeaders(sheet), account.sheetName);
    var row = account.rowNum;

    if (colMap["password_hash"] !== undefined) sheet.getRange(row, colMap["password_hash"] + 1).setValue(hash);
    if (colMap["password_salt"] !== undefined) sheet.getRange(row, colMap["password_salt"] + 1).setValue(salt);
    if (colMap["first_login"] !== undefined) sheet.getRange(row, colMap["first_login"] + 1).setValue(firstLogin);
    if (colMap["password_changed_at"] !== undefined) sheet.getRange(row, colMap["password_changed_at"] + 1).setValue(new Date().toISOString());

    // Permanently wipe legacy plaintext column if present
    if (wipeLegacy) {
      if (colMap["password"] !== undefined) {
        sheet.getRange(row, colMap["password"] + 1).setValue("");
      }
      if (colMap["legacy_password"] !== undefined) {
        sheet.getRange(row, colMap["legacy_password"] + 1).setValue("");
      }
    }
  }

  /**
   * Centralized security audit logger.
   * Ensures zero leakage of passwords, hashes, salts, or session tokens.
   */
  function logSecurityAudit(actorId, actorRole, action, entityType, entityId, details, metadata) {
    try {
      var ss = getSpreadsheetInstance();
      var sheet = ss.getSheetByName("AuditLogs");
      if (!sheet) return;

      var safeDetails = typeof details === "object" ? JSON.stringify(details) : String(details || "");
      var safeMeta = metadata ? (typeof metadata === "object" ? JSON.stringify(metadata) : String(metadata)) : "Apps Script Engine";

      // Filter out any accidental token or password strings
      safeDetails = safeDetails.replace(/password[^,]*[:=][^,]*/gi, "[REDACTED]")
                               .replace(/token[^,]*[:=][^,]*/gi, "[REDACTED]");

      var headers = getSheetHeaders(sheet);
      var colMap = getColumnIndexMap(headers, "AuditLogs");
      var row = new Array(headers.length);
      for (var i = 0; i < row.length; i++) row[i] = "";

      row[colMap["log_id"]] = SecurityService.generateSecureId("LOG");
      row[colMap["timestamp"]] = new Date().toISOString();
      row[colMap["actor_id"]] = actorId || "SYSTEM";
      row[colMap["actor_role"]] = actorRole || "PUBLIC";
      row[colMap["action"]] = action;
      row[colMap["entity_type"]] = entityType || "SECURITY";
      row[colMap["entity_id"]] = entityId || "SYSTEM";
      row[colMap["ip_or_metadata"]] = safeMeta;
      row[colMap["details"]] = safeDetails;

      sheet.appendRow(row);
    } catch (e) {
      Logger.log("[AUDIT LOG ERROR] " + e.toString());
    }
  }

  return {
    login: login,
    changePassword: changePassword,
    requestPasswordReset: requestPasswordReset,
    resetPassword: resetPassword,
    bootstrapSuperAdmin: bootstrapSuperAdmin,
    logSecurityAudit: logSecurityAudit
  };
})();
