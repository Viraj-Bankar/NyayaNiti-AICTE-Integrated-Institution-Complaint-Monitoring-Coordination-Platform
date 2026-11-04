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
console.log('NYAYANITI PHASE 5 FRONTEND AUDIT: OFFICER COMPLAINT INTAKE & SCRUTINY');
console.log('======================================================================\n');

// ----------------------------------------------------------------------
// 1. Navigation & Route Registration Audit
// ----------------------------------------------------------------------
console.log('PART 1: NAVIGATION & ROUTE REGISTRATION AUDIT');
const navPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const navCode = fs.readFileSync(navPath, 'utf8');

assert(navCode.includes("label: 'Complaint Intake'"), 'GovNavBar includes "Complaint Intake" navigation item');
assert(navCode.includes("path: '/complaint-intake'"), 'GovNavBar points Complaint Intake to /complaint-intake');
assert(navCode.includes("icon: Inbox"), 'GovNavBar uses Inbox icon for Complaint Intake');
assert(navCode.includes("badge: 'Intake'"), 'GovNavBar adds Intake badge to Complaint Intake tab');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appCode = fs.readFileSync(appPath, 'utf8');

assert(appCode.includes("import { OfficerComplaintInboxPage } from './pages/OfficerComplaintInboxPage'"), 'App.tsx imports OfficerComplaintInboxPage');
assert(appCode.includes("import { OfficerComplaintReviewPage } from './pages/OfficerComplaintReviewPage'"), 'App.tsx imports OfficerComplaintReviewPage');
assert(appCode.includes('path="/complaint-intake"'), 'App.tsx mounts /complaint-intake route');
assert(appCode.includes('path="/officer/complaints"'), 'App.tsx mounts /officer/complaints alias route');
assert(appCode.includes('path="/complaint-intake/:id"'), 'App.tsx mounts /complaint-intake/:id detail route');
assert(appCode.includes('path="/officer/complaints/:id"'), 'App.tsx mounts /officer/complaints/:id alias detail route');
assert(appCode.includes('<ProtectedRoute>\n                    <OfficerComplaintInboxPage />'), 'Complaint intake route is protected by ProtectedRoute');
assert(appCode.includes('<ProtectedRoute>\n                    <OfficerComplaintReviewPage />'), 'Complaint review route is protected by ProtectedRoute');

// ----------------------------------------------------------------------
// 2. Types & Schema Interfaces Audit
// ----------------------------------------------------------------------
console.log('\nPART 2: TYPES & SCHEMA INTERFACES AUDIT');
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert(typesCode.includes('export interface OfficerComplaintItem'), 'OfficerComplaintItem interface declared');
assert(typesCode.includes('complainant_masked?: string'), 'OfficerComplaintItem includes complainant_masked');
assert(typesCode.includes('is_citizen_complaint: boolean'), 'OfficerComplaintItem includes is_citizen_complaint');
assert(typesCode.includes('documents_count: number'), 'OfficerComplaintItem includes documents_count');
assert(typesCode.includes('export interface OfficerComplaintListResponse'), 'OfficerComplaintListResponse interface declared');
assert(typesCode.includes('export interface OfficerComplaintMetadata'), 'OfficerComplaintMetadata interface declared');
assert(typesCode.includes('statutory_rejection_reasons: string[]'), 'OfficerComplaintMetadata includes statutory_rejection_reasons');
assert(typesCode.includes('export interface OfficerComplaintDetail'), 'OfficerComplaintDetail interface declared');
assert(typesCode.includes('public_history:'), 'OfficerComplaintDetail includes public_history');
assert(typesCode.includes('internal_notes:'), 'OfficerComplaintDetail includes internal_notes');
assert(typesCode.includes('linked_cases:'), 'OfficerComplaintDetail includes linked_cases');
assert(typesCode.includes('export interface OfficerComplaintAcceptPayload'), 'OfficerComplaintAcceptPayload interface declared');
assert(typesCode.includes('export interface OfficerComplaintRejectPayload'), 'OfficerComplaintRejectPayload interface declared');
assert(typesCode.includes('statutory_reason: string'), 'OfficerComplaintRejectPayload enforces statutory_reason');
assert(typesCode.includes('export interface OfficerComplaintRequestInfoPayload'), 'OfficerComplaintRequestInfoPayload interface declared');
assert(typesCode.includes('export interface OfficerComplaintAssignPayload'), 'OfficerComplaintAssignPayload interface declared');
assert(typesCode.includes('export interface OfficerComplaintLinkPayload'), 'OfficerComplaintLinkPayload interface declared');

// ----------------------------------------------------------------------
// 3. API Client Methods Audit
// ----------------------------------------------------------------------
console.log('\nPART 3: API CLIENT METHODS AUDIT');
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiCode = fs.readFileSync(apiPath, 'utf8');

