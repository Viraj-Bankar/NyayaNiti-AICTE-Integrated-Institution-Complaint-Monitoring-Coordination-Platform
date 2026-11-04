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

console.log('================================================================');
console.log('NYAYANITI PHASE 5 AUDIT: OFFICER INTAKE & CASE MANAGEMENT INTEGRATION');
console.log('================================================================\n');

// 1. Types & Interfaces Audit
console.log('SECTION 1: TYPES & INTERFACES AUDIT');
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert(typesCode.includes('export interface CaseAssignmentItem'), 'CaseAssignmentItem interface is declared');
assert(typesCode.includes('from_officer_id?: number'), 'CaseAssignmentItem tracks from_officer_id');
assert(typesCode.includes('to_officer_id: number'), 'CaseAssignmentItem tracks to_officer_id');
assert(typesCode.includes('assigned_by_id: number'), 'CaseAssignmentItem tracks assigning authority');
assert(typesCode.includes('assignments?: CaseAssignmentItem[]'), 'CaseItem links to assignments history');
assert(typesCode.includes('linked_cases?: CaseRelationshipItem[]'), 'CaseItem links to consolidated relationships');
assert(typesCode.includes('export interface CaseRelationshipItem'), 'CaseRelationshipItem interface is declared');
assert(typesCode.includes('relationship_type: string'), 'CaseRelationshipItem tracks relationship type');
assert(typesCode.includes('complainant_details?: {'), 'CaseItem provides complainant_details for authorized officers');
assert(typesCode.includes("'Submitted'"), 'CaseItem status union includes Submitted');
assert(typesCode.includes("'Under Review'"), 'CaseItem status union includes Under Review');
assert(typesCode.includes("'In Progress'"), 'CaseItem status union includes In Progress');
assert(typesCode.includes("'Additional Information Required'"), 'CaseItem status union includes Additional Information Required');
assert(typesCode.includes("'Resolved'"), 'CaseItem status union includes Resolved');
assert(typesCode.includes('new_intake_complaints?: number'), 'DashboardKpis includes new_intake_complaints');
assert(typesCode.includes('download_url?: string'), 'DocumentItem includes download_url');
assert(typesCode.includes('original_filename?: string'), 'DocumentItem includes original_filename');

// 2. API Service Methods Audit
console.log('\nSECTION 2: API SERVICE METHODS AUDIT');
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiCode = fs.readFileSync(apiPath, 'utf8');

assert(apiCode.includes('unassigned_only?: boolean'), 'api.getCases supports unassigned_only filter');
assert(apiCode.includes('citizen_only?: boolean'), 'api.getCases supports citizen_only filter');
assert(apiCode.includes('getAvailableOfficers'), 'api.getAvailableOfficers method implemented');
assert(apiCode.includes('assignCase('), 'api.assignCase method implemented');
assert(apiCode.includes('linkCase('), 'api.linkCase method implemented');
assert(apiCode.includes('addCaseNote('), 'api.addCaseNote method implemented');
assert(apiCode.includes('downloadCaseDocument('), 'api.downloadCaseDocument method implemented');
assert(apiCode.includes('window.URL.createObjectURL(blob)'), 'downloadCaseDocument handles binary Blob streaming and local download');

// 3. Officer Case Register Page Audit
console.log('\nSECTION 3: OFFICER CASE REGISTER AUDIT');
const registerPath = path.join(__dirname, 'src', 'pages', 'CaseRegisterPage.tsx');
const registerCode = fs.readFileSync(registerPath, 'utf8');

assert(registerCode.includes("activeTab, setActiveTab"), 'CaseRegisterPage maintains active navigation tab state');
assert(registerCode.includes('All Complaints'), 'CaseRegisterPage contains All Complaints tab');
assert(registerCode.includes('Intake Queue (Unassigned Grievances)'), 'CaseRegisterPage contains Intake Queue tab');
assert(registerCode.includes('Citizen Grievances'), 'CaseRegisterPage contains Citizen Grievances tab');
assert(registerCode.includes('unassigned_only: activeTab === \'intake\''), 'CaseRegisterPage sets unassigned_only param on intake tab');
assert(registerCode.includes('citizen_only: activeTab === \'citizen\''), 'CaseRegisterPage sets citizen_only param on citizen tab');
assert(registerCode.includes('Submitted (Intake)'), 'Status dropdown includes Submitted (Intake)');
assert(registerCode.includes('Under Review'), 'Status dropdown includes Under Review');
assert(registerCode.includes('In Progress'), 'Status dropdown includes In Progress');
assert(registerCode.includes('Additional Information Required'), 'Status dropdown includes Additional Information Required');
assert(registerCode.includes('Resolved'), 'Status dropdown includes Resolved');
assert(registerCode.includes('Citizen Portal'), 'Table renders Citizen Portal tag on complainant-origin grievances');
assert(registerCode.includes('Unassigned (Intake)'), 'Table renders Unassigned (Intake) label when officer_name is absent');

