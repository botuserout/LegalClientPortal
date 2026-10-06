/**
 * Legal Sthal - Dashboard Performance Benchmark Suite
 * Verifies that the dashboard loads well within the 3-second SLA under normal load.
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function fetchUrl(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(`${BASE_URL}${urlPath}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const durationMs = performance.now() - start;
        const bodyBuffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          durationMs,
          sizeBytes: bodyBuffer.length
        });
      });
    });
    req.on('error', reject);
  });
}

async function runBenchmark() {
  console.log("==================================================================");
  console.log("⚡ LEGAL STHAL DASHBOARD LOAD PERFORMANCE BENCHMARK");
  console.log("   Target SLA: Dashboard loads within 3.0 seconds (< 3000ms)");
  console.log("==================================================================");

  // 1. Warm-up Request
  await fetchUrl('/');

  // 2. Measure Primary HTML Document Load
  const htmlRes = await fetchUrl('/');
  console.log(`[HTML Document] Status: ${htmlRes.statusCode} | Time: ${htmlRes.durationMs.toFixed(2)}ms | Size: ${htmlRes.sizeBytes} bytes | Encoding: ${htmlRes.headers['content-encoding'] || 'raw'}`);

  // 3. Measure Core Assets required for Dashboard Render
  const criticalAssets = [
    '/css/main.css',
    '/css/components.css',
    '/css/modals.css',
    '/css/toasts.css',
    '/css/mobile.css',
    '/js/app.js',
    '/js/config.js',
    '/js/services/clientService.js',
    '/js/services/adminService.js',
    '/js/services/dataStore.js',
    '/js/ui/sidebar.js',
    '/js/ui/header.js'
  ];

  console.log("\n📦 Measuring Parallel Critical Asset Delivery:");
  const assetStart = performance.now();
  const assetResults = await Promise.all(criticalAssets.map(p => fetchUrl(p)));
  const totalAssetParallelMs = performance.now() - assetStart;

  assetResults.forEach((r, idx) => {
    console.log(`   - ${criticalAssets[idx].padEnd(30)} ${r.durationMs.toFixed(2)}ms (gzip: ${r.headers['content-encoding'] === 'gzip'})`);
  });
  console.log(`Total Parallel Asset Load Time: ${totalAssetParallelMs.toFixed(2)}ms`);

  // Total Client Bootstrap Time
  const totalColdBootstrapMs = htmlRes.durationMs + totalAssetParallelMs;
  console.log(`\n🚀 Total End-to-End Initial Bootstrap: ${totalColdBootstrapMs.toFixed(2)}ms`);

  // 4. Test ETag 304 Caching Speed
  console.log("\n⚡ Measuring Repeated Visit (HTTP 304 Cache-Validation) Latency:");
  const cssRes = await fetchUrl('/css/main.css');
  const etag = cssRes.headers['etag'];
  const cachedRes = await fetchUrl('/css/main.css', { 'If-None-Match': etag });
  console.log(`   - ETag 304 Not-Modified Response: ${cachedRes.statusCode} in ${cachedRes.durationMs.toFixed(2)}ms`);

  // 5. Normal Multi-User Concurrent Load Test (50 concurrent dashboard visits)
  console.log("\n👥 Simulating Normal Multi-User Load (50 Concurrent Dashboard Sessions)...");
  const CONCURRENT_USERS = 50;
  const loadStart = performance.now();
  
  const userLatencies = await Promise.all(Array.from({ length: CONCURRENT_USERS }).map(async () => {
    const userStart = performance.now();
    // Fetch HTML + critical bundle
    const [h, ...assets] = await Promise.all([
      fetchUrl('/'),
      fetchUrl('/css/main.css'),
      fetchUrl('/css/components.css'),
      fetchUrl('/css/mobile.css'),
      fetchUrl('/js/app.js')
    ]);
    return performance.now() - userStart;
  }));

  const totalLoadDurationMs = performance.now() - loadStart;
  userLatencies.sort((a, b) => a - b);

  const avg = userLatencies.reduce((a, b) => a + b, 0) / userLatencies.length;
  const p50 = userLatencies[Math.floor(CONCURRENT_USERS * 0.50)];
  const p90 = userLatencies[Math.floor(CONCURRENT_USERS * 0.90)];
  const p99 = userLatencies[Math.floor(CONCURRENT_USERS * 0.99)];
  const max = userLatencies[userLatencies.length - 1];

  console.log(`   Completed 50 full session loads in: ${totalLoadDurationMs.toFixed(2)}ms`);
  console.log(`   - Average Latency:  ${avg.toFixed(2)}ms`);
  console.log(`   - Median (p50):     ${p50.toFixed(2)}ms`);
  console.log(`   - 90th percentile:  ${p90.toFixed(2)}ms`);
  console.log(`   - 99th percentile:  ${p99.toFixed(2)}ms`);
  console.log(`   - Max Latency:      ${max.toFixed(2)}ms`);

  // 6. SLA Verification
  console.log("\n==================================================================");
  console.log("📋 SLA CRITERIA EVALUATION:");
  
  const slaPass = max < 3000;
  if (slaPass) {
    console.log(`✅ [PASS] Performance: Dashboard loads within 3 seconds under normal load.`);
    console.log(`   Observed Max: ${max.toFixed(2)}ms (< 3000ms SLA target, ${(3000 / max).toFixed(1)}x faster than required threshold)`);
  } else {
    console.error(`❌ [FAIL] Observed Max latency exceeded 3.0 seconds: ${max.toFixed(2)}ms`);
    process.exit(1);
  }
  console.log("==================================================================");
}

runBenchmark().catch(err => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
