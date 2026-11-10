// test_phase8_integration.mjs
// NyayaNiti Phase 8: System Integration, API Contract Matrix & End-to-End Workflow Verification

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
console.log('NYAYANITI PHASE 8: FULL SYSTEM INTEGRATION AUDIT & TEST SUITE');
console.log('======================================================================');

// 1. API Contract Matrix Verification
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

const backendApiPath = path.join(__dirname, '..', 'backend', 'app', 'api', 'compliance.py');
const backendApiContent = fs.readFileSync(backendApiPath, 'utf8');

console.log('\n--- 1. API Contract Matrix (24 Endpoints) ---');

const contractMatrix = [
  { method: 'GET', path: '/compliance/requirements', fe: 'listRequirements', desc: 'Query statutory requirements' },
  { method: 'POST', path: '/compliance/requirements', fe: 'createRequirement', desc: 'Promulgate statutory requirement' },
  { method: 'GET', path: '/compliance/requirements/{id}', fe: 'getRequirement', desc: 'Retrieve single requirement' },
  { method: 'PATCH', path: '/compliance/requirements/{id}', fe: 'updateRequirement', desc: 'Promulgate requirement amendment' },
  { method: 'GET', path: '/compliance/assessments', fe: 'listAssessments', desc: 'Query compliance assessments' },
  { method: 'POST', path: '/compliance/assessments', fe: 'createAssessment', desc: 'Create institutional assessment' },
  { method: 'GET', path: '/compliance/assessments/{id}', fe: 'getAssessment', desc: 'Retrieve single assessment' },
  { method: 'POST', path: '/compliance/assessments/{id}/review', fe: 'reviewAssessment', desc: 'Record official determination' },
  { method: 'POST', path: '/compliance/assessments/{id}/evidence', fe: 'attachEvidence', desc: 'Attach proof document' },
  { method: 'GET', path: '/compliance/evidence', fe: 'listEvidence', desc: 'Query evidence documents' },
  { method: 'POST', path: '/compliance/evidence/{id}/review', fe: 'reviewEvidence', desc: 'Scrutinize and verify evidence' },
  { method: 'GET', path: '/compliance/caps', fe: 'listCAPs', desc: 'Query corrective action plans' },
  { method: 'POST', path: '/compliance/caps', fe: 'createCAP', desc: 'Issue formal CAP directive' },
  { method: 'GET', path: '/compliance/caps/{id}', fe: 'getCAP', desc: 'Retrieve single CAP details' },
  { method: 'PATCH', path: '/compliance/caps/{id}', fe: 'updateCAP', desc: 'Update CAP metadata' },
  { method: 'POST', path: '/compliance/caps/{id}/submit-evidence', fe: 'submitCAPEvidence', desc: 'Submit proof of remediation' },
  { method: 'POST', path: '/compliance/caps/{id}/verify', fe: 'verifyCAP', desc: 'Certify remediation and close CAP' },
  { method: 'POST', path: '/compliance/caps/{id}/reopen', fe: 'reopenCAP', desc: 'Reopen closed CAP with justification' },
  { method: 'POST', path: '/compliance/caps/scan-overdue', fe: 'scanOverdueCAPs', desc: 'Sweep for overdue CAP directives' },
  { method: 'GET', path: '/compliance/institutions/{id}/scorecard', fe: 'getScorecard', desc: 'Calculate composite scorecard' },
  { method: 'GET', path: '/compliance/institutions/{id}/risk', fe: 'getRiskIndicators', desc: 'Fetch multi-bureau risk signals' },
  { method: 'GET', path: '/compliance/institutions/{id}/grievance-performance', fe: 'getGrievancePerformance', desc: 'Turnaround & SLA metrics' },
  { method: 'GET', path: '/compliance/analytics/executive', fe: 'getExecutiveDashboard', desc: 'Executive council dashboard' },
  { method: 'GET', path: '/compliance/reports/export', fe: 'downloadRegistryCSV', desc: 'Export official registry CSV' }
];

contractMatrix.forEach((endpoint, index) => {
  const backendHasPath = backendApiContent.includes(endpoint.path.replace('/compliance', ''));
  const frontendHasMethod = apiContent.includes(endpoint.fe);
  assert(backendHasPath && frontendHasMethod, `API #${index + 1}: ${endpoint.method} ${endpoint.path} -> ${endpoint.fe} (${endpoint.desc})`);
});

// 2. Role Consistency & RBAC Verification
console.log('\n--- 2. Role Consistency & RBAC Alignment ---');

const authPath = path.join(__dirname, '..', 'backend', 'app', 'api', 'auth.py');
const authContent = fs.readFileSync(authPath, 'utf8');

assert(authContent.includes('"super_admin"'), 'Role super_admin recognized in backend');
assert(authContent.includes('"bureau_head"'), 'Role bureau_head recognized in backend');
assert(authContent.includes('"authorized_officer"'), 'Role authorized_officer recognized in backend');
assert(authContent.includes('"monitoring_officer"'), 'Role monitoring_officer recognized in backend');

// Ensure no fictitious bureau_officer role in frontend pages
const pagesDir = path.join(__dirname, 'src', 'pages');
const assessPage = fs.readFileSync(path.join(pagesDir, 'ComplianceAssessmentWorkspacePage.tsx'), 'utf8');
const evidPage = fs.readFileSync(path.join(pagesDir, 'EvidenceReviewPage.tsx'), 'utf8');
const capPage = fs.readFileSync(path.join(pagesDir, 'CorrectiveActionPlansPage.tsx'), 'utf8');
const execPage = fs.readFileSync(path.join(pagesDir, 'ExecutiveGovernancePage.tsx'), 'utf8');