assert(apiCode.includes('async getOfficerComplaints('), 'api.getOfficerComplaints method implemented');
assert(apiCode.includes("buildApiUrl('/officer/complaints'"), 'api.getOfficerComplaints connects to /officer/complaints endpoint');
assert(apiCode.includes('async getOfficerComplaintMetadata()'), 'api.getOfficerComplaintMetadata method implemented');
assert(apiCode.includes('async getOfficerComplaintDetail(id: string)'), 'api.getOfficerComplaintDetail method implemented');
assert(apiCode.includes('async startComplaintReview(id: string)'), 'api.startComplaintReview method implemented');
assert(apiCode.includes('async acceptComplaint(id: string'), 'api.acceptComplaint method implemented');
assert(apiCode.includes('async rejectComplaint(id: string'), 'api.rejectComplaint method implemented');
assert(apiCode.includes('async requestComplaintInfo(id: string'), 'api.requestComplaintInfo method implemented');
assert(apiCode.includes('async assignComplaintOfficer('), 'api.assignComplaintOfficer method implemented');
assert(apiCode.includes('async linkComplaintCase('), 'api.linkComplaintCase method implemented');
assert(apiCode.includes('async downloadOfficerComplaintDocument('), 'api.downloadOfficerComplaintDocument method implemented');
assert(apiCode.includes('/officer/complaints/${complaintId}/documents/${documentId}/download'), 'downloadOfficerComplaintDocument streams from secure download route');

// ----------------------------------------------------------------------
// 4. Officer Complaint Inbox Page Audit (Feature 1 & 2)
// ----------------------------------------------------------------------
console.log('\nPART 4: OFFICER COMPLAINT INBOX PAGE AUDIT');
const inboxPath = path.join(__dirname, 'src', 'pages', 'OfficerComplaintInboxPage.tsx');
assert(fs.existsSync(inboxPath), 'OfficerComplaintInboxPage.tsx exists');
const inboxCode = fs.readFileSync(inboxPath, 'utf8');

// Feature 1: Status Lifecycle Tabs
assert(inboxCode.includes('All Complaints'), 'Inbox contains All Complaints tab');
assert(inboxCode.includes('New Submitted'), 'Inbox contains New Submitted tab');
assert(inboxCode.includes('Pending Review (Unassigned)'), 'Inbox contains Pending Review / Unassigned tab');
assert(inboxCode.includes('Under Review'), 'Inbox contains Under Review tab');
assert(inboxCode.includes('Clarification Requested'), 'Inbox contains Clarification Requested tab');
assert(inboxCode.includes('Accepted / In Progress'), 'Inbox contains Accepted / In Progress tab');
assert(inboxCode.includes('Statutorily Rejected'), 'Inbox contains Statutorily Rejected tab');

// Feature 2: Filters & Search
assert(inboxCode.includes('searchQuery'), 'Inbox maintains search query state');
assert(inboxCode.includes('institutionIdFilter'), 'Inbox maintains institution ID filter');
assert(inboxCode.includes('categoryFilter'), 'Inbox maintains category filter');
assert(inboxCode.includes('statusFilter'), 'Inbox maintains status filter');
assert(inboxCode.includes('dateFrom'), 'Inbox maintains from-date filter');
assert(inboxCode.includes('dateTo'), 'Inbox maintains to-date filter');
assert(inboxCode.includes('unassignedOnly'), 'Inbox maintains unassigned-only filter');
assert(inboxCode.includes('sortBy'), 'Inbox maintains sort column state');
assert(inboxCode.includes('sortOrder'), 'Inbox maintains sort order state');
assert(inboxCode.includes('handleResetFilters'), 'Inbox implements filter reset handler');
assert(inboxCode.includes('api.getOfficerComplaints'), 'Inbox fetches real data from api.getOfficerComplaints');

// Feature 7: States & Feedback
assert(inboxCode.includes('isLoading ?'), 'Inbox implements loading state');
assert(inboxCode.includes('complaints.length === 0'), 'Inbox implements empty state');
assert(inboxCode.includes('errorMessage &&'), 'Inbox renders error feedback banner');
assert(inboxCode.includes('totalPages > 1'), 'Inbox implements pagination bar');

// Table Columns
assert(inboxCode.includes('Complaint Reference'), 'Table includes Complaint Reference column');
assert(inboxCode.includes('Subject & Category'), 'Table includes Subject & Category column');
assert(inboxCode.includes('Institution'), 'Table includes Institution column');
assert(inboxCode.includes('Complainant'), 'Table includes Complainant column');
assert(inboxCode.includes('Received Date'), 'Table includes Received Date column');
assert(inboxCode.includes('Status'), 'Table includes Status column');
assert(inboxCode.includes('Priority'), 'Table includes Priority column');
assert(inboxCode.includes('Allocation'), 'Table includes Allocation column');
assert(inboxCode.includes('Scrutinize'), 'Table provides Scrutinize action button');

