// test_phase6_frontend.mjs
// Verifies Phase 6 AI Duplicate Complaint Detection frontend architecture,
// components, types, and statutory constraint implementations.

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
console.log('NYAYANITI PHASE 6: AI DUPLICATE DETECTION FRONTEND AUDIT & TEST SUITE');
console.log('======================================================================');

// 1. Types validation
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

assert(typesContent.includes('export interface AIDuplicateCandidate'), '1. AIDuplicateCandidate type defined');
assert(typesContent.includes('export interface AIDuplicateAnalysis'), '2. AIDuplicateAnalysis type defined');
assert(typesContent.includes('export interface AIModelStatus'), '3. AIModelStatus type defined');
assert(typesContent.includes('export interface OfficerDuplicateVerifyPayload'), '4. OfficerDuplicateVerifyPayload type defined');
assert(typesContent.includes('export interface OfficerDuplicateVerifyResponse'), '5. OfficerDuplicateVerifyResponse type defined');
assert(typesContent.includes('similarity_score: number;'), '6. similarity_score field explicitly defined as cosine metric');
assert(typesContent.includes('duplicate_probability: number;'), '7. duplicate_probability field explicitly defined as calibrated probability');

// 2. API service validation
const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');

assert(apiContent.includes('getAiModelStatus'), '8. getAiModelStatus API mapped');
assert(apiContent.includes('analyzeComplaintDuplicates'), '9. analyzeComplaintDuplicates API mapped');
assert(apiContent.includes('getComplaintDuplicateSummary'), '10. getComplaintDuplicateSummary API mapped');
assert(apiContent.includes('getComplaintDuplicateCandidates'), '11. getComplaintDuplicateCandidates API mapped');
assert(apiContent.includes('verifyDuplicateRecommendation'), '12. verifyDuplicateRecommendation API mapped');
assert(apiContent.includes('getPendingDuplicateRecommendations'), '13. getPendingDuplicateRecommendations API mapped');
assert(apiContent.includes('export const aiDuplicatesApi'), '14. aiDuplicatesApi namespace exported');

// 3. AIModelStatusModal Component
const modelModalPath = path.join(__dirname, 'src', 'components', 'ai', 'AIModelStatusModal.tsx');
assert(fs.existsSync(modelModalPath), '15. AIModelStatusModal.tsx exists');
const modelModalContent = fs.readFileSync(modelModalPath, 'utf8');
assert(modelModalContent.includes('embedding_dim'), '16. AIModelStatusModal renders embedding dimension');
assert(modelModalContent.includes('feature_count'), '17. AIModelStatusModal renders pairwise feature count');
assert(modelModalContent.includes('best_hyperparameters'), '18. AIModelStatusModal renders SVM hyperparameters');
assert(modelModalContent.includes('statutory_safeguard'), '19. AIModelStatusModal renders statutory safeguards');

// 4. ComplaintComparisonModal Component
const compareModalPath = path.join(__dirname, 'src', 'components', 'ai', 'ComplaintComparisonModal.tsx');
assert(fs.existsSync(compareModalPath), '20. ComplaintComparisonModal.tsx exists');
const compareModalContent = fs.readFileSync(compareModalPath, 'utf8');
assert(compareModalContent.includes('Side-by-Side'), '21. ComplaintComparisonModal provides side-by-side comparison');
assert(compareModalContent.includes('CONFIRM_DUPLICATE'), '22. ComplaintComparisonModal handles CONFIRM_DUPLICATE action');
assert(compareModalContent.includes('MARK_RELATED'), '23. ComplaintComparisonModal handles MARK_RELATED action');
assert(compareModalContent.includes('REJECT_RECOMMENDATION'), '24. ComplaintComparisonModal handles REJECT_RECOMMENDATION action');
assert(compareModalContent.includes('Statutory officer justification is mandatory'), '25. Mandatory justification validation enforced');
assert(compareModalContent.includes('Cosine:'), '26. Cosine similarity strictly displayed without confusing with probability');
assert(compareModalContent.includes('SVM Calibrated Conf.'), '27. SVM probability displayed as distinct metric');

// 5. AIDuplicatePanel Component
const panelPath = path.join(__dirname, 'src', 'components', 'ai', 'AIDuplicatePanel.tsx');
assert(fs.existsSync(panelPath), '28. AIDuplicatePanel.tsx exists');
const panelContent = fs.readFileSync(panelPath, 'utf8');
assert(panelContent.includes('AI Duplicate & Overlap Intelligence'), '29. Panel header renders government-grade title');
assert(panelContent.includes('Analyze Complaint'), '30. Panel provides manual analyze trigger');
assert(panelContent.includes('Diagnostics'), '31. Panel provides model diagnostics modal trigger');
assert(panelContent.includes('Compare Dossiers'), '32. Panel provides compare dossiers button');
assert(panelContent.includes('No Duplicate or Clustered Complaints Detected'), '33. Panel renders clean empty state');
assert(panelContent.includes('AI Engine Degraded'), '34. Panel renders model degraded alert');

// 6. OfficerComplaintReviewPage Integration
const reviewPagePath = path.join(__dirname, 'src', 'pages', 'OfficerComplaintReviewPage.tsx');
const reviewPageContent = fs.readFileSync(reviewPagePath, 'utf8');
assert(reviewPageContent.includes("import { AIDuplicatePanel } from '../components/ai/AIDuplicatePanel';"), '35. AIDuplicatePanel imported in OfficerComplaintReviewPage');
assert(reviewPageContent.includes('<AIDuplicatePanel'), '36. AIDuplicatePanel mounted in OfficerComplaintReviewPage');
assert(reviewPageContent.includes('onVerificationSuccess={loadComplaint}'), '37. Officer verification triggers docket reload');

// 7. AIDashboardWidget & DashboardPage Integration
const widgetPath = path.join(__dirname, 'src', 'components', 'ai', 'AIDashboardWidget.tsx');
assert(fs.existsSync(widgetPath), '38. AIDashboardWidget.tsx exists');
const widgetContent = fs.readFileSync(widgetPath, 'utf8');
assert(widgetContent.includes('AI Duplicate & Overlap Intelligence Center'), '39. Widget title renders correctly');
assert(widgetContent.includes('Recent Unverified Semantic Duplicate Alerts'), '40. Widget renders pending alerts table');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
assert(dashboardContent.includes("import { AIDashboardWidget } from '../components/ai/AIDashboardWidget';"), '41. AIDashboardWidget imported in DashboardPage');
assert(dashboardContent.includes('<AIDashboardWidget />'), '42. AIDashboardWidget mounted in DashboardPage');

console.log('----------------------------------------------------------------------');
console.log(`TOTAL PHASE 6 FRONTEND TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

