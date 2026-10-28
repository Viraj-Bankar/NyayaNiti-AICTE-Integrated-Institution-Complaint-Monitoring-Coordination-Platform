import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GovTopBar } from './components/common/GovTopBar';
import { GovHeader } from './components/common/GovHeader';
import { GovNavBar } from './components/common/GovNavBar';
import { GovFooter } from './components/common/GovFooter';

import { LandingPage } from './pages/LandingPage';
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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-800">
          <GovTopBar />
          <GovHeader />
          <GovNavBar />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cases" element={<CaseRegisterPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/institutions" element={<InstitutionListPage />} />
              <Route path="/institutions/:id" element={<InstitutionProfilePage />} />
              <Route path="/overlaps" element={<OverlapCenterPage />} />
              <Route path="/action-conflicts" element={<ActionConflictPage />} />
              <Route path="/coordination" element={<CoordinationWorkspacePage />} />
              <Route path="/surges" element={<SurgeDetectionPage />} />
              <Route path="/validation" element={<ValidationSimulatorPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit" element={<AuditLogsPage />} />
              <Route path="/admin" element={<AdminSettingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <GovFooter />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
