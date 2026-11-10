import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, CheckSquare, FileCheck2,
  AlertOctagon, ShieldAlert, Clock, Building2, Download
} from 'lucide-react';

export interface ComplianceSubNavProps {
  activeTab?: string;
}

export const ComplianceSubNav: React.FC<ComplianceSubNavProps> = () => {
  const { hasRole } = useAuth();

  const navItems = [
    { label: 'Compliance Dashboard', path: '/compliance', icon: LayoutDashboard, end: true },
    { label: 'Regulatory Requirements', path: '/compliance/requirements', icon: BookOpen },
    { label: 'Assessments', path: '/compliance/assessments', icon: CheckSquare },
    { label: 'Evidence Review', path: '/compliance/evidence', icon: FileCheck2 },
    { label: 'Corrective Actions (CAP)', path: '/compliance/caps', icon: AlertOctagon },
    { label: 'Risk Intelligence', path: '/compliance/risk-intelligence', icon: ShieldAlert },
    { label: 'SLA Analytics', path: '/compliance/sla-analytics', icon: Clock },
    ...(hasRole(['super_admin', 'bureau_head', 'monitoring_officer'])
      ? [{ label: 'Executive Governance', path: '/compliance/executive', icon: Building2 }]
      : []),
    { label: 'Governance Reports', path: '/compliance/reports', icon: Download },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[49px] z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap rounded-t-md transition-all border-b-2 ${
                      isActive
                        ? 'border-[#092D62] text-[#092D62] bg-slate-50 font-bold'
                        : 'border-transparent text-slate-600 hover:text-[#092D62] hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
          <div className="hidden lg:flex items-center gap-2 pl-4 text-[11px] text-slate-500 font-medium whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>AICTE Statutory Compliance Engine Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceSubNav;
