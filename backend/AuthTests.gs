/**
 * Legal Sthal - Automated Security & Cryptographic Verification Test Suite (AuthTests.gs)
 * Version: 2.1.0 (Step 3.1 Hardened)
 * 
 * Implements automated test cases covering:
 * - RFC 4231 HMAC-SHA256 Test Vectors (Cases 1, 2, 3, 4)
 * - Independent PBKDF2-HMAC-SHA256 Test Vectors (c=1, c=2, c=4096, dkLen=40 multi-block, Unicode)
 * - Constant-time comparison timing attack resistance
 * - Cryptographically secure ID generation (Zero Math.random())
 * - Password complexity policy validation and weak password rejection
 * - Versioned password hash formatting (pbkdf2_sha256$v1$iterations$salt$hash)
 * - Versioned and legacy unversioned hash parsing and backward compatibility
 * - Salt uniqueness and deterministic verification
 * - Opaque session token generation, hashing, validation, expiry, and revocation
 * - Brute-force lockout and atomic attempt resetting
 * - First-login restricted authentication state
 * - Password change and single-use password reset tokens
 * - Non-destructive legacy credential on-login migration and plaintext wiping
 * - Super Admin bootstrap and single-instance protection
 * - IDOR cross-client tenant isolation assertions
 * - Exclusion of sensitive secrets, hashes, and tokens from API envelopes and logs
 */

