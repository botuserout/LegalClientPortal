/**
 * Legal Sthal - Cryptographic & Security Utilities Layer (SecurityService.gs)
 * Version: 2.0.0
 * 
 * Provides production-grade cryptographic primitives, password KDF hashing (PBKDF2-HMAC-SHA256),
 * opaque random token generation, constant-time comparisons, and IDOR ownership assertions.
 * 
 * Cryptographic Foundations:
 * - RFC 2898 / RFC 6070 PBKDF2-HMAC-SHA256 key derivation.
 * - Apps Script Utilities.computeHmacSha256Signature and Utilities.computeDigest.
 * - Zero reliance on insecure Math.random() for security-critical values.
 */

var SecurityService = (function() {

  /**
   * Constant-time string comparison to defend against timing side-channel attacks.
   */
  function secureCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    var mismatch = a.length === b.length ? 0 : 1;
    if (mismatch) {
      b = a; // Normalize iteration length while preserving failure
    }
    for (var i = 0; i < a.length; i++) {
      mismatch |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return mismatch === 0;
  }

  /**
   * Generates cryptographically unpredictable random bytes without using Math.random().
   * Combines multiple UUID v4 entropy blocks and SHA-256 digest expansion.
   */
  function generateSecureRandomBytes(byteLength) {
    var accumulatedBytes = [];
    while (accumulatedBytes.length < byteLength) {
      var seed = Utilities.getUuid() + "-" + Utilities.getUuid() + "-" + new Date().getTime();
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed);
      for (var i = 0; i < digest.length && accumulatedBytes.length < byteLength; i++) {
        var unsignedByte = digest[i] < 0 ? digest[i] + 256 : digest[i];
        accumulatedBytes.push(unsignedByte);
      }
    }
    return accumulatedBytes;
  }

  /**
   * Formats a byte array (0..255) as a lower-case hexadecimal string.
   */
  function bytesToHex(bytes) {
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      var s = b.toString(16);
      if (s.length === 1) s = "0" + s;
      hex += s;
    }
    return hex;
  }

  /**
   * Parses a hexadecimal string into an unsigned byte array (0..255).
   */
  function hexToBytes(hexStr) {
    var bytes = [];
    for (var i = 0; i < hexStr.length; i += 2) {
      bytes.push(parseInt(hexStr.substr(i, 2), 16));
    }
    return bytes;
  }

  /**
   * Generates a 256-bit cryptographically secure opaque token (64 hex characters).
   */
  function generateSecureToken() {
    var bytes = generateSecureRandomBytes(CONFIG.SESSION.TOKEN_BYTE_LENGTH || 32);
    return bytesToHex(bytes);
  }

  /**
   * Generates a 128-bit cryptographically secure random salt (32 hex characters).
   */
  function generateSalt() {
    var bytes = generateSecureRandomBytes(CONFIG.AUTH.SALT_BYTE_LENGTH || 16);
    return bytesToHex(bytes);
  }

  /**
   * Computes SHA-256 hash of an opaque token for database storage.
   * Prevents raw session tokens or reset tokens from being stored in Google Sheets.
   */
  function hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string") return "";
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawToken);
    return bytesToHex(digest);
  }

  /**
   * Generates a cryptographically secure, unpredictable unique identifier.
   * Format: <PREFIX>_<TIMESTAMP>_<12_HEX_RANDOM_CHARS>
   * Replaces any insecure Math.random() usage for IDs.
   */
  function generateSecureId(prefix) {
    var p = prefix ? String(prefix).toUpperCase() : "ID";
    var timestamp = new Date().getTime();
    var randomSuffix = bytesToHex(generateSecureRandomBytes(6)); // 48 bits of entropy
    return p + "_" + timestamp + "_" + randomSuffix;
  }

  /**
   * Computes HMAC-SHA256 signature using Apps Script native runtime.
   * Accepts message bytes (or string) and key bytes (or string), returns unsigned byte array (0..255).
   */
  function computeHmacSha256(messageBytes, keyBytes) {
    var signedBytes = Utilities.computeHmacSha256Signature(messageBytes, keyBytes);
    var unsigned = [];
    for (var i = 0; i < signedBytes.length; i++) {
      unsigned.push(signedBytes[i] < 0 ? signedBytes[i] + 256 : signedBytes[i]);
    }
    return unsigned;
  }

  /**
   * Computes HMAC-SHA256 signature and returns hexadecimal string.
   */
  function hmacSha256Hex(message, key) {
    var bytes = computeHmacSha256(message, key);
    return bytesToHex(bytes);
  }

  /**
   * Standard RFC 2898 PBKDF2-HMAC-SHA256 Key Derivation Function.
   * 
   * @param {string} passwordStr - The user's plaintext password.
   * @param {Array<number>} saltBytes - Array of salt bytes (0..255).
   * @param {number} iterations - Number of iterations (e.g. 10000).
   * @param {number} keyLengthBytes - Output key length in bytes (default 32 for 256 bits).
   * @returns {Array<number>} Derived key byte array.
   */
  function pbkdf2HmacSha256(passwordStr, saltBytes, iterations, keyLengthBytes) {
    if (!keyLengthBytes) keyLengthBytes = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KEY_BYTE_LENGTH) ? CONFIG.AUTH.KEY_BYTE_LENGTH : 32;
    var passBytes = Utilities.newBlob(passwordStr, "text/plain").getBytes();
    var hLen = 32; // SHA-256 output length
    var numBlocks = Math.ceil(keyLengthBytes / hLen);
    var derivedKey = [];

    for (var block = 1; block <= numBlocks; block++) {
      // saltBytes || INT_32_BE(block)
      var blockIndexBytes = [
        (block >>> 24) & 0xff,
        (block >>> 16) & 0xff,
        (block >>> 8) & 0xff,
        block & 0xff
      ];
      var initialMsg = saltBytes.concat(blockIndexBytes);

      var u = computeHmacSha256(initialMsg, passBytes);
      var t = u.slice();

      for (var iter = 1; iter < iterations; iter++) {
        u = computeHmacSha256(u, passBytes);
        for (var j = 0; j < hLen; j++) {
          t[j] ^= u[j];
        }
      }

      derivedKey = derivedKey.concat(t);
    }

    return derivedKey.slice(0, keyLengthBytes);
  }

  /**
   * Derives a raw key byte array using PBKDF2-HMAC-SHA256 and returns it as a lowercase hex string.
   */
  function deriveKeyHex(password, saltHex, iterations, keyLengthBytes) {
    if (!iterations) iterations = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KDF_ITERATIONS) ? CONFIG.AUTH.KDF_ITERATIONS : 10000;
    if (!keyLengthBytes) keyLengthBytes = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KEY_BYTE_LENGTH) ? CONFIG.AUTH.KEY_BYTE_LENGTH : 32;
    var saltBytes = hexToBytes(saltHex);
    var keyBytes = pbkdf2HmacSha256(password, saltBytes, iterations, keyLengthBytes);
    return bytesToHex(keyBytes);
  }

  /**
   * Formats PBKDF2 hash, salt, and iteration parameters into a versioned modular crypt format.
   * Format: pbkdf2_sha256$v1$<iterations>$<saltHex>$<derivedKeyHex>
   */
  function formatPasswordHash(derivedKeyHex, saltHex, iterations) {
    var prefix = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.HASH_PREFIX) ? CONFIG.AUTH.HASH_PREFIX : "pbkdf2_sha256";
    var version = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.FORMAT_VERSION) ? CONFIG.AUTH.FORMAT_VERSION : "v1";
    var iters = iterations || ((typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KDF_ITERATIONS) ? CONFIG.AUTH.KDF_ITERATIONS : 10000);
    return prefix + "$" + version + "$" + iters + "$" + saltHex + "$" + derivedKeyHex;
  }

  /**
   * Parses a stored password hash string into its constituent parameters.
   * Supports both versioned format (pbkdf2_sha256$v1$...) and legacy unversioned raw 64-char hex.
   */
  function parsePasswordHash(storedHash) {
    if (!storedHash || typeof storedHash !== "string") {
      return { isVersioned: false, valid: false };
    }
    var parts = storedHash.split("$");
    if (parts.length === 5 && parts[0] === "pbkdf2_sha256") {
      var iters = parseInt(parts[2], 10);
      return {
        isVersioned: true,
        valid: !isNaN(iters) && iters > 0 && parts[3].length > 0 && parts[4].length === 64,
        prefix: parts[0],
        version: parts[1],
        iterations: iters,
        saltHex: parts[3],
        hashHex: parts[4]
      };
    }
    // Fallback: Legacy unversioned raw hex hash (64 hex characters)
    return {
      isVersioned: false,
      valid: storedHash.length === 64 && /^[0-9a-fA-F]{64}$/.test(storedHash),
      prefix: "pbkdf2_sha256",
      version: "v0",
      iterations: (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KDF_ITERATIONS) ? CONFIG.AUTH.KDF_ITERATIONS : 10000,
      saltHex: "",
      hashHex: storedHash
    };
  }

  /**
   * Hashes a password using PBKDF2-HMAC-SHA256 with the provided salt.
   * Returns a versioned modular crypt string:
   * pbkdf2_sha256$v1$<iterations>$<saltHex>$<derivedKeyHex>
   */
  function hashPassword(password, saltHex, iterations) {
    if (!iterations) iterations = (typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KDF_ITERATIONS) ? CONFIG.AUTH.KDF_ITERATIONS : 10000;
    var rawHex = deriveKeyHex(password, saltHex, iterations, 32);
    return formatPasswordHash(rawHex, saltHex, iterations);
  }

  /**
   * Verifies a password attempt against stored PBKDF2 salt and hash using constant-time comparison.
   * Automatically handles both versioned hashes and legacy unversioned 64-char hex hashes.
   */
  function verifyPassword(password, saltHex, storedHash, iterations) {
    if (!password || !storedHash) return false;
    var parsed = parsePasswordHash(storedHash);
    if (!parsed.valid && !parsed.hashHex) return false;

    var effectiveSaltHex = (parsed.isVersioned && parsed.saltHex) ? parsed.saltHex : saltHex;
    if (!effectiveSaltHex) return false;

    var effectiveIterations = parsed.isVersioned ? parsed.iterations : (iterations || ((typeof CONFIG !== "undefined" && CONFIG.AUTH && CONFIG.AUTH.KDF_ITERATIONS) ? CONFIG.AUTH.KDF_ITERATIONS : 10000));

    var computedHex = deriveKeyHex(password, effectiveSaltHex, effectiveIterations, 32);
    return secureCompare(computedHex.toLowerCase(), parsed.hashHex.toLowerCase());
  }

  /**
   * Validates password complexity against centralized policy in Config.gs.
   * Returns structured validation object without exposing password contents.
   */
  function validatePassword(password) {
    var policy = CONFIG.PASSWORD;
    var errors = [];

    if (!password || typeof password !== "string") {
      return { valid: false, errors: ["Password is required."] };
    }

    if (password.length < policy.MIN_LENGTH) {
      errors.push("Password must be at least " + policy.MIN_LENGTH + " characters long.");
    }

    if (password.length > policy.MAX_LENGTH) {
      errors.push("Password cannot exceed " + policy.MAX_LENGTH + " characters.");
    }

    if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter (A-Z).");
    }

    if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter (a-z).");
    }

    if (policy.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one numerical digit (0-9).");
    }

    if (policy.REQUIRE_SPECIAL) {
      var specialRegex = new RegExp("[" + policy.SPECIAL_CHARACTERS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "]");
      if (!specialRegex.test(password)) {
        errors.push("Password must contain at least one special character (" + policy.SPECIAL_CHARACTERS + ").");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Email normalization utility (RFC 5322 compliance).
   */
  function normalizeEmail(email) {
    if (!email || typeof email !== "string") return "";
    return email.trim().toLowerCase();
  }

  /**
   * Indian phone normalization utility.
   * Normalizes formatted phone strings into standard 10-digit format.
   */
  function normalizeMobile(mobile) {
    if (!mobile) return "";
    var digits = String(mobile).replace(/[\s\-\(\)\.]/g, "");
    if (digits.indexOf("+") === 0) digits = digits.substring(1);
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.substring(2);
    if (digits.length === 11 && digits.indexOf("0") === 0) digits = digits.substring(1);
    return digits;
  }

  /**
   * Asserts client ownership for IDOR defense.
   * Admin roles are authorized globally; Client roles must match target clientId.
   */
  function assertClientOwnership(authContext, targetClientId) {
    if (!authContext || !authContext.authenticated) return false;
    if (authContext.role === "SUPER_ADMIN" || authContext.role === "ADMIN" || authContext.role === "TEAM_MEMBER") {
      return true;
    }
    return authContext.clientId === targetClientId;
  }

  /**
   * Asserts service ownership for IDOR defense.
   */
  function assertServiceOwnership(authContext, serviceClientId) {
    return assertClientOwnership(authContext, serviceClientId);
  }

  return {
    secureCompare: secureCompare,
    generateSecureRandomBytes: generateSecureRandomBytes,
    bytesToHex: bytesToHex,
    hexToBytes: hexToBytes,
    generateSecureToken: generateSecureToken,
    generateSalt: generateSalt,
    hashToken: hashToken,
    generateSecureId: generateSecureId,
    computeHmacSha256: computeHmacSha256,
    hmacSha256Hex: hmacSha256Hex,
    pbkdf2HmacSha256: pbkdf2HmacSha256,
    deriveKeyHex: deriveKeyHex,
    formatPasswordHash: formatPasswordHash,
    parsePasswordHash: parsePasswordHash,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    validatePassword: validatePassword,
    normalizeEmail: normalizeEmail,
    normalizeMobile: normalizeMobile,
    assertClientOwnership: assertClientOwnership,
    assertServiceOwnership: assertServiceOwnership
  };
})();
