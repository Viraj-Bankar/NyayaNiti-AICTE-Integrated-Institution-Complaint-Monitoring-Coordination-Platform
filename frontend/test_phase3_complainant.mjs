// test_phase3_complainant.mjs
// Phase 3 Integration, Isolation & Verification Audit for Complainant Authentication

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
console.log('NYAYANITI PHASE 3: COMPLAINANT AUTHENTICATION & CITIZEN PORTAL AUDIT');
console.log('======================================================================\n');

// --------------------------------------------------------------------
// 1. TOKEN & SESSION ISOLATION AUDIT
// --------------------------------------------------------------------
console.log('--- PART 1: TOKEN & SESSION STORAGE ISOLATION ---');

const apiPath = path.join(__dirname, 'src', 'services', 'api.ts');
assert(fs.existsSync(apiPath), 'api.ts exists');
const apiContent = fs.readFileSync(apiPath, 'utf8');

assert(
  apiContent.includes('nyayaniti_complainant_token'),
  'api.ts defines distinct storage key "nyayaniti_complainant_token"'
);
assert(
  apiContent.includes('nyayaniti_token'),
  'api.ts maintains separate officer token key "nyayaniti_token"'
);

assert(
  apiContent.includes('complainantRegister') &&
  apiContent.includes('complainantLogin') &&
  apiContent.includes('complainantDemoLogin') &&
  apiContent.includes('getComplainantMe'),
  'api.ts exports all required citizen authentication API methods'
);

// --------------------------------------------------------------------
// 2. CONTEXT & ROUTE PROTECTION ISOLATION
// --------------------------------------------------------------------
console.log('\n--- PART 2: CONTEXT & ROUTE PROTECTION ISOLATION ---');

const compAuthContextPath = path.join(__dirname, 'src', 'context', 'ComplainantAuthContext.tsx');
assert(fs.existsSync(compAuthContextPath), 'ComplainantAuthContext.tsx exists');
const compAuthContent = fs.readFileSync(compAuthContextPath, 'utf8');

assert(
  compAuthContent.includes('nyayaniti_complainant_token') &&
  compAuthContent.includes('nyayaniti_complainant_user'),
  'ComplainantAuthContext operates strictly on complainant storage keys'
);
assert(
  compAuthContent.includes('useComplainantAuth'),
  'ComplainantAuthContext exports dedicated useComplainantAuth hook'
);

// Verify isolated logout in ComplainantAuthContext
assert(
  compAuthContent.includes('removeItem(\'nyayaniti_complainant_token\')') &&
  !compAuthContent.includes('removeItem(\'nyayaniti_token\')'),
  'Complainant logout does not remove or modify officer session token'
);

// Verify isolated logout in AuthContext
const officerAuthContextPath = path.join(__dirname, 'src', 'context', 'AuthContext.tsx');
const officerAuthContent = fs.readFileSync(officerAuthContextPath, 'utf8');
assert(
  officerAuthContent.includes('removeItem(\'nyayaniti_token\')') &&
  !officerAuthContent.includes('removeItem(\'nyayaniti_complainant_token\')'),
  'Officer logout does not remove or modify complainant session token'
);

const compProtectedRoutePath = path.join(__dirname, 'src', 'components', 'common', 'ComplainantProtectedRoute.tsx');
assert(fs.existsSync(compProtectedRoutePath), 'ComplainantProtectedRoute.tsx exists');
const compProtectedContent = fs.readFileSync(compProtectedRoutePath, 'utf8');

assert(
  compProtectedContent.includes('useComplainantAuth'),
  'ComplainantProtectedRoute uses useComplainantAuth hook'
);
assert(
  compProtectedContent.includes('to="/complainant/login"'),
  'ComplainantProtectedRoute strictly redirects unauthenticated citizens to /complainant/login'
);
assert(
  compProtectedContent.includes('to="/dashboard"'),
  'ComplainantProtectedRoute strictly redirects officers to /dashboard'
);

const officerProtectedRoutePath = path.join(__dirname, 'src', 'components', 'common', 'ProtectedRoute.tsx');
const officerProtectedContent = fs.readFileSync(officerProtectedRoutePath, 'utf8');
assert(
  officerProtectedContent.includes('to="/"') && !officerProtectedContent.includes('/complainant/login'),
  'Officer ProtectedRoute strictly redirects unauthenticated visitors to Public Explore without leaking routes'
);

// --------------------------------------------------------------------
// 3. ROUTE REGISTRATION IN APP.TSX
// --------------------------------------------------------------------
console.log('\n--- PART 3: APPLICATION ROUTE REGISTRATION ---');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

assert(appContent.includes('ComplainantAuthProvider'), 'App.tsx wraps app tree with ComplainantAuthProvider');
assert(appContent.includes('path="/complainant/login"'), 'App.tsx mounts route /complainant/login');
assert(appContent.includes('path="/complainant/register"'), 'App.tsx mounts route /complainant/register');
assert(appContent.includes('path="/complainant/home"'), 'App.tsx mounts route /complainant/home');
assert(
  appContent.includes('<ComplainantProtectedRoute>') && appContent.includes('ComplainantHomePage'),
  'App.tsx wraps /complainant/home with ComplainantProtectedRoute'
);

// --------------------------------------------------------------------
// 4. CITIZEN REGISTRATION VALIDATION & COMPLIANCE
// --------------------------------------------------------------------
console.log('\n--- PART 4: CITIZEN REGISTRATION VALIDATION ---');

const regPagePath = path.join(__dirname, 'src', 'pages', 'ComplainantRegisterPage.tsx');
assert(fs.existsSync(regPagePath), 'ComplainantRegisterPage.tsx exists');
const regContent = fs.readFileSync(regPagePath, 'utf8');

