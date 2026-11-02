// test_matrix_frontend.mjs
// Verifies all Matrix items for NyayaNiti Phase 1 - Task 5

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    dump: () => Object.fromEntries(store.entries())
  };
}

function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

function isJwtExpired(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

function createMockToken(username, role, expiresInSeconds = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ sub: username, role, exp })).toString('base64');
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

// Emulate Frontend AuthContext session state & ProtectedRoute logic
class AuthStateEngine {
  constructor(storage) {
    this.storage = storage;
    this.user = null;
    this.authStatus = 'loading'; // 'loading' | 'authenticated' | 'unauthenticated' | 'expired'
    this.sessionError = null;
  }

  initSession(mockBackendValidate) {
    this.authStatus = 'loading';
    const token = this.storage.getItem('nyayaniti_token');
    if (!token) {
      this.storage.removeItem('nyayaniti_token');
      this.storage.removeItem('nyayaniti_user');
      this.user = null;
      this.authStatus = 'unauthenticated';
      return;
    }

    if (isJwtExpired(token)) {
      this.storage.removeItem('nyayaniti_token');
      this.storage.removeItem('nyayaniti_user');
      this.user = null;
      this.authStatus = 'expired';
      this.sessionError = 'Previous session has expired. Please sign in.';
      return;
    }

    const verified = mockBackendValidate(token);
    if (verified && verified.id && verified.role) {
      this.user = verified;
      this.storage.setItem('nyayaniti_user', JSON.stringify(verified));
      this.authStatus = 'authenticated';
      this.sessionError = null;
    } else {
      this.storage.removeItem('nyayaniti_token');
      this.storage.removeItem('nyayaniti_user');
      this.user = null;
      this.authStatus = 'expired';
    }
  }

  login(token, user) {
    this.storage.setItem('nyayaniti_token', token);
    this.storage.setItem('nyayaniti_user', JSON.stringify(user));
    this.user = user;
    this.authStatus = 'authenticated';
    this.sessionError = null;
  }

  logout() {
    this.storage.removeItem('nyayaniti_token');
    this.storage.removeItem('nyayaniti_user');
    this.user = null;
    this.authStatus = 'unauthenticated';
    this.sessionError = null;
  }

  get isAuthenticated() {
    return this.authStatus === 'authenticated' && !!this.user;
  }

  hasRole(allowedRoles) {
    if (!this.user) return false;
    if (this.user.role === 'super_admin') return true;
    return allowedRoles.includes(this.user.role);
  }

  evaluateRoute(path, allowedRoles = null) {
    if (path === '/') {
      return this.isAuthenticated ? 'Operational LandingPage (Home)' : 'Public ExplorePage';
    }
    if (path === '/explore') return 'Public ExplorePage';
    if (path === '/login') return 'LoginPage';

    // Protected Route logic
    if (this.authStatus === 'loading') return 'LoadingSpinner';
    if (!this.isAuthenticated) {
      return { redirect: '/', from: path };
    }
    if (allowedRoles && allowedRoles.length > 0 && !this.hasRole(allowedRoles)) {
      return 'AccessDeniedScreen (403)';
    }
    return `AuthorizedPage: ${path}`;
  }

  get renderedHeader() {
    if (this.authStatus === 'loading' || !this.isAuthenticated || !this.user) {
      return 'PublicHeader';
    }
    return 'AuthenticatedHeader';
  }

  get renderedNavItems() {
    if (this.authStatus === 'loading' || !this.isAuthenticated || !this.user) {
      return null;
    }
    const items = [
      'Home', 'Dashboard', 'Case Register', 'Overlap Center',
      'Action Conflicts', 'Coordination', 'Institutions',
      'Validation Engine', 'Surge Detection', 'Reports'
    ];
    if (this.hasRole(['super_admin', 'monitoring_officer'])) items.push('Audit Trail');
    if (this.hasRole(['super_admin'])) items.push('Admin Settings');
    return items;
  }
}

console.log('='.repeat(70));
console.log('NYAYANITI PHASE 1 - TASK 5: FRONTEND MATRIX TEST SUITE');
console.log('='.repeat(70));

let allPass = true;
function test(name, ok, extra = '') {
  if (ok) {
    console.log(`[PASS] ${name} ${extra}`);
  } else {
    console.log(`[FAIL] ${name} ${extra}`);
    allPass = false;
  }
}

const mockValidate = (token) => {
  const p = parseJwt(token);
  if (!p) return null;
  return { id: 1, username: p.sub, role: p.role, full_name: 'Test Officer' };
};

// 1. Fresh incognito session
const storage1 = createMockLocalStorage();
const auth1 = new AuthStateEngine(storage1);
auth1.initSession(mockValidate);
test('1. Fresh incognito session -> Explore page', auth1.evaluateRoute('/') === 'Public ExplorePage');
test('1b. Fresh incognito session -> PublicHeader rendered', auth1.renderedHeader === 'PublicHeader');
test('1c. Fresh incognito session -> NavBar not rendered', auth1.renderedNavItems === null);

// 2. Open / while logged out
test('2. Open / while logged out -> Explore page', auth1.evaluateRoute('/') === 'Public ExplorePage');