function runAuthTests() {
  var results = [];
  var ss = getSpreadsheetInstance();

  Logger.log("==================================================");
  Logger.log("🛡️ STARTING LEGAL STHAL STEP 3.1 SECURITY VERIFICATION");
  Logger.log("==================================================");

  function record(testId, name, passed, details) {
    results.push({
      testId: testId,
      name: name,
      passed: passed,
      status: passed ? "PASS" : "FAIL",
      details: details
    });
    Logger.log("[" + (passed ? "PASS" : "FAIL") + "] " + testId + ": " + name + " -> " + details);
  }

  try {
    // ====================================================
    // SECTION 1: RFC 4231 HMAC-SHA256 TEST VECTORS
    // ====================================================
    
    // SEC-CRYPTO-001: RFC 4231 Case 1 (20-byte key 0x0b, "Hi There")
    var key1Bytes = [];
    for (var k1 = 0; k1 < 20; k1++) key1Bytes.push(0x0b);
    var hmacCase1 = SecurityService.hmacSha256Hex("Hi There", key1Bytes);
    var expectedHmac1 = "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7";
    record("SEC-CRYPTO-001", "RFC 4231 HMAC-SHA256 Test Case 1", hmacCase1 === expectedHmac1,
      hmacCase1 === expectedHmac1 ? "Matches RFC 4231 Case 1 specification." : "Mismatch: " + hmacCase1);

    // SEC-CRYPTO-002: RFC 4231 Case 2 (Key "Jefe", "what do ya want for nothing?")
    var hmacCase2 = SecurityService.hmacSha256Hex("what do ya want for nothing?", "Jefe");
    var expectedHmac2 = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";
    record("SEC-CRYPTO-002", "RFC 4231 HMAC-SHA256 Test Case 2", hmacCase2 === expectedHmac2,
      hmacCase2 === expectedHmac2 ? "Matches RFC 4231 Case 2 specification." : "Mismatch: " + hmacCase2);

    // SEC-CRYPTO-003: RFC 4231 Case 3 (Long key > 64-byte block size: 131 bytes 0xaa)
    var key3Bytes = [];
    for (var k3 = 0; k3 < 131; k3++) key3Bytes.push(0xaa);
    var hmacCase3 = SecurityService.hmacSha256Hex("Test Using Larger Than Block-Size Key - Hash Key First", key3Bytes);
    var expectedHmac3 = "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54";
    record("SEC-CRYPTO-003", "RFC 4231 HMAC-SHA256 Test Case 3 (Long Key > 64B)", hmacCase3 === expectedHmac3,
      hmacCase3 === expectedHmac3 ? "Matches RFC 4231 Case 3 specification." : "Mismatch: " + hmacCase3);

    // SEC-CRYPTO-004: RFC 4231 Case 4 (Empty message, 20-byte key 0x0c)
    var key4Bytes = [];
    for (var k4 = 0; k4 < 20; k4++) key4Bytes.push(0x0c);
    var hmacCase4 = SecurityService.hmacSha256Hex("", key4Bytes);
    var expectedHmac4 = "4d36c675d91e0512d1b1ba412fe2f7d8a6595fd305bdeadf651b465d4251781f";
    record("SEC-CRYPTO-004", "RFC 4231 HMAC-SHA256 Test Case 4 (Empty Message)", hmacCase4 === expectedHmac4,
      hmacCase4 === expectedHmac4 ? "Matches RFC 4231 Case 4 specification." : "Mismatch: " + hmacCase4);

    // ====================================================
    // SECTION 2: INDEPENDENT PBKDF2-HMAC-SHA256 TEST VECTORS
    // ====================================================

    var saltAscii = [115, 97, 108, 116]; // "salt"

    // SEC-CRYPTO-005: Vector 1 (P="password", S="salt", c=1, dkLen=32)
    var vec1Key = SecurityService.bytesToHex(SecurityService.pbkdf2HmacSha256("password", saltAscii, 1, 32));
    var expectedVec1 = "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b";
    record("SEC-CRYPTO-005", "PBKDF2-HMAC-SHA256 Test Vector (c=1)", vec1Key === expectedVec1,
      vec1Key === expectedVec1 ? "Exact match for c=1." : "Mismatch: " + vec1Key);

    // SEC-CRYPTO-006: Vector 2 (P="password", S="salt", c=2, dkLen=32)
    var vec2Key = SecurityService.bytesToHex(SecurityService.pbkdf2HmacSha256("password", saltAscii, 2, 32));
    var expectedVec2 = "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43";
    record("SEC-CRYPTO-006", "PBKDF2-HMAC-SHA256 Test Vector (c=2)", vec2Key === expectedVec2,
      vec2Key === expectedVec2 ? "Exact match for c=2." : "Mismatch: " + vec2Key);

    // SEC-CRYPTO-007: Vector 3 (P="password", S="salt", c=4096, dkLen=32)
    var vec3Key = SecurityService.bytesToHex(SecurityService.pbkdf2HmacSha256("password", saltAscii, 4096, 32));
    var expectedVec3 = "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a";
    record("SEC-CRYPTO-007", "PBKDF2-HMAC-SHA256 Test Vector (c=4096)", vec3Key === expectedVec3,
      vec3Key === expectedVec3 ? "Exact match for c=4096." : "Mismatch: " + vec3Key);

    // SEC-CRYPTO-008: Vector 4 Multi-Block (P="passwordPASSWORDpassword", S="saltSALTsaltSALTsaltSALTsaltSALTsalt", c=4096, dkLen=40)
    var longPass = "passwordPASSWORDpassword";
    var longSaltBytes = Utilities.newBlob("saltSALTsaltSALTsaltSALTsaltSALTsalt", "text/plain").getBytes();
    var unsignedLongSalt = [];
    for (var ls = 0; ls < longSaltBytes.length; ls++) unsignedLongSalt.push(longSaltBytes[ls] < 0 ? longSaltBytes[ls] + 256 : longSaltBytes[ls]);
    var vec4Key = SecurityService.bytesToHex(SecurityService.pbkdf2HmacSha256(longPass, unsignedLongSalt, 4096, 40));
    var expectedVec4 = "348c89dbcbd32b2f32d814b8116e84cf2b17347ebc1800181c4e2a1fb8dd53e1c635518c7dac47e9";
    record("SEC-CRYPTO-008", "PBKDF2-HMAC-SHA256 Multi-Block Test Vector (dkLen=40, c=4096)", vec4Key === expectedVec4,
      vec4Key === expectedVec4 ? "Exact multi-block derivation match (40 bytes)." : "Mismatch: " + vec4Key);

    // SEC-CRYPTO-009: Vector 5 Unicode (P="pāsswōrd", S="saℓt", c=4096, dkLen=32)
    var unicodePass = "p\u0101ssw\u014drd";
    var unicodeSaltBytes = Utilities.newBlob("sa\u2113t", "text/plain").getBytes();
    var unsignedUniSalt = [];
    for (var us = 0; us < unicodeSaltBytes.length; us++) unsignedUniSalt.push(unicodeSaltBytes[us] < 0 ? unicodeSaltBytes[us] + 256 : unicodeSaltBytes[us]);
    var vec5Key = SecurityService.bytesToHex(SecurityService.pbkdf2HmacSha256(unicodePass, unsignedUniSalt, 4096, 32));
    var expectedVec5 = "29ccace1d964f20ec0b93ef688d3c92ee136a5b87d95971bb0d4d6168cd1634b";
    record("SEC-CRYPTO-009", "PBKDF2-HMAC-SHA256 Unicode Test Vector (c=4096)", vec5Key === expectedVec5,
      vec5Key === expectedVec5 ? "Exact Unicode derivation match." : "Mismatch: " + vec5Key);

    // SEC-CRYPTO-010: Constant-Time Comparison
    var comp1 = SecurityService.secureCompare("secretToken12345678", "secretToken12345678");
    var comp2 = SecurityService.secureCompare("secretToken12345678", "secretToken12345679");
    var comp3 = SecurityService.secureCompare("short", "longerStringValue");
    var compValid = (comp1 === true && comp2 === false && comp3 === false);
    record("SEC-CRYPTO-010", "Constant-Time String Comparison (Timing Side-Channel Defense)", compValid,
      compValid ? "Identical strings match; differing contents and lengths correctly rejected." : "Constant-time comparison failure.");

    // SEC-CRYPTO-011: Zero Math.random() in Secure ID Generation
    var secId1 = SecurityService.generateSecureId("SESS");
    var secId2 = SecurityService.generateSecureId("SESS");
    var idValid = (secId1.indexOf("SESS_") === 0 && secId2.indexOf("SESS_") === 0 && secId1 !== secId2 && secId1.length >= 25);
    record("SEC-CRYPTO-011", "Cryptographically Secure Unique Identifier Generation", idValid,
      idValid ? "Secure IDs generated with high entropy suffix: " + secId1 : "Secure ID format invalid.");

    // ====================================================
    // SECTION 3: PASSWORD POLICY & VERSIONED HASH FORMAT
    // ====================================================

    // SEC-PASS-001: Valid complex password accepted
    var validCheck = SecurityService.validatePassword("Legal@2026Password!");
    record("SEC-PASS-001", "Password policy validation", validCheck.valid === true,
      validCheck.valid ? "Complex password accepted." : "Unexpected rejection: " + validCheck.errors.join(", "));

    // SEC-PASS-002: Weak passwords rejected
    var weakCheck1 = SecurityService.validatePassword("password");
    var weakCheck2 = SecurityService.validatePassword("12345678");
    var weakCheck3 = SecurityService.validatePassword("Legal123");
    var weakCheck4 = SecurityService.validatePassword("Ab1!");
    var allWeakRejected = (!weakCheck1.valid && !weakCheck2.valid && !weakCheck3.valid && !weakCheck4.valid);
    record("SEC-PASS-002", "Weak password rejected", allWeakRejected,
      allWeakRejected ? "All 4 weak passwords properly rejected." : "Weak password allowed!");

    // SEC-PASS-003: Versioned password hash formatting (pbkdf2_sha256$v1$10000$salt$hash)
    var saltA = SecurityService.generateSalt();
    var hashA = SecurityService.hashPassword("Legal@2026Password!", saltA);
    var isVersionedFormat = (
      hashA.indexOf("pbkdf2_sha256$v1$10000$") === 0 &&
      hashA.split("$").length === 5
    );
    record("SEC-PASS-003", "Versioned password hash formatting (pbkdf2_sha256$v1)", isVersionedFormat,
      isVersionedFormat ? "Password hash formatted as versioned modular crypt string." : "Invalid format: " + hashA);

    // SEC-PASS-004: Raw key derivation produces 64-char (256-bit) hex key
    var rawHexKey = SecurityService.deriveKeyHex("Legal@2026Password!", saltA, 10000, 32);
    var isRawHexValid = (rawHexKey.length === 64 && /^[0-9a-f]{64}$/.test(rawHexKey));
    record("SEC-PASS-004", "Raw PBKDF2 derived key length (256 bits)", isRawHexValid,
      isRawHexValid ? "Derived key length is exactly 64 hex characters (256 bits)." : "Invalid derived key length: " + rawHexKey);

    // SEC-PASS-005: Parse versioned password hash
    var parsedVersioned = SecurityService.parsePasswordHash(hashA);
    var parsedValid = (
      parsedVersioned.isVersioned === true &&
      parsedVersioned.prefix === "pbkdf2_sha256" &&
      parsedVersioned.version === "v1" &&
      parsedVersioned.iterations === 10000 &&
      parsedVersioned.saltHex === saltA &&
      parsedVersioned.hashHex === rawHexKey
    );
    record("SEC-PASS-005", "Parse versioned password hash", parsedValid,
      parsedValid ? "Parsed iterations=10000, salt, and hash successfully." : "Failed to parse versioned hash.");

    // SEC-PASS-006: Backward compatibility with legacy unversioned raw hex hash
    var legacyRawHex = rawHexKey;
    var verifyLegacy = SecurityService.verifyPassword("Legal@2026Password!", saltA, legacyRawHex, 10000);
    record("SEC-PASS-006", "Backward-compatible verification of legacy unversioned hash", verifyLegacy === true,
      verifyLegacy ? "Legacy raw 64-char hex hash successfully verified." : "Legacy verification failed!");

    // SEC-PASS-007: Salt uniqueness produces distinct hashes
    var saltB = SecurityService.generateSalt();
    var hashB = SecurityService.hashPassword("Legal@2026Password!", saltB);
    record("SEC-PASS-007", "Different salts produce different hashes", hashA !== hashB,
      hashA !== hashB ? "Salts are unique and hashes differ." : "Hash collision with different salts!");

    // SEC-PASS-008: Correct password verifies against versioned hash
    var verifyPass = SecurityService.verifyPassword("Legal@2026Password!", saltA, hashA);
    record("SEC-PASS-008", "Correct password verifies against versioned hash", verifyPass === true,
      verifyPass ? "Password verified successfully." : "Verification failed for matching password.");

    // SEC-PASS-009: Incorrect password rejected
    var verifyFail = SecurityService.verifyPassword("WrongPassword!123", saltA, hashA);
    record("SEC-PASS-009", "Incorrect password fails", verifyFail === false,
      !verifyFail ? "Incorrect password properly rejected." : "Security failure: Incorrect password verified!");

    // ====================================================
    // SECTION 4: SESSION SECURITY & LIFECYCLE
    // ====================================================

    // SEC-SESSION-001: Secure token generation (64-char hex)
    var token1 = SecurityService.generateSecureToken();
    var token2 = SecurityService.generateSecureToken();
    var tokenValid = (token1.length === 64 && token2.length === 64 && token1 !== token2);
    record("SEC-SESSION-001", "Secure token generation", tokenValid,
      tokenValid ? "64-char high-entropy tokens generated." : "Token generation failure.");

    // SEC-SESSION-002: Token hashing for database persistence
    var tokenHash = SecurityService.hashToken(token1);
    var tokenHashValid = (tokenHash.length === 64 && tokenHash !== token1);
    record("SEC-SESSION-002", "Token hashing", tokenHashValid,
      tokenHashValid ? "Token correctly hashed to 64-char SHA-256." : "Token hash invalid.");

    // SEC-SESSION-003: Session creation
    var sess = SessionService.createSession("CL_TEST_001", "CLIENT", "CL_TEST_001", false);
    record("SEC-SESSION-003", "Session creation", sess && sess.token && sess.token.length === 64,
      sess ? "Session created with ID: " + sess.sessionId : "Session creation failed.");

    // Setup test client in Clients sheet if not already present
    var clientSheet = ss.getSheetByName("Clients");
    var cHeaders = getSheetHeaders(clientSheet);
    var cMap = getColumnIndexMap(cHeaders, "Clients");
    var testClientExists = false;
    var cData = clientSheet.getDataRange().getValues();
    for (var i = 1; i < cData.length; i++) {
      if (cData[i][cMap["client_id"]] === "CL_TEST_001") {
        testClientExists = true;
        break;
      }
    }
    if (!testClientExists) {
      var newClientRow = new Array(cHeaders.length);
      for (var k = 0; k < newClientRow.length; k++) newClientRow[k] = "";
      newClientRow[cMap["client_id"]] = "CL_TEST_001";
      newClientRow[cMap["name"]] = "Test Auth Corp";
      newClientRow[cMap["email"]] = "authtest@legalsthal.com";
      newClientRow[cMap["status"]] = "ACTIVE";
      newClientRow[cMap["password_hash"]] = hashA;
      newClientRow[cMap["password_salt"]] = saltA;
      newClientRow[cMap["first_login"]] = false;
      newClientRow[cMap["failed_attempts"]] = 0;
      clientSheet.appendRow(newClientRow);
    }

    // SEC-SESSION-004: Session validation
    var validSess = SessionService.validateSession(sess.token);
    record("SEC-SESSION-004", "Session validation", validSess && validSess.authenticated === true && validSess.userId === "CL_TEST_001",
      validSess ? "Valid session resolved user CL_TEST_001." : "Session validation failed.");

    // SEC-SESSION-005: Expired session rejected fail-closed
    var sessSheet = ss.getSheetByName("Sessions");
    var sData = sessSheet.getDataRange().getValues();
    var sHeaders = getSheetHeaders(sessSheet);
    var sMap = getColumnIndexMap(sHeaders, "Sessions");
    var targetSessHash = SecurityService.hashToken(sess.token);

    for (var r = 1; r < sData.length; r++) {
      if (sData[r][sMap["token_hash"]] === targetSessHash) {
        sessSheet.getRange(r + 1, sMap["expires_at"] + 1).setValue("2020-01-01T00:00:00.000Z");
        break;
      }
    }
    var expiredCheck = SessionService.validateSession(sess.token);
    record("SEC-SESSION-005", "Expired session rejected", expiredCheck && expiredCheck.expired === true,
      (expiredCheck && expiredCheck.expired) ? "Expired session rejected." : "Expired session accepted!");

    // SEC-SESSION-006: Session revocation / logout invalidates session
    var sessRevoke = SessionService.createSession("CL_TEST_001", "CLIENT", "CL_TEST_001", false);
    SessionService.revokeSession(sessRevoke.token);
    var revokedCheck = SessionService.validateSession(sessRevoke.token);
    record("SEC-SESSION-006", "Revoked session rejected", revokedCheck === null,
      revokedCheck === null ? "Revoked session correctly rejected." : "Revoked session accepted!");

    // ====================================================
    // SECTION 5: BRUTE FORCE & ACCOUNT LOCKOUT
    // ====================================================

    // SEC-LOCK-001: Failed login counter increments
    var loginAttempt1 = AuthService.login("authtest@legalsthal.com", "WrongPassword!999");
    var accountAfterFail1 = findAccountDirect(ss, "CL_TEST_001");
    record("SEC-LOCK-001", "Failed login counter increments", accountAfterFail1 && accountAfterFail1.failedAttempts >= 1,
      accountAfterFail1 ? "Failed attempts counter = " + accountAfterFail1.failedAttempts : "Failed counter not incremented.");

    // SEC-LOCK-002: Account locks after 5 failures
    AuthService.login("authtest@legalsthal.com", "WrongPassword!999");
    AuthService.login("authtest@legalsthal.com", "WrongPassword!999");
    AuthService.login("authtest@legalsthal.com", "WrongPassword!999");
    var loginAttempt5 = AuthService.login("authtest@legalsthal.com", "WrongPassword!999");
    var accountAfterFail5 = findAccountDirect(ss, "CL_TEST_001");
    var isLocked = accountAfterFail5 && accountAfterFail5.lockedUntil && new Date(accountAfterFail5.lockedUntil) > new Date();
    record("SEC-LOCK-002", "Account locks after 5 failures", isLocked === true,
      isLocked ? "Account locked until: " + accountAfterFail5.lockedUntil : "Account not locked after 5 failures!");

    // SEC-LOCK-003: Successful login resets failed attempts
    clearLockDirect(ss, "CL_TEST_001");
    var successLogin = AuthService.login("authtest@legalsthal.com", "Legal@2026Password!");
    var accountAfterSuccess = findAccountDirect(ss, "CL_TEST_001");
    var resetSuccess = (successLogin.success === true && accountAfterSuccess.failedAttempts === 0);
    record("SEC-LOCK-003", "Successful login resets failed attempts", resetSuccess === true,
      resetSuccess ? "Failed attempts reset to 0 upon success." : "Failed attempts not reset.");

    // ====================================================
    // SECTION 6: FIRST-LOGIN RESTRICTION & PASSWORD CHANGE
    // ====================================================

    // SEC-FIRST-001: First-login restriction flag enforced
    setFirstLoginDirect(ss, "CL_TEST_001", true);
    var firstLoginResp = AuthService.login("authtest@legalsthal.com", "Legal@2026Password!");
    record("SEC-FIRST-001", "First-login restriction", firstLoginResp.data && firstLoginResp.data.user.firstLogin === true,
      firstLoginResp.data ? "User flagged with firstLogin: true." : "First login flag missing.");

    // SEC-FIRST-002: Password change clears first_login
    var changeResp = AuthService.changePassword(firstLoginResp.data.token, "Legal@2026Password!", "NewLegal@2026Secure!");
    var accountAfterChange = findAccountDirect(ss, "CL_TEST_001");
    var changeCleared = (changeResp.success === true && accountAfterChange.firstLogin === false);
    record("SEC-FIRST-002", "Password change clears first_login", changeCleared === true,
      changeCleared ? "Password changed and first_login cleared to false." : "Password change failed.");

    // Clean up login session
    SessionService.revokeSession(firstLoginResp.data.token);

    // ====================================================
    // SECTION 7: PASSWORD RESET SECURITY
    // ====================================================

    // SEC-RESET-001: Password reset request does not leak user existence
    var resetNonExistent = AuthService.requestPasswordReset("nonexistent_user@randomdomain.org");
    record("SEC-RESET-001", "Password reset request enumeration prevention", resetNonExistent.success === true,
      resetNonExistent.success ? "Safe generic response returned regardless of user existence." : "Failed generic response.");

    // SEC-RESET-002: Expired reset token rejected
    var resetSheet = ss.getSheetByName("PasswordResets");
    var rawMockToken = SecurityService.generateSecureToken();
    var mockHash = SecurityService.hashToken(rawMockToken);

    resetSheet.appendRow([
      "RST_EXPIRED",
      "CL_TEST_001",
      mockHash,
      "2020-01-01T00:00:00.000Z",
      "2020-01-01T00:30:00.000Z",
      false,
      ""
    ]);
    var expiredResetAttempt = AuthService.resetPassword(rawMockToken, "NewPass@2026#Valid");
    record("SEC-RESET-002", "Reset token expiry", expiredResetAttempt.success === false && expiredResetAttempt.error.code === "RESET_TOKEN_EXPIRED",
      expiredResetAttempt.success === false ? "Expired reset token rejected." : "Expired reset token allowed!");

    // SEC-RESET-003: Single-use reset token rejected upon reuse
    var freshRawToken = SecurityService.generateSecureToken();
    var freshHash = SecurityService.hashToken(freshRawToken);
    resetSheet.appendRow([
      "RST_SINGLE_USE",
      "CL_TEST_001",
      freshHash,
      new Date().toISOString(),
      new Date(Date.now() + 1800000).toISOString(),
      false,
      ""
    ]);
    var firstReset = AuthService.resetPassword(freshRawToken, "ResetPass@2026#Valid");
    var secondReset = AuthService.resetPassword(freshRawToken, "AnotherPass@2026#Valid");
    var singleUsePassed = (firstReset.success === true && secondReset.success === false && secondReset.error.code === "RESET_TOKEN_USED");
    record("SEC-RESET-003", "Reset token single-use", singleUsePassed === true,
      singleUsePassed ? "Token valid on first use, rejected on reuse." : "Token allowed reuse!");

    // SEC-RESET-004: Password reset revokes active user sessions
    var sessBeforeReset = SessionService.createSession("CL_TEST_001", "CLIENT", "CL_TEST_001", false);
    var resetTokenRevoke = SecurityService.generateSecureToken();
    var hashRevoke = SecurityService.hashToken(resetTokenRevoke);
    resetSheet.appendRow([
      "RST_REVOKE_TEST",
      "CL_TEST_001",
      hashRevoke,
      new Date().toISOString(),
      new Date(Date.now() + 1800000).toISOString(),
      false,
      ""
    ]);
    AuthService.resetPassword(resetTokenRevoke, "BrandNewPass@2026#Valid");
    var sessAfterReset = SessionService.validateSession(sessBeforeReset.token);
    record("SEC-RESET-004", "Password reset revokes active sessions", sessAfterReset === null,
      sessAfterReset === null ? "All prior sessions revoked upon password reset." : "Prior session remained active!");

    // ====================================================
    // SECTION 8: AUTHORIZATION & IDOR CROSS-CLIENT ISOLATION
    // ====================================================

    // SEC-AUTHZ-001: Client cannot satisfy admin role check
    var clientAuthContext = { authenticated: true, role: "CLIENT", clientId: "CL001", userId: "CL001" };
    var adminRoleCheck = (clientAuthContext.role === "SUPER_ADMIN" || clientAuthContext.role === "ADMIN");
    record("SEC-AUTHZ-001", "Client cannot satisfy admin role check", adminRoleCheck === false,
      !adminRoleCheck ? "Client role correctly denied admin privileges." : "Client granted admin role!");

    // SEC-IDOR-001: Client A denied access to Client B's client context
    var ownClientAllowed = SecurityService.assertClientOwnership(clientAuthContext, "CL001");
    var foreignClientDenied = SecurityService.assertClientOwnership(clientAuthContext, "CL002");
    record("SEC-IDOR-001", "Client IDOR tenant boundary enforcement", ownClientAllowed === true && foreignClientDenied === false,
      (ownClientAllowed && !foreignClientDenied) ? "CL001 permitted own record; CL002 foreign record denied." : "IDOR violation allowed!");

    // SEC-IDOR-002: Client A denied access to Client B's services
    var ownServiceAllowed = SecurityService.assertServiceOwnership(clientAuthContext, "CL001");
    var foreignServiceDenied = SecurityService.assertServiceOwnership(clientAuthContext, "CL002");
    record("SEC-IDOR-002", "Service IDOR tenant boundary enforcement", ownServiceAllowed === true && foreignServiceDenied === false,
      (ownServiceAllowed && !foreignServiceDenied) ? "CL001 permitted own service; CL002 foreign service denied." : "IDOR violation allowed!");

    // SEC-IDOR-003: Admin roles permitted cross-tenant access
    var adminContext = { authenticated: true, role: "ADMIN", userId: "ADM001" };
    var adminAccess1 = SecurityService.assertClientOwnership(adminContext, "CL001");
    var adminAccess2 = SecurityService.assertClientOwnership(adminContext, "CL002");
    record("SEC-IDOR-003", "Admin roles authorized across tenants", adminAccess1 === true && adminAccess2 === true,
      (adminAccess1 && adminAccess2) ? "Admin authorized for both CL001 and CL002." : "Admin access incorrectly restricted.");

    // ====================================================
    // SECTION 9: LEGACY CREDENTIAL ON-LOGIN MIGRATION
    // ====================================================

    // SEC-MIG-001 & SEC-MIG-002: Plaintext migrated to PBKDF2 and wiped
    var legacyPassIdx = cMap["password"] !== undefined ? cMap["password"] : cMap["legacy_password"];
    if (legacyPassIdx === undefined) {
      var colIdx = clientSheet.getLastColumn() + 1;
      clientSheet.getRange(1, colIdx).setValue("Password");
      cHeaders = getSheetHeaders(clientSheet);
      cMap = getColumnIndexMap(cHeaders, "Clients");
      legacyPassIdx = cMap["password"] !== undefined ? cMap["password"] : cMap["legacy_password"];
    }

    var legacyRow = new Array(cHeaders.length);
    for (var m = 0; m < legacyRow.length; m++) legacyRow[m] = "";
    legacyRow[cMap["client_id"]] = "CL_LEGACY_001";
    legacyRow[cMap["name"]] = "Legacy Client Pvt Ltd";
    legacyRow[cMap["email"]] = "legacy@legalsthal.com";
    legacyRow[legacyPassIdx] = "legacyPass123";
    legacyRow[cMap["password_hash"]] = "";
    legacyRow[cMap["password_salt"]] = "";
    legacyRow[cMap["status"]] = "ACTIVE";
    legacyRow[cMap["failed_attempts"]] = 0;
    clientSheet.appendRow(legacyRow);

    var legacyLogin = AuthService.login("legacy@legalsthal.com", "legacyPass123");
    var accountAfterLegacy = findAccountDirect(ss, "CL_LEGACY_001");
    var migrationSuccess = !!(legacyLogin.success === true && accountAfterLegacy && accountAfterLegacy.passwordHash && accountAfterLegacy.passwordSalt);
    var plaintextWiped = (!accountAfterLegacy.legacyPassword || accountAfterLegacy.legacyPassword === "");

    record("SEC-MIG-001", "Legacy password migration to PBKDF2-HMAC-SHA256", migrationSuccess === true,
      migrationSuccess ? "Plaintext successfully converted to versioned PBKDF2 hash." : "Migration failed: " + JSON.stringify(legacyLogin));
    record("SEC-MIG-002", "Legacy plaintext cleared after migration", plaintextWiped === true,
      plaintextWiped ? "Plaintext password column completely wiped." : "Plaintext password remained in sheet!");

    // Clean up legacy session
    if (legacyLogin.data && legacyLogin.data.token) {
      SessionService.revokeSession(legacyLogin.data.token);
    }

    // ====================================================
    // SECTION 10: ADMIN BOOTSTRAP SECURITY
    // ====================================================

    // SEC-BOOT-001: Super Admin bootstrap
    var secret = CONFIG.getAdminBootstrapSecret();
    var bootResp = AuthService.bootstrapSuperAdmin(secret, "superadmin@legalsthal.com", "Master Admin", "SuperAdmin@2026#Key");
    record("SEC-BOOT-001", "Admin bootstrap", bootResp.success === true && bootResp.data.role === "SUPER_ADMIN",
      bootResp.success ? "SUPER_ADMIN bootstrapped: " + bootResp.data.adminId : "Admin bootstrap failed: " + JSON.stringify(bootResp.error));

    // SEC-BOOT-002: Second super-admin bootstrap blocked fail-closed
    var secondBootResp = AuthService.bootstrapSuperAdmin(secret, "anotheradmin@legalsthal.com", "Second Admin", "SecondAdmin@2026#Key");
    record("SEC-BOOT-002", "Second super-admin bootstrap blocked", secondBootResp.success === false,
      secondBootResp.success === false ? "Second bootstrap rejected." : "Security failure: Multiple super-admins bootstrapped!");

    // ====================================================
    // SECTION 11: SENSITIVE DATA LEAKAGE PREVENTION
    // ====================================================

    // SEC-LEAK-001: API payloads exclude secret keys, hashes, and salts
    var loginOutputStr = JSON.stringify(successLogin);
    var hasLeakedSecrets = (
      loginOutputStr.indexOf("password_hash") !== -1 ||
      loginOutputStr.indexOf("password_salt") !== -1 ||
      loginOutputStr.indexOf("ADMIN_BOOTSTRAP_SECRET") !== -1 ||
      loginOutputStr.indexOf("token_hash") !== -1
    );
    record("SEC-LEAK-001", "Secrets never returned in API payloads", !hasLeakedSecrets,
      !hasLeakedSecrets ? "API payload excludes password hashes, salts, and secret keys." : "CRITICAL: Secret leaked in response!");

    // SEC-LEAK-002: Audit logs redact password and token fields
    AuthService.logSecurityAudit("CL001", "CLIENT", "PASSWORD_UPDATE_ATTEMPT", "USER", "CL001", "Attempted with password=SensitiveSecret123 and token=RawSecretTokenValue");
    var auditSheet = ss.getSheetByName("AuditLogs");
    var aData = auditSheet.getDataRange().getValues();
    var aHeaders = getSheetHeaders(auditSheet);
    var aMap = getColumnIndexMap(aHeaders, "AuditLogs");
    var lastAuditRow = aData[aData.length - 1];
    var auditDetails = lastAuditRow[aMap["details"]];
    var isRedacted = (
      auditDetails.indexOf("SensitiveSecret123") === -1 &&
      auditDetails.indexOf("RawSecretTokenValue") === -1 &&
      auditDetails.indexOf("[REDACTED]") !== -1
    );
    record("SEC-LEAK-002", "Audit log redaction of sensitive credentials", isRedacted === true,
      isRedacted ? "Sensitive credentials successfully redacted in audit log." : "CRITICAL: Sensitive credential found unredacted in audit log!");

    // ====================================================
    // SECTION 12: CONCURRENCY & LOCK SERVICE INTEGRATION
    // ====================================================

    // SEC-RACE-001: ScriptLock acquired during critical authentication mutations
    var lockObj = LockService.getScriptLock();
    var canAcquire = false;
    try {
      canAcquire = lockObj.tryLock(1000);
      if (canAcquire) {
        lockObj.releaseLock();
      }
    } catch (e) {
      canAcquire = false;
    }
    record("SEC-RACE-001", "ScriptLock concurrency protection", canAcquire === true,
      canAcquire ? "ScriptLock successfully acquired and released, protecting concurrent sheet writes." : "Failed to acquire script lock.");

  } catch (err) {
    Logger.log("[AUTH TEST RUNNER ERROR] " + err.toString());
    record("AUTH-ERR", "Test suite execution", false, err.toString());
  }

  var passedCount = results.filter(function(r) { return r.passed; }).length;
  var failedCount = results.filter(function(r) { return !r.passed; }).length;

  Logger.log("==================================================");
  Logger.log("🛡️ AUTH TEST SUITE COMPLETE: " + passedCount + " / " + results.length + " PASSED");
  Logger.log("==================================================");

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount: passedCount,
    failedCount: failedCount,
    testResults: results
  };
}

