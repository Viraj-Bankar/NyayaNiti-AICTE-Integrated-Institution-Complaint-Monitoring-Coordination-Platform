import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, LayoutDashboard, FileText, GitCompare, AlertTriangle,
  Layers, Building2, CheckCircle2, TrendingUp, BarChart3,
  ShieldCheck, Settings, Menu, X
} from 'lucide-react';

export const GovNavBar: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: Home, public: true },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, public: true },
    { label: 'Case Register', path: '/cases', icon: FileText, public: true },
    { label: 'Overlap Center', path: '/overlaps', icon: GitCompare, badge: 'AI', public: true },
    { label: 'Action Conflicts', path: '/action-conflicts', icon: AlertTriangle, public: true },
    { label: 'Coordination', path: '/coordination', icon: Layers, public: true },
    { label: 'Institutions', path: '/institutions', icon: Building2, public: true },
    { label: 'Validation Engine', path: '/validation', icon: CheckCircle2, public: true },
    { label: 'Surge Detection', path: '/surges', icon: TrendingUp, public: true },
    { label: 'Reports', path: '/reports', icon: BarChart3, public: true },
    ...(hasRole(['super_admin', 'monitoring_officer'])
      ? [{ label: 'Audit Trail', path: '/audit', icon: ShieldCheck, public: false }]
      : []),
    ...(hasRole(['super_admin'])
      ? [{ label: 'Admin Settings', path: '/admin', icon: Settings, public: false }]
      : [])
  ];

  return (
    <nav className="bg-[#092D62] text-white border-b-2 border-[#061E46] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Mobile toggle */}
        <div className="flex md:hidden py-2.5 items-center justify-between w-full">
          <span className="text-xs font-bold text-amber-300">AICTE NyayaNiti Portal</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded bg-[#061E46] text-white hover:text-[#FFB900]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-0.5 overflow-x-auto py-0">
          {navItems.map((item) => {
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
                  <span className="text-[9px] bg-[#FFB900] text-[#061E46] font-extrabold px-1 py-0.2 rounded-sm ml-0.5">
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
          {navItems.map((item) => {
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
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
};
