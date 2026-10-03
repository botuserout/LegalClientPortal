// Benchmark script for PBKDF2-HMAC-SHA256 across multiple iteration counts
const fs = require('fs');
const crypto = require('crypto');

// Load SecurityService
const basePath = 'c:/Users/Raunak Kumar/OneDrive/Desktop/legalsthalcportal/backend/';
const configCode = fs.readFileSync(basePath + 'Config.gs', 'utf8');
const securityCode = fs.readFileSync(basePath + 'SecurityService.gs', 'utf8');

const Utilities = {
  DigestAlgorithm: { SHA_256: "SHA_256" },
  getUuid: () => crypto.randomUUID(),
  newBlob: (str) => ({
    getBytes: () => Array.from(Buffer.from(str, 'utf8'))
  }),
  computeDigest: (alg, val) => {
    const hash = crypto.createHash('sha256');
    hash.update(typeof val === 'string' ? val : Buffer.from(val));
    const buf = hash.digest();
    const arr = [];
    for (let i = 0; i < buf.length; i++) {
      let b = buf[i];
      if (b > 127) b -= 256;
      arr.push(b);
    }
    return arr;
  },
  computeHmacSha256Signature: (value, key) => {
    const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const valBuf = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const hmac = crypto.createHmac('sha256', keyBuf);
    hmac.update(valBuf);
    const buf = hmac.digest();
    const arr = [];
    for (let i = 0; i < buf.length; i++) {
      let b = buf[i];
      if (b > 127) b -= 256;
      arr.push(b);
    }
    return arr;
  }
};

eval(configCode);
eval(securityCode);

const testPassword = "Legal@2026SecurePassword!";
const testSaltHex = "0123456789abcdef0123456789abcdef";
const iterationLevels = [1000, 5000, 10000, 25000, 50000];
const roundsPerLevel = 5;

console.log("==================================================");
console.log("⏱️ PBKDF2-HMAC-SHA256 PERFORMANCE BENCHMARK");
console.log("==================================================");

const benchmarkResults = [];

for (const iters of iterationLevels) {
  const times = [];
  // Warm up run
  SecurityService.hashPassword(testPassword, testSaltHex, Math.min(iters, 1000));

  for (let r = 0; r < roundsPerLevel; r++) {
    const start = process.hrtime.bigint();
    const hash = SecurityService.hashPassword(testPassword, testSaltHex, iters);
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    times.push(ms);
  }

  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  benchmarkResults.push({
    iterations: iters,
    avg: avg.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2)
  });

  console.log(`Iterations: ${iters.toString().padStart(6)} | Avg: ${avg.toFixed(2).padStart(8)} ms | Min: ${min.toFixed(2).padStart(8)} ms | Max: ${max.toFixed(2).padStart(8)} ms`);
}

console.log("\nMarkdown Benchmark Table:");
console.log("| Iterations | Avg Time (ms) | Min (ms) | Max (ms) |");
console.log("| ---------: | ------------: | -------: | -------: |");
benchmarkResults.forEach(r => {
  console.log(`| ${r.iterations.toLocaleString()} | ${r.avg} ms | ${r.min} ms | ${r.max} ms |`);
});
