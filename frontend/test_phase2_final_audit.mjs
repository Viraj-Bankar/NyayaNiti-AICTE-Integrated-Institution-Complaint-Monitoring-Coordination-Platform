// test_phase2_final_audit.mjs
// Comprehensive Phase 2 Integration, Responsiveness and Regression Audit for NyayaNiti

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failures.push(message);
    console.error(`[FAIL] ${message}`);
  }
}

console.log('======================================================================');
console.log('NYAYANITI PHASE 2: FINAL INTEGRATION, RESPONSIVENESS & REGRESSION AUDIT');
console.log('======================================================================\n');

// --------------------------------------------------------------------
// 1. PUBLIC PAGE VERIFICATION: STRUCTURE, COMPONENTS & SECTION ORDER
// --------------------------------------------------------------------
console.log('--- PART 1: PUBLIC PAGE STRUCTURE & SECTION VERIFICATION ---');

const explorePagePath = path.join(__dirname, 'src', 'pages', 'ExplorePage.tsx');
assert(fs.existsSync(explorePagePath), 'ExplorePage.tsx exists at expected location');
const explorePageContent = fs.readFileSync(explorePagePath, 'utf8');

const expectedComponents = [
  'ExploreQuickNav',
  'ExploreHero',
  'ExploreAbout',
  'ExploreChallenges',
  'ExploreVision',
  'ExploreCapabilities',
  'ExploreAITechnology',
  'ExploreHowItWorks',
  'ExploreSecurityTrust',
  'ExploreCriticalCases',
  'ExploreBenefits',
  'ExploreRoadmap',
  'ExploreTransparency',
  'ExploreFAQ',
  'ExploreFeedback',
  'ExploreCTA',
];

// Check all components are imported and rendered in order
let lastIndex = -1;
let componentsInOrder = true;
for (const comp of expectedComponents) {
  const index = explorePageContent.indexOf(`<${comp}`);
  if (index === -1) {
    assert(false, `Component <${comp} /> is rendered in ExplorePage.tsx`);
    componentsInOrder = false;
  } else {
    if (index < lastIndex) {
      componentsInOrder = false;
    }
    lastIndex = index;
  }
}
assert(componentsInOrder, 'All 15 subcomponents are rendered in the correct sequential order in ExplorePage.tsx');

// Check ExploreQuickNav section IDs match actual rendered IDs
const quickNavPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreQuickNav.tsx');
const quickNavContent = fs.readFileSync(quickNavPath, 'utf8');