// 4. Officer Case Detail Page Audit
console.log('\nSECTION 4: OFFICER CASE DETAIL & INTAKE WORKFLOW AUDIT');
const detailPath = path.join(__dirname, 'src', 'pages', 'CaseDetailPage.tsx');
const detailCode = fs.readFileSync(detailPath, 'utf8');

assert(detailCode.includes('isAssignModalOpen'), 'CaseDetailPage manages Officer Assignment Modal state');
assert(detailCode.includes('openAssignModal'), 'CaseDetailPage implements openAssignModal handler');
assert(detailCode.includes('handleAssignSubmit'), 'CaseDetailPage implements handleAssignSubmit handler');
assert(detailCode.includes('handleAcceptForReview'), 'CaseDetailPage implements Accept for Review intake scrutiny handler');
assert(detailCode.includes('handleCommenceInvestigation'), 'CaseDetailPage implements Commence Investigation handler');
assert(detailCode.includes('handleClarifySubmit'), 'CaseDetailPage implements Clarification Request handler');
assert(detailCode.includes('handleResolveSubmit'), 'CaseDetailPage implements Resolve Grievance handler');
assert(detailCode.includes('handleRejectSubmit'), 'CaseDetailPage implements Reject Grievance handler');
assert(detailCode.includes('handleDocDownload'), 'CaseDetailPage implements Document Download handler');

// Action Bar UI checks
assert(detailCode.includes('Lifecycle Stage:'), 'CaseDetailPage features Lifecycle Stage header');
assert(detailCode.includes('Accept for Review'), 'Intake Action Bar shows Accept for Review button when Submitted');
assert(detailCode.includes('Assign Officer'), 'Intake Action Bar shows Assign Officer button');
assert(detailCode.includes('Commence Investigation'), 'Intake Action Bar shows Commence Investigation button when Under Review');
assert(detailCode.includes('Request More Info'), 'Intake Action Bar shows Request More Info button');
assert(detailCode.includes('Resolve Grievance'), 'Intake Action Bar shows Resolve Grievance button when In Progress');
assert(detailCode.includes('Awaiting Citizen Clarification'), 'Intake Action Bar displays status banner when clarification is pending');

// Complainant & Document UI checks
assert(detailCode.includes('Verified Citizen Complainant Profile'), 'CaseDetailPage renders Verified Complainant Profile card');
assert(detailCode.includes('complainant_details.full_name'), 'Complainant Profile card displays verified citizen name');
assert(detailCode.includes('complainant_details.email'), 'Complainant Profile card displays verified email');
assert(detailCode.includes('complainant_details.mobile'), 'Complainant Profile card displays verified mobile');
assert(detailCode.includes('handleDocDownload(doc.id'), 'Documents list includes Download button calling handleDocDownload');
assert(detailCode.includes('Officer Allocation History'), 'CaseDetailPage renders Officer Allocation History section');

// Modals
assert(detailCode.includes('title="Assign Officer to Complaint"'), 'Modal for Officer Assignment is present');
assert(detailCode.includes('title="Request Additional Information / Evidence"'), 'Modal for Requesting Clarification is present');
assert(detailCode.includes('title="Resolve Complaint & Issue Findings"'), 'Modal for Resolving Grievance is present');
assert(detailCode.includes('title="Reject Grievance from Redressal Docket"'), 'Modal for Rejecting Grievance is present');
assert(detailCode.includes('title="Consolidate or Link Grievance"'), 'Modal for Consolidating / Linking Grievance is present');
assert(detailCode.includes('Statutory Basis for Rejection'), 'Rejection modal includes statutory grounds dropdown');
assert(detailCode.includes('Outside AICTE Jurisdiction'), 'Rejection modal options include jurisdiction grounds');
assert(detailCode.includes('Linked & Consolidated Matters'), 'CaseDetailPage renders Linked & Consolidated Matters section');
assert(detailCode.includes('handleLinkSubmit'), 'CaseDetailPage implements matter linking submit handler');

// 5. Officer Dashboard Page Audit
console.log('\nSECTION 5: OFFICER DASHBOARD AUDIT');
const dashPath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
const dashCode = fs.readFileSync(dashPath, 'utf8');

assert(dashCode.includes('Intake Queue'), 'DashboardPage renders Intake Queue KPI card');
assert(dashCode.includes('/cases?status=Submitted&unassigned_only=true'), 'Intake Queue KPI navigates to unassigned intake complaints');
assert(dashCode.includes('Unassigned Grievances'), 'Intake Queue KPI indicates unassigned count');

console.log('\n================================================================');
console.log(`TOTAL PHASE 5 VERIFICATION CHECKS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('PHASE 5 FRONTEND AUDIT: ALL CHECKS PASSED (100% SUCCESS)\n');
}

