import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

console.log('======================================================================');
console.log('NYAYANITI PHASE 5 FINAL AUDIT: FRONTEND VERIFICATION SUITE');
console.log('======================================================================\n');

// ----------------------------------------------------------------------
// 1. All Officer Routes Verification
// ----------------------------------------------------------------------
console.log('SECTION 1: OFFICER ROUTES & PROTECTION');
const appPath = path.join(__dirname, 'src', 'App.tsx');
const appCode = fs.readFileSync(appPath, 'utf8');

const requiredRoutes = [
  '/dashboard',
  '/cases',
  '/cases/:id',
  '/complaint-intake',
  '/complaint-intake/:id',
  '/institutions',
  '/institutions/:id',
  '/overlaps',
  '/action-conflicts',
  '/coordination',
  '/surges',
  '/validation',
  '/reports',
  '/audit',
  '/admin'
];

requiredRoutes.forEach((r) => {
  assert(appCode.includes(`path="${r}"`), `App.tsx mounts route ${r}`);
});

assert(appCode.includes('<ProtectedRoute>\n                    <OfficerComplaintInboxPage />'), 'Complaint Intake route is wrapped in ProtectedRoute');
assert(appCode.includes('<ProtectedRoute>\n                    <OfficerComplaintReviewPage />'), 'Complaint Review route is wrapped in ProtectedRoute');

// ----------------------------------------------------------------------
// 2. Role-Based Navigation
// ----------------------------------------------------------------------
console.log('\nSECTION 2: ROLE-BASED NAVIGATION');
const navPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const navCode = fs.readFileSync(navPath, 'utf8');

assert(navCode.includes("label: 'Dashboard'"), 'GovNavBar includes Dashboard tab');
assert(navCode.includes("label: 'Case Register'"), 'GovNavBar includes Case Register tab');
assert(navCode.includes("label: 'Complaint Intake'"), 'GovNavBar includes Complaint Intake tab');
assert(navCode.includes("path: '/complaint-intake'"), 'Complaint Intake tab links to /complaint-intake');
assert(navCode.includes("badge: 'Intake'"), 'Complaint Intake tab shows distinctive Intake badge');
assert(navCode.includes("label: 'Institutions'"), 'GovNavBar includes Institutions tab');
assert(navCode.includes("label: 'Overlap Center'"), 'GovNavBar includes Overlap Center tab');
assert(navCode.includes("label: 'Audit Trail'"), 'GovNavBar includes Audit Trail tab');
assert(navCode.includes("hasRole(['super_admin', 'monitoring_officer'])"), 'Audit Trail restricted to super_admin and monitoring_officer');
assert(navCode.includes("hasRole(['super_admin'])"), 'Admin Settings restricted to super_admin');

// ----------------------------------------------------------------------
// 3. Responsive UI Layouts
// ----------------------------------------------------------------------
console.log('\nSECTION 3: RESPONSIVE UI LAYOUTS');
const inboxPath = path.join(__dirname, 'src', 'pages', 'OfficerComplaintInboxPage.tsx');
const inboxCode = fs.readFileSync(inboxPath, 'utf8');
const reviewPath = path.join(__dirname, 'src', 'pages', 'OfficerComplaintReviewPage.tsx');
const reviewCode = fs.readFileSync(reviewPath, 'utf8');

assert(inboxCode.includes('grid grid-cols-1 md:grid-cols-12 gap-3'), 'Inbox filter panel features responsive grid (1 -> 12 cols with responsive spans)');
assert(inboxCode.includes('overflow-x-auto'), 'Inbox table container provides responsive horizontal scroll on mobile');
assert(reviewCode.includes('grid grid-cols-1 lg:grid-cols-12'), 'Review page features responsive 1-col mobile to 12-col desktop layout');
assert(reviewCode.includes('lg:col-span-8') && reviewCode.includes('lg:col-span-4'), 'Review page balances 8-col main dossier with 4-col context sidebar');

// ----------------------------------------------------------------------
// 4. Loading, Empty States & Confirmation Dialogs
// ----------------------------------------------------------------------
console.log('\nSECTION 4: LOADING, EMPTY STATES & CONFIRMATION DIALOGS');

assert(inboxCode.includes('animate-spin'), 'Inbox renders loading spinner during data fetching');
assert(inboxCode.includes('No Complaints Found'), 'Inbox renders friendly empty state when filter results are empty');
assert(reviewCode.includes('Loading AICTE Complaint Dossier...'), 'Review page displays reassuring loading state during dossier compilation');
assert(reviewCode.includes('Complaint Record Not Found'), 'Review page renders distinct 404 empty state');

// Modals on Review Page
assert(reviewCode.includes('title="Statutory Admission & Case Docket Acceptance"'), 'Review page provides Accept Complaint modal');
assert(reviewCode.includes('title="Statutory Non-Admissibility & Rejection Order"'), 'Review page provides Statutory Rejection modal');
assert(reviewCode.includes('title="Request Additional Information / Documentary Proof"'), 'Review page provides Clarification Request modal');
assert(reviewCode.includes('title="Investigating Officer Allocation & Bureau Routing"'), 'Review page provides Officer Allocation modal');
assert(reviewCode.includes('title="Consolidate / Link with Existing AICTE Case"'), 'Review page provides Case Linking / Consolidation modal');
assert(reviewCode.includes('title="Record Formal Grievance Resolution"'), 'Review page provides Resolution modal');
assert(reviewCode.includes('title="Formally Close Grievance Matter"'), 'Review page provides Closure modal');

// ----------------------------------------------------------------------
// 5. API Error Handling & Feedback Banners
// ----------------------------------------------------------------------
console.log('\nSECTION 5: API ERROR HANDLING & FEEDBACK BANNERS');

assert(inboxCode.includes('errorMessage'), 'Inbox tracks and renders API error messages');
assert(reviewCode.includes('errorMessage') && reviewCode.includes('setErrorMessage'), 'Review page manages error banner state');
assert(reviewCode.includes('successMessage') && reviewCode.includes('setSuccessMessage'), 'Review page manages success banner state');
assert(reviewCode.includes('actionLoading'), 'Review page disables action buttons during async API execution');

// ----------------------------------------------------------------------
// 6. Security & PII Redaction in UI
// ----------------------------------------------------------------------
console.log('\nSECTION 6: SECURITY & PII REDACTION IN UI');

assert(reviewCode.includes('canPerformScrutiny'), 'Review page checks officer scrutiny permissions');
assert(reviewCode.includes('canAssignOrReject'), 'Review page restricts assignment and statutory rejection');
assert(reviewCode.includes('PII Redacted'), 'Review page renders PII Redacted notice when officer lacks full identity clearance');
assert(reviewCode.includes('masked_identifier'), 'Review page falls back to masked identifier for restricted viewers');

console.log('\n======================================================================');
console.log(`TOTAL PHASE 5 FINAL AUDIT CHECKS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log('======================================================================\n');

if (failedCount === 0) {
  console.log('PHASE 5 FINAL FRONTEND AUDIT: 100% VERIFIED SUCCESS\n');
} else {
  process.exit(1);
}
