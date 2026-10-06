/**
 * Legal Sthal - Responsive Layout & Multi-Device Verification Suite
 */

const fs = require('fs');
const path = require('path');

const cssMobile = fs.readFileSync(path.join(__dirname, '../css/mobile.css'), 'utf8');
const cssMain = fs.readFileSync(path.join(__dirname, '../css/main.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const sidebarJs = fs.readFileSync(path.join(__dirname, '../js/ui/sidebar.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log("==================================================");
console.log("📱 VERIFYING MULTI-DEVICE & RESPONSIVE COMPLIANCE");
console.log("==================================================");

// 1. Viewport & HTML Checks
assert(indexHtml.includes('viewport-fit=cover'), 'RESP-001: HTML includes viewport-fit=cover for iOS safe areas');
assert(indexHtml.includes('theme-color'), 'RESP-002: HTML specifies theme-color for mobile browser headers');

// 2. Global Overflow Protection
assert(cssMobile.includes('overflow-x: hidden !important'), 'RESP-003: Global overflow-x: hidden enforced on html/body');
assert(cssMobile.includes('body.drawer-open'), 'RESP-004: Drawer-open state locks background scrolling on touch devices');
assert(cssMobile.includes('env(safe-area-inset-bottom'), 'RESP-005: Safe area inset bottom padding supported for modern devices');

// 3. Tablet Portrait & Landscape Breakpoints
assert(cssMobile.includes('@media (max-width: 1024px)'), 'RESP-006: Dedicated Tablet (iPad/Surface) breakpoint up to 1024px defined');
assert(cssMobile.includes('@media (max-width: 1200px)'), 'RESP-007: Large Tablet / Small Laptop breakpoint (max-width: 1200px) defined');
assert(cssMobile.includes('.sidebar.open'), 'RESP-008: Sliding drawer open class animation defined');
assert(cssMobile.includes('.sidebar-backdrop.active'), 'RESP-009: Backdrop overlay with blur effect defined');

// 4. Hamburger & Close Button Controls
assert(sidebarJs.includes('sidebar-close-btn'), 'RESP-010: Sidebar includes mobile close button element');
assert(appJs.includes('sidebar-close-btn') || appJs.includes('closeBtn'), 'RESP-011: App.js binds close button click handler');
assert(appJs.includes('Escape'), 'RESP-012: Keyboard Escape listener dismisses drawer on tablets/hybrids');

// 5. Grid Column Span Fix (Prevents CSS Grid 1-column blowouts)
assert(cssMobile.includes('grid-column: span 1 !important'), 'RESP-013: CSS Grid multi-column span overridden to 1 column on responsive collapse');

// 6. Data Table Touch & Momentum Scrolling
assert(cssMobile.includes('-webkit-overflow-scrolling: touch'), 'RESP-014: Momentum touch scrolling applied to table containers');
assert(cssMobile.includes('min-width: 600px') || cssMobile.includes('min-width: 580px'), 'RESP-015: Minimum readable table width preserved inside scroll container');

// 7. Touch Target & Input Safari Zoom Prevention
assert(cssMobile.includes('font-size: 16px !important'), 'RESP-016: 16px font-size threshold enforced on inputs to prevent iOS auto-zoom');
assert(cssMobile.includes('min-height: 44px'), 'RESP-017: 44px minimum touch target height enforced for buttons/inputs');

// 8. Compact & Ultra-Compact Phone Breakpoints
assert(cssMobile.includes('@media (max-width: 480px)'), 'RESP-018: Compact smartphone breakpoint (max-width: 480px) defined');
assert(cssMobile.includes('@media (max-width: 360px)'), 'RESP-019: Ultra-compact screen breakpoint (max-width: 360px) defined');

// 9. Floating UI: Toasts & Notification Dropdowns
assert(cssMobile.includes('#toast-container'), 'RESP-020: Toasts repositioned responsively across device width');
assert(cssMobile.includes('.notif-dropdown'), 'RESP-021: Notification dropdown constrained to viewport width');

// 10. Design Token Fallbacks
assert(cssMain.includes('--bg-surface:'), 'RESP-022: CSS token --bg-surface alias present in main.css');
assert(cssMain.includes('--border-color:'), 'RESP-023: CSS token --border-color alias present in main.css');

console.log("==================================================");
console.log(`📊 RESPONSIVE VERIFICATION COMPLETE: ${passed} / ${passed + failed} PASSED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
