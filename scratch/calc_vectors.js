const crypto = require('crypto');

console.log("Vector 1 (1 iter):", crypto.pbkdf2Sync("password", "salt", 1, 32, "sha256").toString('hex'));
console.log("Vector 2 (2 iters):", crypto.pbkdf2Sync("password", "salt", 2, 32, "sha256").toString('hex'));
console.log("Vector 3 (4096 iters):", crypto.pbkdf2Sync("password", "salt", 4096, 32, "sha256").toString('hex'));
console.log("Vector 4 (Multi-block, 40 bytes):", crypto.pbkdf2Sync("passwordPASSWORDpassword", "saltSALTsaltSALTsaltSALTsaltSALTsalt", 4096, 40, "sha256").toString('hex'));
console.log("Vector 5 (Unicode):", crypto.pbkdf2Sync("p\u0101ssw\u014drd", "sa\u2113t", 4096, 32, "sha256").toString('hex'));

// HMAC-SHA256 Test Vectors (RFC 4231)
// Test Case 1: Key = 20 bytes 0x0b, Data = "Hi There"
const key1 = Buffer.alloc(20, 0x0b);
const data1 = Buffer.from("Hi There", "ascii");
console.log("\nRFC 4231 HMAC-SHA256 Case 1:", crypto.createHmac("sha256", key1).update(data1).digest("hex"));

// Test Case 2: Key = "Jefe", Data = "what do ya want for nothing?"
console.log("RFC 4231 HMAC-SHA256 Case 2:", crypto.createHmac("sha256", "Jefe").update("what do ya want for nothing?").digest("hex"));

// Test Case 3: Long key (131 bytes of 0xaa > 64 byte block size), Data = "Test Using Larger Than Block-Size Key - Hash Key First"
const key3 = Buffer.alloc(131, 0xaa);
const data3 = "Test Using Larger Than Block-Size Key - Hash Key First";
console.log("RFC 4231 HMAC-SHA256 Case 3 (Long key > 64B):", crypto.createHmac("sha256", key3).update(data3).digest("hex"));

// Test Case 4: Empty data, Key = 20 bytes 0x0c
const key4 = Buffer.alloc(20, 0x0c);
console.log("RFC 4231 HMAC-SHA256 Case 4 (Empty message):", crypto.createHmac("sha256", key4).update("").digest("hex"));
