import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, LayoutDashboard, Inbox, FileText, GitCompare, AlertTriangle,
  Layers, Building2, CheckCircle2, TrendingUp, BarChart3,
  ShieldCheck, Settings, Menu, X, Award
} from 'lucide-react';

export const GovNavBar: React.FC = () => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ============================================================
  // STRICT REQUIREMENT: UNIFORM PUBLIC WEBSITE EXPERIENCE
  // Before login or during authentication loading, do NOT render
  // operational navigation tabs or public explore section tabs.
  // Public visitors see only the single continuous Explore page.
  // ============================================================
  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  // Operational Navigation Items for Authenticated Personnel
  const operationalNavItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Complaint Intake', path: '/complaint-intake', icon: Inbox, badge: 'Intake' },
    { label: 'Case Register', path: '/cases', icon: FileText },
    { label: 'Overlap Center', path: '/overlaps', icon: GitCompare, badge: 'AI' },
    { label: 'Action Conflicts', path: '/action-conflicts', icon: AlertTriangle },
    { label: 'Coordination', path: '/coordination', icon: Layers },
    { label: 'Institutional Governance', path: '/compliance', icon: Award, badge: 'Phase 8' },
    { label: 'Institutions', path: '/institutions', icon: Building2 },
    { label: 'Validation Engine', path: '/validation', icon: CheckCircle2 },
    { label: 'Surge Detection', path: '/surges', icon: TrendingUp },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    ...(hasRole(['super_admin', 'monitoring_officer'])
      ? [{ label: 'Audit Trail', path: '/audit', icon: ShieldCheck }]
      : []),
    ...(hasRole(['super_admin'])
      ? [{ label: 'Admin Settings', path: '/admin', icon: Settings }]
      : [])
  ];

  return (
    <nav className="bg-[#092D62] text-white border-b-2 border-[#061E46] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Mobile toggle */}
        <div className="flex md:hidden py-2.5 items-center justify-between w-full">
          <span className="text-xs font-bold text-amber-300">
            AICTE NyayaNiti Officer Portal
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded bg-[#061E46] text-white hover:text-[#FFB900] cursor-pointer"
            aria-label="Toggle Operational Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Desktop Operational Navigation Links */}
        <div className="hidden md:flex items-center space-x-0.5 overflow-x-auto py-0">
          {operationalNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap transition-all border-b-4 ${
                    isActive
                      ? 'border-[#FFB900] text-[#FFB900] bg-[#061E46]'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-[#123C7B]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] bg-[#FFB900] text-[#061E46] font-extrabold px-1 py-0.2 rounded-xs ml-0.5">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#061E46] border-t border-slate-700 px-4 py-3 space-y-1">
          {operationalNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-xs font-medium ${
                    isActive ? 'bg-[#FFB900] text-[#061E46] font-bold' : 'text-slate-200 hover:bg-[#092D62]'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] bg-[#FFB900] text-[#061E46] font-extrabold px-1 py-0.2 rounded-xs ml-auto">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default GovNavBar;