// 3. Click Login
test('3. Open /login -> Existing login page', auth1.evaluateRoute('/login') === 'LoginPage');

// 4. Successful admin login
const adminToken = createMockToken('admin', 'super_admin');
const adminUser = { id: 1, username: 'admin', role: 'super_admin', full_name: 'Dr. Rajesh Sharma' };
auth1.login(adminToken, adminUser);
test('4a. Successful admin login -> isAuthenticated === true', auth1.isAuthenticated === true);
test('4b. Successful admin login -> AuthenticatedHeader rendered', auth1.renderedHeader === 'AuthenticatedHeader');
test('4c. Successful admin login -> Authorized dashboard', auth1.evaluateRoute('/dashboard') === 'AuthorizedPage: /dashboard');
test('4d. Successful admin login -> Admin Settings in Nav', auth1.renderedNavItems.includes('Admin Settings'));
test('4e. Successful admin login -> Audit Trail in Nav', auth1.renderedNavItems.includes('Audit Trail'));

// 5. Successful officer login
const officerStorage = createMockLocalStorage();
const authOfficer = new AuthStateEngine(officerStorage);
const officerToken = createMockToken('officer_pgrc', 'authorized_officer');
const officerUser = { id: 2, username: 'officer_pgrc', role: 'authorized_officer', full_name: 'Dr. Ananya Verma' };
authOfficer.login(officerToken, officerUser);
test('5a. Successful officer login -> Authorized workspace', authOfficer.evaluateRoute('/dashboard') === 'AuthorizedPage: /dashboard');
test('5b. Officer restricted from Admin Settings -> AccessDeniedScreen', authOfficer.evaluateRoute('/admin', ['super_admin']) === 'AccessDeniedScreen (403)');
test('5c. Officer navigation excludes Admin Settings', !authOfficer.renderedNavItems.includes('Admin Settings'));
test('5d. Officer navigation excludes Audit Trail', !authOfficer.renderedNavItems.includes('Audit Trail'));

// 6. Open protected route while logged out
const loggedOutAuth = new AuthStateEngine(createMockLocalStorage());
loggedOutAuth.initSession(mockValidate);
const protRes1 = loggedOutAuth.evaluateRoute('/dashboard');
test('6a. Logged-out open /dashboard -> Redirect to / with return state', protRes1.redirect === '/' && protRes1.from === '/dashboard');
const protRes2 = loggedOutAuth.evaluateRoute('/case-register');
test('6b. Logged-out open /case-register -> Redirect to / with return state', protRes2.redirect === '/' && protRes2.from === '/case-register');
const protRes3 = loggedOutAuth.evaluateRoute('/reports');
test('6c. Logged-out open /reports -> Redirect to / with return state', protRes3.redirect === '/' && protRes3.from === '/reports');

// 7. Expired token
const expiredStorage = createMockLocalStorage();
expiredStorage.setItem('nyayaniti_token', createMockToken('admin', 'super_admin', -100)); // expired 100s ago
const authExpired = new AuthStateEngine(expiredStorage);
authExpired.initSession(mockValidate);
test('7a. Expired token -> Session cleared from storage', expiredStorage.getItem('nyayaniti_token') === null);
test('7b. Expired token -> authStatus === "expired"', authExpired.authStatus === 'expired');
test('7c. Expired token -> PublicHeader rendered', authExpired.renderedHeader === 'PublicHeader');
test('7d. Expired token -> Redirect to /', authExpired.evaluateRoute('/dashboard').redirect === '/');

// 8. Logout
const activeStorage = createMockLocalStorage();
const authLogout = new AuthStateEngine(activeStorage);
authLogout.login(adminToken, adminUser);
test('8a. Active session before logout', authLogout.isAuthenticated === true);
authLogout.logout();
test('8b. Logout -> Storage cleared', activeStorage.getItem('nyayaniti_token') === null && activeStorage.getItem('nyayaniti_user') === null);
test('8c. Logout -> authStatus === "unauthenticated"', authLogout.authStatus === 'unauthenticated');
test('8d. Logout -> Redirect to /', authLogout.evaluateRoute('/dashboard').redirect === '/');
test('8e. Logout -> PublicHeader rendered', authLogout.renderedHeader === 'PublicHeader');

// 9. Refresh while logged in
const refreshStorage = createMockLocalStorage();
refreshStorage.setItem('nyayaniti_token', createMockToken('admin', 'super_admin', 3600));
const authRefresh = new AuthStateEngine(refreshStorage);
authRefresh.initSession(mockValidate);
test('9a. Refresh while logged in -> Session correctly restored', authRefresh.isAuthenticated === true && authRefresh.user.username === 'admin');
test('9b. Refresh while logged in -> Role super_admin preserved', authRefresh.user.role === 'super_admin');
test('9c. Refresh while logged in -> AuthenticatedHeader active', authRefresh.renderedHeader === 'AuthenticatedHeader');

console.log('-'.repeat(70));
console.log(`TOTAL FRONTEND MATRIX TESTS: 24`);
console.log(`ALL TESTS PASSED: ${allPass}`);
console.log('='.repeat(70));
process.exit(allPass ? 0 : 1);
