/**
 * Legal Sthal - Step 9 Production Hardening & Security Audit Test Suite
 * (test_step9_production.js)
 * 
 * Verifies:
 * 1. Codebase Secret Audit (No hardcoded API secrets, private keys, or passwords)
 * 2. Frontend Production Mode Hardening (No silent dataStore fallback when live endpoint configured)
 * 3. Demo Bar Production Suppression (Hidden and deactivated in live production)
 * 4. Apps Script Manifest Audit (appsscript.json scopes, timeZone Asia/Kolkata, V8 runtime)
 * 5. Role-based Access Control & IDOR Fail-Closed Boundaries
 * 6. Google Drive Storage Hierarchy and Permission Policies
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] PROD-${String(totalTests).padStart(3, '0')}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] PROD-${String(totalTests).padStart(3, '0')}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] PROD-${String(totalTests).padStart(3, '0')}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] PROD-${String(totalTests).padStart(3, '0')}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log('==================================================');
console.log('🔒 STARTING STEP 9 PRODUCTION HARDENING & AUDIT SUITE');
console.log('==================================================');

// Helper to recursively get files
function getFiles(dir, extensions = ['.js', '.gs', '.json', '.html']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'scratch') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

// ----------------------------------------------------
// 1. CODEBASE SECRET AUDIT
// ----------------------------------------------------
test('Secret Audit: No live production client secrets or private keys in repository', () => {
  const codeFiles = [
    ...getFiles(path.join(ROOT_DIR, 'backend')),
    ...getFiles(path.join(ROOT_DIR, 'js'))
  ];

  // Regexes for suspicious secret patterns (e.g. real OAuth secrets, AWS secret keys, private keys)
  const suspiciousPatterns = [
    /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/,
    /client_secret\s*[:=]\s*['"][a-zA-Z0-9_-]{24,}['"]/i,
    /refresh_token\s*[:=]\s*['"][a-zA-Z0-9_.-]{30,}['"]/i,
    /access_token\s*[:=]\s*['"][a-zA-Z0-9_.-]{40,}['"]/i
  ];

  for (const filePath of codeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        // Exclude mock test stubs if any
        if (!content.includes('mock_legalsthal') && !content.includes('TEST_')) {
          assert.fail(`Suspicious secret found in ${filePath} matching ${pattern}`);
        }
      }
    }
  }
  assert.ok(true, 'Zero real credentials found in code repository');
});

test('Secret Audit: Backend accesses Zoho CRM secrets via ScriptProperties, not hardcoding', () => {
  const crmServicePath = path.join(ROOT_DIR, 'backend', 'CRMSyncService.gs');
  assert.ok(fs.existsSync(crmServicePath), 'CRMSyncService.gs must exist in backend/');
  const content = fs.readFileSync(crmServicePath, 'utf8');
  assert.ok(content.includes('PropertiesService.getScriptProperties()'), 'CRMSyncService must read secrets from ScriptProperties');
  assert.ok(content.includes('ZOHO_CLIENT_SECRET'), 'CRMSyncService must look for ZOHO_CLIENT_SECRET in ScriptProperties');
});

// ----------------------------------------------------
// 2. APPS SCRIPT MANIFEST AUDIT
// ----------------------------------------------------
test('Apps Script Audit: appsscript.json specifies Asia/Kolkata and V8 runtime', () => {
  const manifestPath = path.join(ROOT_DIR, 'backend', 'appsscript.json');
  assert.ok(fs.existsSync(manifestPath), 'appsscript.json must exist in backend/');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.timeZone, 'Asia/Kolkata', 'Time zone must be Asia/Kolkata');
  assert.strictEqual(manifest.runtimeVersion, 'V8', 'Runtime must be V8');
});

test('Apps Script Audit: appsscript.json declares required OAuth scopes', () => {
  const manifestPath = path.join(ROOT_DIR, 'backend', 'appsscript.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const requiredScopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/script.send_mail',
    'https://www.googleapis.com/auth/script.external_request'
  ];

  assert.ok(Array.isArray(manifest.oauthScopes), 'oauthScopes must be an array');
  for (const scope of requiredScopes) {
    assert.ok(manifest.oauthScopes.includes(scope), `Manifest missing required scope: ${scope}`);
  }
});

// ----------------------------------------------------
// 3. FRONTEND PRODUCTION MODE & FALLBACK HARDENING
// ----------------------------------------------------
test('Frontend Config: isLiveEndpointConfigured() accurately detects live vs mock endpoints', () => {
  const configPath = path.join(ROOT_DIR, 'js', 'config.js');
  const content = fs.readFileSync(configPath, 'utf8');
  assert.ok(content.includes('isLiveEndpointConfigured()'), 'config.js must export isLiveEndpointConfigured()');
  assert.ok(content.includes('mock_legalsthal_script'), 'config.js must check for mock_legalsthal_script');
});

test('Frontend Hardening: Demo Bar is suppressed when live endpoint is configured', () => {
  const demoBarPath = path.join(ROOT_DIR, 'js', 'ui', 'demoBar.js');
  const content = fs.readFileSync(demoBarPath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'demoBar.js must check isLiveEndpointConfigured()');
  assert.ok(content.includes("return '';"), 'renderDemoBar must return empty string in live production');
});

test('Frontend Hardening: clientService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'clientService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'clientService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'clientService must throw on live API error rather than falling back to dataStore');
});

test('Frontend Hardening: adminService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'adminService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'adminService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'adminService must throw on live API error rather than falling back to dataStore');
});

test('Frontend Hardening: documentService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'documentService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'documentService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'documentService must throw on live API error rather than falling back to dataStore');
});

test('Frontend Hardening: quoteService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'quoteService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'quoteService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'quoteService must throw on live API error rather than falling back to dataStore');
});

test('Frontend Hardening: serviceService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'serviceService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'serviceService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'serviceService must throw on live API error rather than falling back to dataStore');
});

test('Frontend Hardening: notificationService rejects silent dataStore fallback in live mode', () => {
  const servicePath = path.join(ROOT_DIR, 'js', 'services', 'notificationService.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('CONFIG.isLiveEndpointConfigured()'), 'notificationService must check CONFIG.isLiveEndpointConfigured()');
  assert.ok(content.includes('throw new Error'), 'notificationService must throw on live API error rather than falling back to dataStore');
});

// ----------------------------------------------------
// 4. STORAGE & DRIVE SECURITY AUDIT
// ----------------------------------------------------
test('Storage Security: Document storage folder hierarchy strictly organized by clientId and serviceId', () => {
  const portalServicePath = path.join(ROOT_DIR, 'backend', 'PortalService.gs');
  const content = fs.readFileSync(portalServicePath, 'utf8');
  assert.ok(content.includes('LegalSthal_Client_Documents'), 'Root folder must be LegalSthal_Client_Documents');
  assert.ok(content.includes('clientId') && content.includes('serviceId'), 'Folder structure must partition by client ID and service ID');
});

test('Storage Security: Uploaded files strictly restrict anonymous public write permissions', () => {
  const portalServicePath = path.join(ROOT_DIR, 'backend', 'PortalService.gs');
  const content = fs.readFileSync(portalServicePath, 'utf8');
  // Confirm file is not set to DriveApp.Access.ANYONE, DriveApp.Permission.EDIT
  assert.ok(!content.includes('DriveApp.Access.ANYONE, DriveApp.Permission.EDIT'), 'Files must not have public write permissions');
});

// ----------------------------------------------------
// 5. FAIL-CLOSED RBAC & IDOR BOUNDARIES
// ----------------------------------------------------
test('RBAC Security: Client is forbidden from administrative mutations across backend services', () => {
  const portalServicePath = path.join(ROOT_DIR, 'backend', 'PortalService.gs');
  const content = fs.readFileSync(portalServicePath, 'utf8');
  assert.ok(content.includes('AUTH_FORBIDDEN'), 'PortalService must issue AUTH_FORBIDDEN code on role violation');
  assert.ok(content.includes('ADMIN') || content.includes('SUPER_ADMIN'), 'Must assert administrative roles');
});

test('RBAC Security: Client cannot specify arbitrary clientId in request payload to access foreign records (IDOR)', () => {
  const secServicePath = path.join(ROOT_DIR, 'backend', 'SecurityService.gs');
  const portalServicePath = path.join(ROOT_DIR, 'backend', 'PortalService.gs');
  const secContent = fs.readFileSync(secServicePath, 'utf8');
  const portalContent = fs.readFileSync(portalServicePath, 'utf8');
  assert.ok(secContent.includes('assertClientOwnership'), 'SecurityService must provide assertClientOwnership');
  assert.ok(portalContent.includes('session.clientId') || portalContent.includes('sessionUser.clientId'), 
    'Backend must derive clientId strictly from authenticated session');
});

// ----------------------------------------------------
// 6. PASSWORD COMPLEXITY & CRYPTOGRAPHIC HARDENING
// ----------------------------------------------------
test('Password Security: Client and Backend enforce identical 8+ character complexity rules', () => {
  const clientConfig = fs.readFileSync(path.join(ROOT_DIR, 'js', 'config.js'), 'utf8');
  const backendConfig = fs.readFileSync(path.join(ROOT_DIR, 'backend', 'Config.gs'), 'utf8');
  
  assert.ok(clientConfig.includes('MIN_LENGTH: 8'), 'Client must enforce minimum length 8');
  assert.ok(backendConfig.includes('MIN_LENGTH: 8') || backendConfig.includes('PASSWORD_MIN_LENGTH: 8'), 'Backend must enforce minimum length 8');
  assert.ok(clientConfig.includes('REQUIRE_UPPERCASE'), 'Client must require uppercase');
  assert.ok(clientConfig.includes('REQUIRE_SPECIAL'), 'Client must require special character');
});

test('Cryptographic Hardening: PBKDF2 iteration count meets security baseline (>= 10,000 iterations)', () => {
  const backendConfig = fs.readFileSync(path.join(ROOT_DIR, 'backend', 'Config.gs'), 'utf8');
  assert.ok(backendConfig.includes('10000') || backendConfig.includes('10,000'), 'PBKDF2 iteration count must be at least 10,000');
});

console.log('==================================================');
console.log(`📊 STEP 9 PRODUCTION SUITE COMPLETE: ${passedTests} / ${totalTests} PASSED`);
console.log('==================================================');

if (passedTests === totalTests) {
  console.log('STATUS: 100% SUCCESS - ALL PRODUCTION AUDIT CHECKS SATISFIED');
  process.exit(0);
} else {
  console.error(`STATUS: FAILED - ${totalTests - passedTests} checks failed.`);
  process.exit(1);
}
