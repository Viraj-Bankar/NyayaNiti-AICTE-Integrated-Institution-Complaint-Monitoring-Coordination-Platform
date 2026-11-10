// test_phase8_frontend.mjs
// Verifies Phase 8 Automated Institutional Compliance & Regulatory Analytics
// frontend architecture, components, types, API service bindings, and statutory constraint implementations.

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
console.log('NYAYANITI PHASE 8: INSTITUTIONAL COMPLIANCE FRONTEND AUDIT & TEST');
console.log('======================================================================');

// 1. Types validation
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

assert(typesContent.includes('export interface RegulatoryRequirement'), '1. RegulatoryRequirement type defined');
assert(typesContent.includes('export interface RegulatoryRequirementVersion'), '2. RegulatoryRequirementVersion type defined');
assert(typesContent.includes('export interface ComplianceEvidence'), '3. ComplianceEvidence type defined');
assert(typesContent.includes('export interface ComplianceAssessment'), '4. ComplianceAssessment type defined');
assert(typesContent.includes('export interface CorrectiveActionPlan'), '5. CorrectiveActionPlan type defined');
assert(typesContent.includes('export interface InstitutionalRiskIndicator'), '6. InstitutionalRiskIndicator type defined');
assert(typesContent.includes('export interface InstitutionScorecard'), '7. InstitutionScorecard type defined');
assert(typesContent.includes('export interface ExecutiveGovernanceSummary'), '8. ExecutiveGovernanceSummary type defined');
assert(typesContent.includes('export interface GrievancePerformance'), '9. GrievancePerformance type defined');
assert(typesContent.includes("'COMPLIANT'") && typesContent.includes("'NON_COMPLIANT'"), '10. Compliance status enumerations present');
assert(typesContent.includes("'OVERDUE'") && typesContent.includes("'CLOSED'"), '11. CAP lifecycle statuses present');

// 2. API service validation
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

assert(apiContent.includes('listRegulatoryRequirements('), '12. listRegulatoryRequirements API mapped');
assert(apiContent.includes('createRegulatoryRequirement('), '13. createRegulatoryRequirement API mapped');
assert(apiContent.includes('updateRegulatoryRequirement('), '14. updateRegulatoryRequirement API mapped');
assert(apiContent.includes('listComplianceAssessments('), '15. listComplianceAssessments API mapped');
assert(apiContent.includes('createComplianceAssessment('), '16. createComplianceAssessment API mapped');
assert(apiContent.includes('reviewComplianceAssessment('), '17. reviewComplianceAssessment API mapped');
assert(apiContent.includes('listComplianceEvidence('), '18. listComplianceEvidence API mapped');
assert(apiContent.includes('attachAssessmentEvidence('), '19. attachAssessmentEvidence API mapped');
assert(apiContent.includes('reviewComplianceEvidence('), '20. reviewComplianceEvidence API mapped');
assert(apiContent.includes('listCorrectiveActionPlans('), '21. listCorrectiveActionPlans API mapped');
assert(apiContent.includes('createCorrectiveActionPlan('), '22. createCorrectiveActionPlan API mapped');
assert(apiContent.includes('updateCorrectiveActionPlan('), '23. updateCorrectiveActionPlan API mapped');
assert(apiContent.includes('submitCAPEvidence('), '24. submitCAPEvidence API mapped');
assert(apiContent.includes('verifyCAP('), '25. verifyCAP API mapped');
assert(apiContent.includes('reopenCAP('), '26. reopenCAP API mapped');
assert(apiContent.includes('scanOverdueCAPs('), '27. scanOverdueCAPs API mapped');
assert(apiContent.includes('getInstitutionScorecard('), '28. getInstitutionScorecard API mapped');
assert(apiContent.includes('getInstitutionRiskIndicators('), '29. getInstitutionRiskIndicators API mapped');
assert(apiContent.includes('getInstitutionGrievancePerformance('), '30. getInstitutionGrievancePerformance API mapped');
assert(apiContent.includes('getExecutiveGovernanceDashboard('), '31. getExecutiveGovernanceDashboard API mapped');
assert(apiContent.includes('downloadComplianceRegistryCSV('), '32. downloadComplianceRegistryCSV API mapped');
assert(apiContent.includes('export const complianceApi'), '33. complianceApi export object present');

// 3. Compliance Modals
const modalDir = path.join(__dirname, 'src', 'components', 'compliance');