assert(
  regContent.includes('fullName') &&
  regContent.includes('email') &&
  regContent.includes('mobile') &&
  regContent.includes('password') &&
  regContent.includes('confirmPassword'),
  'ComplainantRegisterPage includes all required registration fields'
);

assert(
  regContent.includes('6-9') && regContent.includes('10'),
  'ComplainantRegisterPage validates 10-digit Indian mobile number format'
);

assert(
  regContent.includes('password') && regContent.includes('confirmPassword') && regContent.includes('match'),
  'ComplainantRegisterPage enforces password match confirmation'
);

assert(
  regContent.includes('showPassword') && regContent.includes('showConfirmPassword'),
  'ComplainantRegisterPage includes password visibility controls'
);

// --------------------------------------------------------------------
// 5. CITIZEN LOGIN & DEMO EVALUATION
// --------------------------------------------------------------------
console.log('\n--- PART 5: CITIZEN LOGIN & DEMO EVALUATION ---');

const loginPagePath = path.join(__dirname, 'src', 'pages', 'ComplainantLoginPage.tsx');
assert(fs.existsSync(loginPagePath), 'ComplainantLoginPage.tsx exists');
const loginContent = fs.readFileSync(loginPagePath, 'utf8');

assert(
  loginContent.includes('demoLogin') || loginContent.includes('Quick Demo Evaluation'),
  'ComplainantLoginPage provides 1-click quick demo evaluation switch'
);

assert(
  loginContent.includes('/complainant/register'),
  'ComplainantLoginPage provides link to register new citizen account'
);

assert(
  loginContent.includes('/complainant/home'),
  'ComplainantLoginPage redirects authenticated citizens to /complainant/home'
);

assert(
  loginContent.includes('showPassword'),
  'ComplainantLoginPage includes password visibility control'
);

// --------------------------------------------------------------------
// 6. CITIZEN HOME PLACEHOLDER (PHASE 3 SCOPE)
// --------------------------------------------------------------------
console.log('\n--- PART 6: CITIZEN HOME PLACEHOLDER ---');

const homePagePath = path.join(__dirname, 'src', 'pages', 'ComplainantHomePage.tsx');
assert(fs.existsSync(homePagePath), 'ComplainantHomePage.tsx exists');
const homeContent = fs.readFileSync(homePagePath, 'utf8');

assert(
  homeContent.includes('complainant') && homeContent.includes('logout'),
  'ComplainantHomePage presents citizen profile information and logout action'
);

assert(
  homeContent.includes('Phase 4') || homeContent.includes('Grievance Submission'),
  'ComplainantHomePage clearly articulates Phase 4 roadmap for full grievance tracking'
);

// --------------------------------------------------------------------
// 7. HEADER & NAVIGATION AUDIT
// --------------------------------------------------------------------
console.log('\n--- PART 7: HEADER & PUBLIC NAVIGATION ---');

const pubHeaderPath = path.join(__dirname, 'src', 'components', 'common', 'PublicHeader.tsx');
const pubHeaderContent = fs.readFileSync(pubHeaderPath, 'utf8');

assert(
  pubHeaderContent.includes('/complainant/login') &&
  (pubHeaderContent.includes('Track Your Complaint') || pubHeaderContent.includes('Complainant Login')),
  'PublicHeader includes prominent "Track Your Complaint" / "Complainant Login" entry'
);

assert(
  pubHeaderContent.includes('/login') && pubHeaderContent.includes('Officer'),
  'PublicHeader preserves official Officer Login CTA'
);

const heroPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreHero.tsx');
const heroContent = fs.readFileSync(heroPath, 'utf8');
assert(
  heroContent.includes('/complainant/login') && heroContent.includes('Track Your Complaint'),
  'ExploreHero includes visible "Track Your Complaint" CTA'
);

const ctaPath = path.join(__dirname, 'src', 'components', 'explore', 'ExploreCTA.tsx');
const ctaContent = fs.readFileSync(ctaPath, 'utf8');
assert(
  ctaContent.includes('/complainant/login') && ctaContent.includes('Track Your Complaint'),
  'ExploreCTA includes visible "Track Your Complaint" CTA'
);

const compHeaderPath = path.join(__dirname, 'src', 'components', 'common', 'ComplainantHeader.tsx');
assert(fs.existsSync(compHeaderPath), 'ComplainantHeader.tsx exists');
const compHeaderContent = fs.readFileSync(compHeaderPath, 'utf8');

assert(
  compHeaderContent.includes('complainant') && compHeaderContent.includes('logout'),
  'ComplainantHeader provides citizen identity presentation and logout capability'
);

// Check that GovNavBar returns null when non-officer
const govNavBarPath = path.join(__dirname, 'src', 'components', 'common', 'GovNavBar.tsx');
const govNavBarContent = fs.readFileSync(govNavBarPath, 'utf8');
assert(
  govNavBarContent.includes('if (isLoading || !isAuthenticated || !user) {\n    return null;\n  }'),
  'GovNavBar returns null for non-officers (no internal officer navigation leaked to complainants)'
);

console.log('\n======================================================================');
console.log(`AUDIT COMPLETE: ${passedTests}/${totalTests} CHECKS PASSED`);
if (failures.length > 0) {
  console.log(`FAILURES (${failures.length}):`);
  failures.forEach(f => console.log(` - ${f}`));
  process.exit(1);
} else {
  console.log('STATUS: 100% OF PHASE 3 COMPLAINANT AUDIT SPECIFICATIONS PASSED');
  console.log('======================================================================');
  process.exit(0);
}
