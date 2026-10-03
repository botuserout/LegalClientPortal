// Scratch test to verify PBKDF2-HMAC-SHA256 implementation matches Node crypto
const crypto = require('crypto');

// Implementation using HMAC-SHA256 primitive (simulating Apps Script Utilities.computeHmacSha256Signature)
function mockHmacSha256(messageBytes, keyBytes) {
  const hmac = crypto.createHmac('sha256', Buffer.from(keyBytes));
  hmac.update(Buffer.from(messageBytes));
  return Array.from(hmac.digest()); // unsigned bytes 0..255
}

function pbkdf2HmacSha256(passwordStr, saltBytes, iterations, keyLengthBytes = 32) {
  const passBytes = Array.from(Buffer.from(passwordStr, 'utf8'));
  const hLen = 32;
  const numBlocks = Math.ceil(keyLengthBytes / hLen);
  let derivedKey = [];

  for (let block = 1; block <= numBlocks; block++) {
    // Salt || INT_32_BE(block)
    const blockIndexBytes = [
      (block >>> 24) & 0xff,
      (block >>> 16) & 0xff,
      (block >>> 8) & 0xff,
      block & 0xff
    ];
    const initialMsg = saltBytes.concat(blockIndexBytes);

    let u = mockHmacSha256(initialMsg, passBytes);
    let t = u.slice();

    for (let iter = 1; iter < iterations; iter++) {
      u = mockHmacSha256(u, passBytes);
      for (let j = 0; j < hLen; j++) {
        t[j] ^= u[j];
      }
    }

    derivedKey = derivedKey.concat(t);
  }

  return derivedKey.slice(0, keyLengthBytes);
}

function bytesToHex(bytes) {
  return bytes.map(b => (b < 16 ? '0' : '') + (b & 0xff).toString(16)).join('');
}

// Compare against Node's crypto.pbkdf2Sync
const password = "Legal@2026Password!";
const saltHex = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const saltBytes = Array.from(Buffer.from(saltHex, 'hex'));
const iterations = 1000;

const customResult = bytesToHex(pbkdf2HmacSha256(password, saltBytes, iterations, 32));
const nodeResult = crypto.pbkdf2Sync(password, Buffer.from(saltBytes), iterations, 32, 'sha256').toString('hex');

console.log("Custom PBKDF2:", customResult);
console.log("Node.js PBKDF2:", nodeResult);
console.log("Match:", customResult === nodeResult ? "YES (100% IDENTICAL)" : "NO (MISMATCH)");

// RFC 6070 Test Vector 1:
// P = "password", S = "salt", c = 1, dkLen = 20 (or 32)
// For c=1, dkLen=32:
const rfcResult = crypto.pbkdf2Sync("password", "salt", 1, 32, 'sha256').toString('hex');
const customRfc = bytesToHex(pbkdf2HmacSha256("password", Array.from(Buffer.from("salt", 'utf8')), 1, 32));
console.log("\nRFC 6070 Vector 1 (c=1):");
console.log("Expected:", rfcResult);
console.log("Actual:  ", customRfc);
console.log("Match:   ", rfcResult === customRfc ? "PASS" : "FAIL");

// RFC 6070 Test Vector 2:
// P = "password", S = "salt", c = 2, dkLen = 32
const rfcResult2 = crypto.pbkdf2Sync("password", "salt", 2, 32, 'sha256').toString('hex');
const customRfc2 = bytesToHex(pbkdf2HmacSha256("password", Array.from(Buffer.from("salt", 'utf8')), 2, 32));
console.log("\nRFC 6070 Vector 2 (c=2):");
console.log("Expected:", rfcResult2);
console.log("Actual:  ", customRfc2);
console.log("Match:   ", rfcResult2 === customRfc2 ? "PASS" : "FAIL");
