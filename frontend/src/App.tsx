import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ComplainantAuthProvider } from './context/ComplainantAuthContext';
import { GovTopBar } from './components/common/GovTopBar';
import { GovHeader } from './components/common/GovHeader';
import { GovNavBar } from './components/common/GovNavBar';
import { GovFooter } from './components/common/GovFooter';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ComplainantProtectedRoute } from './components/common/ComplainantProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { DashboardPage } from './pages/DashboardPage';
import { CaseRegisterPage } from './pages/CaseRegisterPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { InstitutionListPage } from './pages/InstitutionListPage';
import { InstitutionProfilePage } from './pages/InstitutionProfilePage';
import { OverlapCenterPage } from './pages/OverlapCenterPage';
import { ActionConflictPage } from './pages/ActionConflictPage';
import { CoordinationWorkspacePage } from './pages/CoordinationWorkspacePage';
import { SurgeDetectionPage } from './pages/SurgeDetectionPage';
import { ValidationSimulatorPage } from './pages/ValidationSimulatorPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ComplainantLoginPage } from './pages/ComplainantLoginPage';
import { ComplainantRegisterPage } from './pages/ComplainantRegisterPage';
import { ComplainantDashboardPage } from './pages/ComplainantDashboardPage';

/**
 * RootRoute:
 * - Unauthenticated visitors: See ONLY the comprehensive public Explore page.
 * - Authenticated officers: See the operational LandingPage (Home).
 */
const RootRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62]" />
      </div>
    );
  }

  return isAuthenticated ? <LandingPage /> : <ExplorePage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ComplainantAuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-800">
            <GovTopBar />
            <GovHeader />
            <GovNavBar />
            
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                {/* Root URL: Public Explore for visitors; Operational Home for authenticated officers */}
                <Route path="/" element={<RootRoute />} />

                {/* Dedicated Public Explore Route */}
                <Route path="/explore" element={<ExplorePage />} />

                {/* Officer Login Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Citizen / Complainant Portal Routes */}
                <Route path="/complainant/login" element={<ComplainantLoginPage />} />
                <Route path="/complainant/register" element={<ComplainantRegisterPage />} />
                <Route
                  path="/complainant/dashboard"
                  element={
                    <ComplainantProtectedRoute>
                      <ComplainantDashboardPage />
                    </ComplainantProtectedRoute>
                  }
                />
                <Route
                  path="/complainant/cases/:id"
                  element={
                    <ComplainantProtectedRoute>
                      <ComplainantDashboardPage />
                    </ComplainantProtectedRoute>
                  }
                />

              {/* Protected Authority Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cases"
                element={
                  <ProtectedRoute>
                    <CaseRegisterPage />
                  </ProtectedRoute>
                }
              />
              {/* Route alias for Case Register */}
              <Route
                path="/case-register"
                element={
                  <ProtectedRoute>
                    <CaseRegisterPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cases/:id"
                element={
                  <ProtectedRoute>
                    <CaseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institutions"
                element={
                  <ProtectedRoute>
                    <InstitutionListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institutions/:id"
                element={
                  <ProtectedRoute>
                    <InstitutionProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/overlaps"
                element={
                  <ProtectedRoute>
                    <OverlapCenterPage />
                  </ProtectedRoute>
                }
              />
              {/* Route alias for Overlap Center */}
              <Route
                path="/overlap-center"
                element={
                  <ProtectedRoute>
                    <OverlapCenterPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/action-conflicts"
                element={
                  <ProtectedRoute>
                    <ActionConflictPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordination"
                element={
                  <ProtectedRoute>
                    <CoordinationWorkspacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/surges"
                element={
                  <ProtectedRoute>
                    <SurgeDetectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/validation"
                element={
                  <ProtectedRoute>
                    <ValidationSimulatorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'monitoring_officer']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />
              {/* Route alias for Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch-all: Redirect to Root */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <GovFooter />
        </div>
      </BrowserRouter>
      </ComplainantAuthProvider>
    </AuthProvider>
  );
};

export default App;