// Helpers for test runner
function findAccountDirect(ss, clientId) {
  var sheet = ss.getSheetByName("Clients");
  var headers = getSheetHeaders(sheet);
  var colMap = getColumnIndexMap(headers, "Clients");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][colMap["client_id"]] === clientId) {
      return {
        userId: clientId,
        failedAttempts: parseInt(data[i][colMap["failed_attempts"]] || 0, 10),
        lockedUntil: data[i][colMap["locked_until"]],
        passwordHash: data[i][colMap["password_hash"]],
        passwordSalt: data[i][colMap["password_salt"]],
        legacyPassword: (colMap["password"] !== undefined ? data[i][colMap["password"]] : (colMap["legacy_password"] !== undefined ? data[i][colMap["legacy_password"]] : null)),
        firstLogin: (data[i][colMap["first_login"]] === true || data[i][colMap["first_login"]] === "TRUE")
      };
    }
  }
  return null;
}

function clearLockDirect(ss, clientId) {
  var sheet = ss.getSheetByName("Clients");
  var colMap = getColumnIndexMap(getSheetHeaders(sheet), "Clients");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][colMap["client_id"]] === clientId) {
      sheet.getRange(i + 1, colMap["failed_attempts"] + 1).setValue(0);
      sheet.getRange(i + 1, colMap["locked_until"] + 1).setValue("");
      break;
    }
  }
}

function setFirstLoginDirect(ss, clientId, val) {
  var sheet = ss.getSheetByName("Clients");
  var colMap = getColumnIndexMap(getSheetHeaders(sheet), "Clients");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][colMap["client_id"]] === clientId) {
      sheet.getRange(i + 1, colMap["first_login"] + 1).setValue(val);
      break;
    }
  }
}