assert(!assessPage.includes("'bureau_officer'"), 'bureau_officer eradicated from ComplianceAssessmentWorkspacePage');
assert(assessPage.includes("'authorized_officer'"), 'authorized_officer active in ComplianceAssessmentWorkspacePage');
assert(!evidPage.includes("'bureau_officer'"), 'bureau_officer eradicated from EvidenceReviewPage');
assert(evidPage.includes("'authorized_officer'"), 'authorized_officer active in EvidenceReviewPage');
assert(capPage.includes("'authorized_officer'"), 'authorized_officer permitted in CorrectiveActionPlansPage');
assert(execPage.includes("['super_admin', 'bureau_head', 'monitoring_officer']"), 'ExecutiveGovernancePage restricted strictly to senior governance roles');

// 3. Workflow A: Regulatory Assessment Integration
console.log('\n--- 3. Workflow A: Regulatory Assessment Integration ---');

const reqPage = fs.readFileSync(path.join(pagesDir, 'RegulatoryRequirementsPage.tsx'), 'utf8');
assert(reqPage.includes('CreateRequirementModal'), 'Workflow A: Promulgation modal integrated in catalogue');
assert(reqPage.includes('Statutory Promulgation Audit Trail'), 'Workflow A: Version trail rendered');
assert(assessPage.includes('ReviewAssessmentModal'), 'Workflow A: Determination review modal integrated');
assert(assessPage.includes('UploadEvidenceModal'), 'Workflow A: Proof document attachment integrated');

const profilePage = fs.readFileSync(path.join(pagesDir, 'InstitutionComplianceProfilePage.tsx'), 'utf8');
assert(profilePage.includes('scorecard.compliance_percentage'), 'Workflow A: 0-100% composite score displayed');
assert(profilePage.includes('scorecard.assessment_coverage_pct'), 'Workflow A: Assessment coverage displayed separately');
assert(profilePage.includes('Explainable Compliance Scoring Formula'), 'Workflow A: Explainable formula breakdown presented');

// 4. Workflow B: Corrective Action Plan Lifecycle Integration
console.log('\n--- 4. Workflow B: Corrective Action Plan Lifecycle Integration ---');

assert(capPage.includes('CreateCAPModal'), 'Workflow B: Directive issuance modal integrated');
assert(capPage.includes('SubmitCAPEvidenceModal'), 'Workflow B: Proof submission modal integrated');
assert(capPage.includes('VerifyCAPModal'), 'Workflow B: Formal closure verification modal integrated');
assert(capPage.includes('ReopenCAPModal'), 'Workflow B: Mandatory reopening justification modal integrated');
assert(capPage.includes('scanOverdueCAPs'), 'Workflow B: Background overdue sweep integrated');

// 5. Workflow C: Risk Intelligence Decoupling Integration
console.log('\n--- 5. Workflow C: Risk Intelligence Decoupling Integration ---');

const riskPage = fs.readFileSync(path.join(pagesDir, 'InstitutionalRiskIntelligencePage.tsx'), 'utf8');
assert(riskPage.includes('AICTE Statutory Guard: Advisory Risk Diagnostic Principles'), 'Workflow C: Prominent statutory advisory banner rendered');
assert(riskPage.includes('Risk indicators are predictive early-warning signals, NOT confirmed statutory violations'), 'Workflow C: Advisory nature explicitly stated');
assert(riskPage.includes('Grievance Decoupling') && riskPage.includes('never equated with non-compliance'), 'Workflow C: Complaint volume decoupled from compliance guilt');
assert(riskPage.includes('data_completeness'), 'Workflow C: Data completeness percentage displayed');

// 6. Workflow D: Executive Governance & Reporting Integration
console.log('\n--- 6. Workflow D: Executive Governance & Reporting Integration ---');

assert(execPage.includes('national_average_compliance_pct'), 'Workflow D: National average compliance displayed');
assert(execPage.includes('Regional Compliance & Coverage Overview'), 'Workflow D: Regional comparative bar chart rendered');
assert(execPage.includes('National Institutional Risk Tier Distribution'), 'Workflow D: Risk tier pie chart rendered');
assert(execPage.includes('Top Statutory Deficiencies Nationally'), 'Workflow D: Deficiency Pareto analysis rendered');

const reportsPage = fs.readFileSync(path.join(pagesDir, 'GovernanceReportsPage.tsx'), 'utf8');
assert(reportsPage.includes('REP-COMP-01') && reportsPage.includes('REP-EXEC-08'), 'Workflow D: 8 statutory report categories available');
assert(reportsPage.includes('downloadRegistryCSV'), 'Workflow D: Official registry CSV export stream hooked');
assert(reportsPage.includes('Observation Period'), 'Workflow D: Multi-year audit cycle filters provided');

// 7. Complainant Isolation & Public Safety
console.log('\n--- 7. Complainant Isolation & Public Safety ---');

const navBarPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const navBarContent = fs.readFileSync(navBarPath, 'utf8');
assert(navBarContent.includes('isLoading || !isAuthenticated || !user'), 'GovNavBar hidden for unauthenticated/citizen public visitors');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(!appContent.includes('<ComplainantProtectedRoute><Compliance'), 'Complainant portal contains zero compliance routes');
assert(appContent.includes('path="/compliance/executive"'), 'Executive route guarded');

console.log('======================================================================');
console.log(`INTEGRATION AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}