const createReqModal = path.join(modalDir, 'CreateRequirementModal.tsx');
assert(fs.existsSync(createReqModal), '34. CreateRequirementModal.tsx exists');
const createReqContent = fs.readFileSync(createReqModal, 'utf8');
assert(createReqContent.includes('Promulgate Canonical Regulatory Requirement'), '35. CreateRequirementModal has statutory title');
assert(createReqContent.includes('regulatory_source'), '36. CreateRequirementModal captures regulatory source');

const updateReqModal = path.join(modalDir, 'UpdateRequirementModal.tsx');
assert(fs.existsSync(updateReqModal), '37. UpdateRequirementModal.tsx exists');
const updateReqContent = fs.readFileSync(updateReqModal, 'utf8');
assert(updateReqContent.includes('Promulgate Statutory Update'), '38. UpdateRequirementModal has statutory title');
assert(updateReqContent.includes('changes_summary'), '39. UpdateRequirementModal mandates change rationale');

const reviewAssessModal = path.join(modalDir, 'ReviewAssessmentModal.tsx');
assert(fs.existsSync(reviewAssessModal), '40. ReviewAssessmentModal.tsx exists');
const reviewAssessContent = fs.readFileSync(reviewAssessModal, 'utf8');
assert(reviewAssessContent.includes('Statutory Review: Assessment'), '41. ReviewAssessmentModal has determination title');
assert(reviewAssessContent.includes('reviewer_remarks'), '42. ReviewAssessmentModal captures official remarks');

const uploadEvidenceModal = path.join(modalDir, 'UploadEvidenceModal.tsx');
assert(fs.existsSync(uploadEvidenceModal), '43. UploadEvidenceModal.tsx exists');
const uploadEvidenceContent = fs.readFileSync(uploadEvidenceModal, 'utf8');
assert(uploadEvidenceContent.includes('Attach Evidence: Assessment'), '44. UploadEvidenceModal exists with valid title');

const reviewEvidenceModal = path.join(modalDir, 'ReviewEvidenceModal.tsx');
assert(fs.existsSync(reviewEvidenceModal), '45. ReviewEvidenceModal.tsx exists');
const reviewEvidenceContent = fs.readFileSync(reviewEvidenceModal, 'utf8');
assert(reviewEvidenceContent.includes('Review Evidence Item'), '46. ReviewEvidenceModal exists with scrutiny workflow');
assert(reviewEvidenceContent.includes('rejection_reason'), '47. ReviewEvidenceModal captures rejection reason when rejecting');

const createCapModal = path.join(modalDir, 'CreateCAPModal.tsx');
assert(fs.existsSync(createCapModal), '48. CreateCAPModal.tsx exists');
const createCapContent = fs.readFileSync(createCapModal, 'utf8');
assert(createCapContent.includes('Issue Statutory Corrective Action Plan (CAP)'), '49. CreateCAPModal exists with formal directive title');
assert(createCapContent.includes('prescribed_deadline'), '50. CreateCAPModal binds formal deadline');

const submitCapModal = path.join(modalDir, 'SubmitCAPEvidenceModal.tsx');
assert(fs.existsSync(submitCapModal), '51. SubmitCAPEvidenceModal.tsx exists');
const submitCapContent = fs.readFileSync(submitCapModal, 'utf8');
assert(submitCapContent.includes('Submit Remediation Evidence: CAP'), '52. SubmitCAPEvidenceModal captures proof');

const verifyCapModal = path.join(modalDir, 'VerifyCAPModal.tsx');
assert(fs.existsSync(verifyCapModal), '53. VerifyCAPModal.tsx exists');
const verifyCapContent = fs.readFileSync(verifyCapModal, 'utf8');
assert(verifyCapContent.includes('Statutory Verification: CAP'), '54. VerifyCAPModal handles independent officer closure');

const reopenCapModal = path.join(modalDir, 'ReopenCAPModal.tsx');
assert(fs.existsSync(reopenCapModal), '55. ReopenCAPModal.tsx exists');
const reopenCapContent = fs.readFileSync(reopenCapModal, 'utf8');
assert(reopenCapContent.includes('Reopen Corrective Action Plan'), '56. ReopenCAPModal handles formal reopening');