// Extract IDs from QuickNav NAV_ITEMS
const navIdMatches = [...quickNavContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
assert(navIdMatches.length >= 10, `QuickNav contains ${navIdMatches.length} navigation anchors`);

// Verify every anchor ID exists in Explore components
const exploreDir = path.join(__dirname, 'src', 'components', 'explore');
const exploreFiles = fs.readdirSync(exploreDir).filter(f => f.endsWith('.tsx'));
const allExploreCode = exploreFiles.map(f => fs.readFileSync(path.join(exploreDir, f), 'utf8')).join('\n');

for (const navId of navIdMatches) {
  const hasId = allExploreCode.includes(`id="${navId}"`);
  assert(hasId, `Anchor #${navId} corresponds to a rendered section with id="${navId}"`);
}

// Check PublicHeader vs GovNavBar separation
const publicHeaderPath = path.join(__dirname, 'src', 'components', 'common', 'PublicHeader.tsx');
const publicHeaderContent = fs.readFileSync(publicHeaderPath, 'utf8');
assert(publicHeaderContent.includes('AICTE') && publicHeaderContent.includes('NyayaNiti'), 'PublicHeader contains AICTE & NyayaNiti branding');
assert(publicHeaderContent.includes('/login'), 'PublicHeader contains direct Officer Login link');
assert(!publicHeaderContent.includes('NavLink') && !publicHeaderContent.includes('CaseRegister'), 'PublicHeader does not contain private operational navigation links');

const govNavBarPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const govNavBarContent = fs.readFileSync(govNavBarPath, 'utf8');
assert(govNavBarContent.includes('if (isLoading || !isAuthenticated || !user) {\n    return null;\n  }'), 'GovNavBar returns null when unauthenticated to prevent public navigation exposure');

// Check Footer links and authentic information
const govFooterPath = path.join(__dirname, 'src', 'components', 'common', 'GovFooter.tsx');
const govFooterContent = fs.readFileSync(govFooterPath, 'utf8');
assert(govFooterContent.includes('Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070'), 'GovFooter displays official AICTE headquarters address');
assert(!govFooterContent.includes('grievance-support@aicte-india.org'), 'GovFooter does not contain invented placeholder email');
assert(!govFooterContent.includes('011-26131576'), 'GovFooter does not contain invented placeholder phone numbers');
assert(govFooterContent.includes('All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India'), 'GovFooter includes official statutory copyright');
assert(govFooterContent.includes('to="/login"'), 'GovFooter contains Officer Login route navigation');

// --------------------------------------------------------------------
// 2. RESPONSIVENESS AND LAYOUT CHECKS
// --------------------------------------------------------------------
console.log('\n--- PART 2: RESPONSIVE DESIGN & OVERFLOW AUDIT ---');

// Check that Explore components use mobile-first responsive classes (sm:, md:, lg:)
let responsiveGridsVerified = true;
for (const file of exploreFiles) {
  if (file === 'index.ts' || file === 'ExploreQuickNav.tsx') continue;
  const content = fs.readFileSync(path.join(exploreDir, file), 'utf8');
  if (content.includes('grid-cols-')) {
    const hasResponsiveBreakpoint = content.includes('md:') || content.includes('lg:') || content.includes('sm:');
    if (!hasResponsiveBreakpoint) {
      responsiveGridsVerified = false;
      console.warn(`[WARN] Grid without responsive breakpoints in ${file}`);
    }
  }
}
assert(responsiveGridsVerified, 'All Explore component grids implement responsive breakpoints (sm:, md:, lg:)');

// Check for mobile quick nav horizontal scrolling safety
assert(quickNavContent.includes('overflow-x-auto') && quickNavContent.includes('scrollbar-none'), 'ExploreQuickNav supports fluid mobile horizontal scrolling without page overflow');

// Check Hero layout responsiveness
const heroPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreHero.tsx');
const heroContent = fs.readFileSync(heroPath, 'utf8');
assert(heroContent.includes('grid-cols-1 lg:grid-cols-12'), 'Hero implements 1-column mobile stack and 12-column desktop split');
assert(heroContent.includes('overflow-hidden'), 'Hero section contains overflow-hidden to prevent horizontal page spill');

// Check AI Architecture flow responsiveness
const aiTechPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreAITechnology.tsx');
const aiTechContent = fs.readFileSync(aiTechPath, 'utf8');
assert(aiTechContent.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'), 'AI Architecture flow supports 1-col mobile, 2-col tablet, and 4-col desktop layout');

// Check How It Works timeline responsiveness
const howItWorksPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreHowItWorks.tsx');
const howItWorksContent = fs.readFileSync(howItWorksPath, 'utf8');
assert(
  howItWorksContent.includes('grid-cols-1 md:grid-cols-2') &&
    howItWorksContent.includes('hidden lg:block') &&
    howItWorksContent.includes('grid-cols-7'),
  'How It Works timeline implements responsive multi-tier columns (desktop 7-stage ribbon & multi-column breakdown)'
);

// --------------------------------------------------------------------
// 3. AUTHENTICATION & ROUTE GUARDS REGRESSION
// --------------------------------------------------------------------
console.log('\n--- PART 3: AUTHENTICATION REGRESSION & ROUTE GUARDS ---');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('return isAuthenticated ? <LandingPage /> : <ExplorePage />;'), 'RootRoute dynamically renders ExplorePage for logged-out visitors and LandingPage for officers');

const protectedRoutePath = path.join(__dirname, 'src', 'components', 'common', 'ProtectedRoute.tsx');
const protectedRouteContent = fs.readFileSync(protectedRoutePath, 'utf8');
assert(protectedRouteContent.includes('<Navigate to="/" state={{ from: location }} replace />'), 'ProtectedRoute redirects unauthenticated visitors to / with return state');
assert(protectedRouteContent.includes('allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)'), 'ProtectedRoute enforces RBAC role validation with AccessDenied');

// --------------------------------------------------------------------
// 4. CONTENT ACCURACY & STATUTORY INTEGRITY AUDIT
// --------------------------------------------------------------------
console.log('\n--- PART 4: CONTENT ACCURACY & STATUTORY INTEGRITY ---');

// Verify MPNet + SVM target architecture
assert(aiTechContent.includes('all-mpnet-base-v2') && aiTechContent.includes('768-dimensional'), 'AI Architecture accurately specifies all-mpnet-base-v2 with 768 dimensions');
assert(aiTechContent.includes('Support Vector Machine (SVM)') || aiTechContent.includes('SVM Classification'), 'AI Architecture accurately specifies Support Vector Machine (SVM) pairwise classification');

// Verify candidate retrieval and pgvector transparency
assert(aiTechContent.includes('cosine similarity') && aiTechContent.includes('pgvector planned'), 'AI Architecture accurately documents cosine candidate retrieval with pgvector as planned');

// Verify FAQ 10 statutory questions
const faqPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreFAQ.tsx');
const faqContent = fs.readFileSync(faqPath, 'utf8');

const requiredQuestions = [
  'What is NyayaNiti?',
  'What problem does NyayaNiti solve?',
  'What is Institution 360?',
  'How does AI-assisted complaint overlap detection work?',
  'Does AI automatically declare complaints as duplicates?',
  'How does cross-bureau coordination work?',
  'Who can access the operational dashboard?',
  'Is complainant self-service available currently?',
  'Does NyayaNiti support Aadhaar and DigiLocker currently?',
  'What are the planned future enhancements?'
];

let allFaqsFound = true;
for (const q of requiredQuestions) {
  if (!faqContent.includes(q)) {
    allFaqsFound = false;
    console.warn(`[WARN] Missing FAQ question: ${q}`);
  }
}
assert(allFaqsFound, 'All 10 required statutory FAQ questions are present');
assert(faqContent.includes("'implemented'") && faqContent.includes("'planned'"), 'FAQ questions clearly distinguish implemented features from planned future capabilities');

// Verify Feedback component integrity (no fake API, non-functional preview)
const feedbackPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreFeedback.tsx');
const feedbackContent = fs.readFileSync(feedbackPath, 'utf8');
assert(feedbackContent.includes('Online Intake In Development') || feedbackContent.includes('Submission Currently In Development'), 'Feedback explicitly informs users that submission is in development');
assert(feedbackContent.includes('disabled'), 'Feedback form inputs and submit button are disabled');
assert(!feedbackContent.includes('localStorage.setItem'), 'Feedback does not store unhandled data in localStorage');

// Verify Roadmap transparency
const roadmapPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreRoadmap.tsx');
const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
assert(roadmapContent.includes('Complainant Portal') && roadmapContent.includes('Planned Enhancement'), 'Complainant Portal is clearly labeled as a Planned Enhancement');
assert(roadmapContent.includes('Document Intelligence') && roadmapContent.includes('Multilingual AI'), 'Document Intelligence and Multilingual AI are included in future scope');

// --------------------------------------------------------------------
// 5. OPERATIONAL MODULE INTEGRITY
// --------------------------------------------------------------------
console.log('\n--- PART 5: OPERATIONAL MODULE REGRESSION AUDIT ---');

const pagesDir = path.join(__dirname, 'src', 'pages');
const expectedOperationalPages = [
  'DashboardPage.tsx',
  'CaseRegisterPage.tsx',
  'CaseDetailPage.tsx',
  'InstitutionListPage.tsx',
  'InstitutionProfilePage.tsx',
  'OverlapCenterPage.tsx',
  'ActionConflictPage.tsx',
  'CoordinationWorkspacePage.tsx',
  'ValidationSimulatorPage.tsx',
  'SurgeDetectionPage.tsx',
  'ReportsPage.tsx',
  'AuditLogsPage.tsx',
  'AdminSettingsPage.tsx',
  'LoginPage.tsx'
];

let allPagesExist = true;
for (const page of expectedOperationalPages) {
  const exists = fs.existsSync(path.join(pagesDir, page));
  if (!exists) allPagesExist = false;
}
assert(allPagesExist, 'All 14 operational and authentication pages exist intact in frontend/src/pages/');

// Final Summary
console.log('\n======================================================================');
console.log(`TOTAL PHASE 2 AUDIT CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failures.length}`);
if (failures.length > 0) {
  console.log('FAILURES:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log('======================================================================');

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
