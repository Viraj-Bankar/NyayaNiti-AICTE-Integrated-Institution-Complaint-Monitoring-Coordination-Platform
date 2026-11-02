import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useComplainantAuth } from '../../context/ComplainantAuthContext';
import { LogOut, User } from 'lucide-react';

export const ComplainantHeader: React.FC = () => {
  const { complainant, logout } = useComplainantAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: AICTE Emblem + Citizen Portal Branding */}
        <Link to="/complainant/dashboard" className="flex items-center gap-3 group">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#061E46] via-[#092D62] to-[#1E5AA8] p-1 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-full h-full rounded-full border border-amber-400/60 flex flex-col items-center justify-center text-white text-center">
              <span className="text-[8px] font-bold text-[#FFB900]">AICTE</span>
              <span className="text-[6px] tracking-widest uppercase">CITIZEN</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FFB900] bg-[#092D62] px-2 py-0.5 rounded">
                न्यायनीति
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#092D62]">
                Citizen Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
              AICTE Institutional Complaint Redressal & Milestone Tracking
            </p>
          </div>
        </Link>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#061E46] flex items-center gap-1 justify-end">
              <User className="w-3.5 h-3.5 text-[#1E5AA8]" />
              {complainant?.full_name || 'Citizen User'}
            </span>
            <span className="text-[10px] text-slate-500">
              {complainant?.email} • {complainant?.complainant_type || 'Student'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-3d-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 shadow-2xs hover:text-red-700"
            title="Sign out of Citizen Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ComplainantHeader;