// 4. SubNav Component
const subNavPath = path.join(modalDir, 'ComplianceSubNav.tsx');
assert(fs.existsSync(subNavPath), '57. ComplianceSubNav.tsx exists');
const subNavContent = fs.readFileSync(subNavPath, 'utf8');
assert(subNavContent.includes('/compliance/requirements'), '58. SubNav links to requirements');
assert(subNavContent.includes('/compliance/assessments'), '59. SubNav links to assessments');
assert(subNavContent.includes('/compliance/evidence'), '60. SubNav links to evidence');
assert(subNavContent.includes('/compliance/caps'), '61. SubNav links to CAPs');
assert(subNavContent.includes('/compliance/risk-intelligence'), '62. SubNav links to risk intelligence');
assert(subNavContent.includes('/compliance/sla-analytics'), '63. SubNav links to SLA analytics');
assert(subNavContent.includes('/compliance/executive'), '64. SubNav links to executive governance');
assert(subNavContent.includes('/compliance/reports'), '65. SubNav links to reports');

// 5. Pages Validation (All 10 Pages)
const pagesDir = path.join(__dirname, 'src', 'pages');

const pageA = path.join(pagesDir, 'ComplianceDashboardPage.tsx');
assert(fs.existsSync(pageA), '66. Page A: ComplianceDashboardPage exists');
const pageAContent = fs.readFileSync(pageA, 'utf8');
assert(pageAContent.includes('ComplianceSubNav'), '67. ComplianceDashboardPage renders SubNav');
assert(pageAContent.includes('national_average_compliance_pct'), '68. ComplianceDashboardPage binds real compliance %');
assert(pageAContent.includes('national_average_coverage_pct'), '69. ComplianceDashboardPage displays assessment coverage %');

const pageB = path.join(pagesDir, 'RegulatoryRequirementsPage.tsx');
assert(fs.existsSync(pageB), '70. Page B: RegulatoryRequirementsPage exists');
const pageBContent = fs.readFileSync(pageB, 'utf8');
assert(pageBContent.includes('CreateRequirementModal'), '71. RegulatoryRequirementsPage includes create modal');
assert(pageBContent.includes('UpdateRequirementModal'), '72. RegulatoryRequirementsPage includes update modal');
assert(pageBContent.includes('Statutory Promulgation Audit Trail'), '73. RegulatoryRequirementsPage renders version history');

const pageC = path.join(pagesDir, 'InstitutionComplianceProfilePage.tsx');
assert(fs.existsSync(pageC), '74. Page C: InstitutionComplianceProfilePage exists');
const pageCContent = fs.readFileSync(pageC, 'utf8');
assert(pageCContent.includes('scorecard'), '75. InstitutionComplianceProfilePage displays scorecard');
assert(pageCContent.includes('Explainable Compliance Scoring Formula'), '76. InstitutionComplianceProfilePage displays formula');

const pageD = path.join(pagesDir, 'ComplianceAssessmentWorkspacePage.tsx');
assert(fs.existsSync(pageD), '77. Page D: ComplianceAssessmentWorkspacePage exists');
const pageDContent = fs.readFileSync(pageD, 'utf8');
assert(pageDContent.includes('ReviewAssessmentModal'), '78. ComplianceAssessmentWorkspacePage includes review modal');
assert(pageDContent.includes('UploadEvidenceModal'), '79. ComplianceAssessmentWorkspacePage includes evidence modal');

const pageE = path.join(pagesDir, 'EvidenceReviewPage.tsx');
assert(fs.existsSync(pageE), '80. Page E: EvidenceReviewPage exists');
const pageEContent = fs.readFileSync(pageE, 'utf8');
assert(pageEContent.includes('ReviewEvidenceModal'), '81. EvidenceReviewPage includes review modal');
assert(pageEContent.includes('evidenceList'), '82. EvidenceReviewPage binds real evidence items');

const pageF = path.join(pagesDir, 'CorrectiveActionPlansPage.tsx');
assert(fs.existsSync(pageF), '83. Page F: CorrectiveActionPlansPage exists');
const pageFContent = fs.readFileSync(pageF, 'utf8');
assert(pageFContent.includes('scanOverdueCAPs'), '84. CorrectiveActionPlansPage triggers scanOverdueCAPs');
assert(pageFContent.includes('SubmitCAPEvidenceModal'), '85. CorrectiveActionPlansPage includes submit proof modal');
assert(pageFContent.includes('VerifyCAPModal'), '86. CorrectiveActionPlansPage includes verification modal');
assert(pageFContent.includes('ReopenCAPModal'), '87. CorrectiveActionPlansPage includes reopening modal');

