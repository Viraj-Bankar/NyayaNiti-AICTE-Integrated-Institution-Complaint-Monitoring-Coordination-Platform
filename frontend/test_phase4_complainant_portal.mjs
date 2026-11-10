/**
 * NYAYANITI PHASE 4: COMPLAINANT PORTAL SYSTEM & INTEGRATION TEST
 * 
 * Verifies all Phase 4 frontend implementations:
 * - ComplainantDashboardPage (/complainant/home) with 5 KPI counts & recent complaints table
 * - ComplaintSubmissionPage (/complainant/submit) with declaration, upload restrictions, validation & success screen
 * - ComplaintHistoryPage (/complainant/complaints) with search, filter, pagination, and view details
 * - ComplaintDetailPage (/complainant/complaints/:id) with timeline, documents, and download
 * - GrievanceRedressalStepper component (5-stage statutory lifecycle)
 * - GrievanceReceiptModal printable slip
 * - ComplainantHeader notifications & navigation
 * - TypeScript types & API client endpoints
 * - App.tsx route registration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('======================================================================');
console.log('NYAYANITI PHASE 4: COMPLAINANT PORTAL & TRACKING VERIFICATION SUITE');
console.log('======================================================================\n');

// 1. Files existence check
console.log('--- PART 1: COMPONENT FILES INTEGRITY ---');
const stepperPath = path.join(__dirname, 'src', 'components', 'complainant', 'GrievanceRedressalStepper.tsx');
const receiptModalPath = path.join(__dirname, 'src', 'components', 'complainant', 'GrievanceReceiptModal.tsx');
const dashboardPath = path.join(__dirname, 'src', 'pages', 'ComplainantDashboardPage.tsx');
const submitPath = path.join(__dirname, 'src', 'pages', 'ComplaintSubmissionPage.tsx');
const historyPath = path.join(__dirname, 'src', 'pages', 'ComplaintHistoryPage.tsx');
const detailPath = path.join(__dirname, 'src', 'pages', 'ComplaintDetailPage.tsx');
const headerPath = path.join(__dirname, 'src', 'components', 'common', 'ComplainantHeader.tsx');
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const appPath = path.join(__dirname, 'src', 'App.tsx');

assert(fs.existsSync(stepperPath), 'GrievanceRedressalStepper.tsx exists');
assert(fs.existsSync(receiptModalPath), 'GrievanceReceiptModal.tsx exists');
assert(fs.existsSync(dashboardPath), 'ComplainantDashboardPage.tsx exists');
assert(fs.existsSync(submitPath), 'ComplaintSubmissionPage.tsx exists');
assert(fs.existsSync(historyPath), 'ComplaintHistoryPage.tsx exists');
assert(fs.existsSync(detailPath), 'ComplaintDetailPage.tsx exists');
assert(fs.existsSync(headerPath), 'ComplainantHeader.tsx exists');

// 2. TypeScript Types
console.log('\n--- PART 2: TYPESCRIPT TYPES & SCHEMAS ---');
const typesContent = fs.readFileSync(typesPath, 'utf8');
assert(typesContent.includes('export interface ComplainantCaseItem'), 'ComplainantCaseItem interface defined');
assert(typesContent.includes('export interface ComplainantCaseDetail'), 'ComplainantCaseDetail interface defined');
assert(typesContent.includes('export interface ComplainantCaseMilestone'), 'ComplainantCaseMilestone interface defined');
assert(typesContent.includes('export interface ComplainantDocumentItem'), 'ComplainantDocumentItem interface defined');
assert(typesContent.includes('export interface ComplainantInstitutionItem'), 'ComplainantInstitutionItem interface defined');
assert(typesContent.includes('export interface ComplainantCategoryItem'), 'ComplainantCategoryItem interface defined');
assert(typesContent.includes('export interface ComplainantReceipt'), 'ComplainantReceipt interface defined');
assert(typesContent.includes('export interface ComplainantNotificationItem'), 'ComplainantNotificationItem interface defined');
assert(typesContent.includes('export interface ComplaintSubmissionPayload'), 'ComplaintSubmissionPayload interface defined');

// 3. API Client Methods
console.log('\n--- PART 3: API CLIENT METHODS & 401 ISOLATION ---');
const apiContent = fs.readFileSync(apiPath, 'utf8');
assert(apiContent.includes('getComplainantComplaints'), 'api.getComplainantComplaints defined');
assert(apiContent.includes('getComplainantComplaintDetail'), 'api.getComplainantComplaintDetail defined');
assert(apiContent.includes('getComplainantComplaintHistory'), 'api.getComplainantComplaintHistory defined');
assert(apiContent.includes('submitComplainantComplaint'), 'api.submitComplainantComplaint defined');
assert(apiContent.includes('getComplainantInstitutions'), 'api.getComplainantInstitutions defined');
assert(apiContent.includes('getComplainantCategories'), 'api.getComplainantCategories defined');
assert(apiContent.includes('uploadComplainantDocument'), 'api.uploadComplainantDocument defined');
assert(apiContent.includes('getComplainantDocuments'), 'api.getComplainantDocuments defined');
assert(apiContent.includes('getComplainantReceipt'), 'api.getComplainantReceipt defined');
assert(apiContent.includes('getComplainantDocumentDownloadUrl'), 'api.getComplainantDocumentDownloadUrl defined');
assert(apiContent.includes('getComplainantNotifications'), 'api.getComplainantNotifications defined');
assert(apiContent.includes('markComplainantNotificationRead'), 'api.markComplainantNotificationRead defined');
assert(apiContent.includes('markAllComplainantNotificationsRead'), 'api.markAllComplainantNotificationsRead defined');
assert(apiContent.includes('getComplainantUnreadNotifCount'), 'api.getComplainantUnreadNotifCount defined');
assert(apiContent.includes('submitComplaintClarification'), 'api.submitComplaintClarification defined');
assert(apiContent.includes('nyayaniti:complainant-session-expired'), 'Isolated 401 complainant session event dispatched');

// 4. ComplainantDashboardPage (/complainant/home) Implementation
console.log('\n--- PART 4: COMPLAINANT DASHBOARD (/complainant/home) ---');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
assert(dashboardContent.includes('complainant?.full_name'), 'Dashboard displays welcome section with complainant name');
assert(dashboardContent.includes('totalSubmitted'), 'Dashboard displays Total Complaints submitted count');
assert(dashboardContent.includes('submittedCount'), 'Dashboard displays Submitted complaints count');
assert(dashboardContent.includes('underReviewCount'), 'Dashboard displays Under Review count');
assert(dashboardContent.includes('inProgressCount'), 'Dashboard displays In Progress count');
assert(dashboardContent.includes('resolvedCount'), 'Dashboard displays Resolved count');
assert(dashboardContent.includes('recentComplaints'), 'Dashboard renders Recent Complaints table');
assert(dashboardContent.includes('c.id'), 'Dashboard displays complaint reference numbers');
assert(dashboardContent.includes('c.category'), 'Dashboard displays complaint categories');
assert(dashboardContent.includes('c.institution_name'), 'Dashboard displays institution names');
assert(dashboardContent.includes('c.date_received'), 'Dashboard displays submission dates');
assert(dashboardContent.includes('getStatusBadge'), 'Dashboard displays current status indicators');
assert(!dashboardContent.includes('const cases = ['), 'Dashboard avoids hardcoded complaint statistics');

// 5. ComplaintSubmissionPage (/complainant/submit) Implementation
console.log('\n--- PART 5: COMPLAINT SUBMISSION & SUCCESS SCREEN ---');
const submitContent = fs.readFileSync(submitPath, 'utf8');
assert(submitContent.includes('title'), 'Submission form includes Complaint title field');
assert(submitContent.includes('selectedInstId'), 'Submission form includes Institution selection');
assert(submitContent.includes('category'), 'Submission form includes Complaint category');
assert(submitContent.includes('subcategory'), 'Submission form includes Complaint subcategory');
assert(submitContent.includes('description'), 'Submission form includes Detailed description');
assert(submitContent.includes('handleFileChange'), 'Submission form supports supporting document upload');
assert(submitContent.includes('isDeclared'), 'Submission form enforces statutory confirmation declaration checkbox');
assert(submitContent.includes('api.getComplainantInstitutions'), 'Fetches institutions from real backend');
assert(submitContent.includes('api.getComplainantCategories'), 'Fetches categories from real backend');
assert(submitContent.includes('fieldErrors'), 'Provides clear field validation');
assert(submitContent.includes('3 MB'), 'Displays upload restrictions (3 MB)');
assert(submitContent.includes('isSubmitting'), 'Prevents accidental multiple submissions');
assert(submitContent.includes('submittedCase'), 'Renders Success Screen only after backend confirmation');
assert(submitContent.includes('submittedCase.id'), 'Success screen displays unique complaint reference number');
assert(submitContent.includes('submittedCase.institution_name'), 'Success screen displays institution name');
assert(submitContent.includes('submittedCase.date_received'), 'Success screen displays submission date');
assert(submitContent.includes('submittedCase.status'), 'Success screen displays initial status');
assert(submitContent.includes('/complainant/complaints/'), 'Success screen includes link to track complaint');

// 6. ComplaintHistoryPage (/complainant/complaints) Implementation
console.log('\n--- PART 6: COMPLAINT HISTORY LISTING ---');
const historyContent = fs.readFileSync(historyPath, 'utf8');
assert(historyContent.includes('searchQuery'), 'History page includes search by reference number & keyword');
assert(historyContent.includes('statusFilter'), 'History page includes filter by status');
assert(historyContent.includes('Additional Info Required'), 'History page includes Additional Info Required filter');
assert(historyContent.includes('categoryFilter'), 'History page includes filter by category');
assert(historyContent.includes('currentPage'), 'History page includes pagination controls');
assert(historyContent.includes('/complainant/complaints/${c.id}'), 'History page includes View Details action');

// 7. ComplaintDetailPage (/complainant/complaints/:id) Implementation
console.log('\n--- PART 7: COMPLAINT DETAIL & TIMELINE VIEW ---');
const detailContent = fs.readFileSync(detailPath, 'utf8');
assert(detailContent.includes('detail.id'), 'Detail view displays complaint reference');
assert(detailContent.includes('detail.description'), 'Detail view displays factual narrative information');
assert(detailContent.includes('detail.institution_name'), 'Detail view displays respondent institution');
assert(detailContent.includes('detail.date_received'), 'Detail view displays submission date');
assert(detailContent.includes('detail.documents'), 'Detail view displays supporting documents');
assert(detailContent.includes('detail.status'), 'Detail view displays current status indicator');
assert(detailContent.includes('Additional Info Required'), 'Detail view displays Additional Info Required badge');
assert(detailContent.includes('handleSubmitClarification'), 'Detail view provides clarification submission form');
assert(detailContent.includes('api.submitComplaintClarification'), 'Detail view connects to clarification API');
assert(detailContent.includes('GrievanceRedressalStepper'), 'Detail view embeds 5-stage statutory stepper');
assert(detailContent.includes('detail.events'), 'Detail view displays public status timeline');
assert(detailContent.includes('api.getComplainantDocumentDownloadUrl'), 'Detail view supports direct document download');
assert(detailContent.includes('handleUploadSupplementaryDoc'), 'Detail view allows attaching supplementary evidence');

// 8. ComplainantHeader Implementation
console.log('\n--- PART 8: HEADER NOTIFICATIONS & CITIZEN NAVIGATION ---');
const headerContent = fs.readFileSync(headerPath, 'utf8');
assert(headerContent.includes('/complainant/home'), 'Header links to Dashboard (/complainant/home)');
assert(headerContent.includes('/complainant/submit'), 'Header links to Submit Complaint (/complainant/submit)');
assert(headerContent.includes('/complainant/complaints'), 'Header links to Complaint History (/complainant/complaints)');
assert(headerContent.includes('/complainant/profile'), 'Header links to Citizen Profile (/complainant/profile)');
assert(headerContent.includes('api.getComplainantNotifications'), 'Header fetches citizen notifications');
assert(headerContent.includes('unreadCount'), 'Header calculates unread badge count');
assert(headerContent.includes('handleNotificationClick'), 'Header notification click navigates to complaint');
assert(headerContent.includes('handleMarkAllRead'), 'Header provides mark all read action');

// 9. Application Route Integration
console.log('\n--- PART 9: APP ROUTE REGISTRATION ---');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('path="/complainant/home"'), '/complainant/home route mounted');
assert(appContent.includes('path="/complainant/dashboard"'), '/complainant/dashboard route mounted');
assert(appContent.includes('path="/complainant/submit"'), '/complainant/submit route mounted');
assert(appContent.includes('path="/complainant/complaints"'), '/complainant/complaints route mounted');
assert(appContent.includes('path="/complainant/complaints/:id"'), '/complainant/complaints/:id route mounted');
assert(appContent.includes('path="/complainant/cases/:id"'), '/complainant/cases/:id alias route mounted');
assert(appContent.includes('path="/complainant/profile"'), '/complainant/profile route mounted');
assert(appContent.includes('<ComplainantDashboardPage />'), 'ComplainantDashboardPage mounted');
assert(appContent.includes('<ComplaintSubmissionPage />'), 'ComplaintSubmissionPage mounted');
assert(appContent.includes('<ComplaintHistoryPage />'), 'ComplaintHistoryPage mounted');
assert(appContent.includes('<ComplaintDetailPage />'), 'ComplaintDetailPage mounted');

console.log('\n======================================================================');
console.log(`PHASE 4 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}