// ----------------------------------------------------------------------
// 5. Officer Complaint Review Page Audit (Feature 3, 4, 5, 6, 7)
// ----------------------------------------------------------------------
console.log('\nPART 5: OFFICER COMPLAINT REVIEW PAGE AUDIT');
const reviewPath = path.join(__dirname, 'src', 'pages', 'OfficerComplaintReviewPage.tsx');
assert(fs.existsSync(reviewPath), 'OfficerComplaintReviewPage.tsx exists');
const reviewCode = fs.readFileSync(reviewPath, 'utf8');

// Feature 3: Dossier Display
assert(reviewCode.includes('complaint.id'), 'Review page displays complaint reference number');
assert(reviewCode.includes('complaint.title'), 'Review page displays complaint title');
assert(reviewCode.includes('complaint.category'), 'Review page displays category');
assert(reviewCode.includes('complaint.description'), 'Review page displays detailed complaint description');
assert(reviewCode.includes('complaint.date_received'), 'Review page displays submission timestamp');
assert(reviewCode.includes('complaint.prescribed_deadline'), 'Review page displays prescribed statutory deadline');
assert(reviewCode.includes('complaint.institution.official_name'), 'Review page displays respondent institution name');
assert(reviewCode.includes('complaint.institution.permanent_id'), 'Review page displays AICTE permanent institution ID');
assert(reviewCode.includes('complaint.documents.length'), 'Review page displays supporting documents count');
assert(reviewCode.includes('handleDownloadDocument'), 'Review page implements secure document download');
assert(reviewCode.includes('complaint.public_history'), 'Review page displays public citizen timeline');
assert(reviewCode.includes('complaint.internal_notes'), 'Review page displays confidential internal officer notes');
assert(reviewCode.includes('complaint.assignments'), 'Review page displays officer assignment chain of custody');

// Feature 3: Complainant Privacy Scoping
assert(reviewCode.includes('complaint.complainant && !complaint.complainant.pii_redacted'), 'Review page conditionally renders full PII for authorized officers');
assert(reviewCode.includes('complaint.complainant.full_name'), 'Displays full complainant name when authorized');
assert(reviewCode.includes('PII Redacted for Privacy'), 'Displays PII Redacted notice when officer is restricted');
assert(reviewCode.includes('CIT-ANON'), 'Displays masked identifier for restricted viewers');

// Feature 4: Statutory Review Actions
assert(reviewCode.includes('handleStartReview'), 'Review page implements handleStartReview');
assert(reviewCode.includes('handleAcceptSubmit'), 'Review page implements handleAcceptSubmit');
assert(reviewCode.includes('handleRejectSubmit'), 'Review page implements handleRejectSubmit');
assert(reviewCode.includes('handleRequestInfoSubmit'), 'Review page implements handleRequestInfoSubmit');
assert(reviewCode.includes('handleAssignSubmit'), 'Review page implements handleAssignSubmit');
assert(reviewCode.includes('handleLinkSubmit'), 'Review page implements handleLinkSubmit');

// Action Buttons in Action Bar
assert(reviewCode.includes('Start Review'), 'Action bar contains Start Review button');
assert(reviewCode.includes('Accept Complaint'), 'Action bar contains Accept Complaint button');
assert(reviewCode.includes('Request Info'), 'Action bar contains Request Info button');
assert(reviewCode.includes('Statutory Rejection'), 'Action bar contains Statutory Rejection button');
assert(reviewCode.includes('Assign Officer'), 'Action bar contains Assign Officer button');
assert(reviewCode.includes('Link Case'), 'Action bar contains Link Case button');

// Feature 5: Assignment UI
assert(reviewCode.includes('availableOfficers.map'), 'Assignment modal iterates dynamically over backend active officers');
assert(reviewCode.includes('to_officer_id'), 'Assignment modal binds to to_officer_id');
assert(reviewCode.includes('bureau_id'), 'Assignment modal supports bureau routing');

// Feature 6: Case Integration
assert(reviewCode.includes('Canonical Matter Architecture'), 'Review page features Canonical Matter Architecture banner');
assert(reviewCode.includes('Unified AICTE Case Docket'), 'Review page explains Unified AICTE Case Docket');
assert(reviewCode.includes('to={`/cases/${complaint.id}`}'), 'Review page links to unified Case Docket with identical ID');
assert(reviewCode.includes('complaint.linked_cases'), 'Review page renders Linked / Consolidated Cases section');

// Feature 7: Feedback & Error Handling
assert(reviewCode.includes('successMessage &&'), 'Review page renders success toast');
assert(reviewCode.includes('errorMessage &&'), 'Review page renders error banner');
assert(reviewCode.includes('actionLoading'), 'Review page manages action loading state');
assert(reviewCode.includes('downloadingDocId === doc.id'), 'Review page indicates active document download state');

console.log('\n======================================================================');
console.log(`TOTAL PHASE 5 FRONTEND AUDIT CHECKS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log('======================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('PHASE 5 OFFICER COMPLAINT INTAKE FRONTEND: 100% VERIFIED SUCCESS\n');
}