const pageG = path.join(pagesDir, 'InstitutionalRiskIntelligencePage.tsx');
assert(fs.existsSync(pageG), '88. Page G: InstitutionalRiskIntelligencePage exists');
const pageGContent = fs.readFileSync(pageG, 'utf8');
assert(pageGContent.includes('getRiskIndicators'), '89. InstitutionalRiskIntelligencePage fetches indicators');
assert(pageGContent.includes('AICTE Statutory Guard: Advisory Risk Diagnostic Principles'), '90. InstitutionalRiskIntelligencePage renders advisory notice');

const pageH = path.join(pagesDir, 'SlaAnalyticsPage.tsx');
assert(fs.existsSync(pageH), '91. Page H: SlaAnalyticsPage exists');
const pageHContent = fs.readFileSync(pageH, 'utf8');
assert(pageHContent.includes('getGrievancePerformance'), '92. SlaAnalyticsPage fetches grievance metrics');
assert(pageHContent.includes('Grievance Volume & Disposal by Statutory Category'), '93. SlaAnalyticsPage charts category breakdowns');

const pageI = path.join(pagesDir, 'ExecutiveGovernancePage.tsx');
assert(fs.existsSync(pageI), '94. Page I: ExecutiveGovernancePage exists');
const pageIContent = fs.readFileSync(pageI, 'utf8');
assert(pageIContent.includes('getExecutiveDashboard'), '95. ExecutiveGovernancePage fetches executive summary');
assert(pageIContent.includes('hasRole'), '96. ExecutiveGovernancePage enforces role check');
assert(pageIContent.includes('downloadRegistryCSV'), '97. ExecutiveGovernancePage allows registry CSV export');
assert(pageIContent.includes('Regional Compliance & Coverage Overview'), '98. ExecutiveGovernancePage charts regional performance');

const pageJ = path.join(pagesDir, 'GovernanceReportsPage.tsx');
assert(fs.existsSync(pageJ), '99. Page J: GovernanceReportsPage exists');
const pageJContent = fs.readFileSync(pageJ, 'utf8');
assert(pageJContent.includes('REPORT_CATEGORIES'), '100. GovernanceReportsPage catalogues 8 report types');
assert(pageJContent.includes('Observation Period'), '101. GovernanceReportsPage includes period filter');
assert(pageJContent.includes('Statutory Data Integrity & Audit Standards'), '102. GovernanceReportsPage shows statutory notice');

// 6. Navigation and Routing Validation
const navBarPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const navBarContent = fs.readFileSync(navBarPath, 'utf8');
assert(navBarContent.includes('/compliance'), '103. GovNavBar includes /compliance link');
assert(navBarContent.includes('Institutional Governance'), '104. GovNavBar has Institutional Governance label');
assert(navBarContent.includes('Phase 8'), '105. GovNavBar has Phase 8 badge');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('path="/compliance"'), '106. App.tsx registers /compliance route');
assert(appContent.includes('path="/compliance/requirements"'), '107. App.tsx registers /compliance/requirements route');
assert(appContent.includes('path="/compliance/institutions/:id"'), '108. App.tsx registers /compliance/institutions/:id route');
assert(appContent.includes('path="/compliance/assessments"'), '109. App.tsx registers /compliance/assessments route');
assert(appContent.includes('path="/compliance/evidence"'), '110. App.tsx registers /compliance/evidence route');
assert(appContent.includes('path="/compliance/caps"'), '111. App.tsx registers /compliance/caps route');
assert(appContent.includes('path="/compliance/risk-intelligence"'), '112. App.tsx registers /compliance/risk-intelligence route');
assert(appContent.includes('path="/compliance/sla-analytics"'), '113. App.tsx registers /compliance/sla-analytics route');
assert(appContent.includes('path="/compliance/executive"'), '114. App.tsx registers /compliance/executive route');
assert(appContent.includes('path="/compliance/reports"'), '115. App.tsx registers /compliance/reports route');
assert(appContent.includes("allowedRoles={['super_admin', 'bureau_head', 'monitoring_officer']}"), '116. App.tsx guards /compliance/executive with RBAC');

console.log('======================================================================');
console.log(`AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}
