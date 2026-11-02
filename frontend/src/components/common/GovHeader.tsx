import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Sparkles, ChevronDown, LogIn } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const GovHeader: React.FC = () => {
  const { user, isAuthenticated, demoLogin } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const location = useLocation();

  const handleRoleSwitch = async (role: string) => {
    await demoLogin(role);
    setShowRoleMenu(false);
  };

  // ============================================================
  // 1. PUBLIC WEBSITE HEADER (BEFORE LOGIN)
  // ============================================================
  if (!isAuthenticated || !user) {
    return (
      <header className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* LEFT: Existing AICTE Emblem Logo + NyayaNiti Branding */}
          <Link to="/" className="flex items-center gap-3.5 group">
            {/* AICTE Stylized Emblem / Seal */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#061E46] via-[#092D62] to-[#1E5AA8] p-1 flex items-center justify-center shadow-md flex-shrink-0 group-hover:shadow-lg transition-shadow">
              <div className="w-full h-full rounded-full border border-amber-400/60 flex flex-col items-center justify-center text-white text-center">
                <span className="text-[9px] font-bold tracking-tighter text-[#FFB900]">AICTE</span>
                <span className="text-[7px] tracking-widest uppercase">INDIA</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#FFB900] bg-[#092D62] px-2 py-0.5 rounded">
                  न्यायनीति
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#092D62] tracking-tight">
                  NyayaNiti
                </span>
              </div>
              <h1 className="text-xs font-bold text-[#061E46] leading-tight hidden sm:block">
                अखिल भारतीय तकनीकी शिक्षा परिषद | ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Integrated Institution Complaint Monitoring & Coordination Platform
              </p>
            </div>
          </Link>

          {/* RIGHT: Login Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              state={location.state}
              className="btn-3d-amber px-4 sm:px-5 py-2 rounded text-xs tracking-wide font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Official Authorized Officer Access"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // ============================================================
  // 2. AUTHENTICATED APPLICATION HEADER (AFTER LOGIN)
  // ============================================================
  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: AICTE National Authority Brand */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#061E46] via-[#092D62] to-[#1E5AA8] p-1 flex items-center justify-center shadow-md flex-shrink-0 group-hover:shadow-lg transition-shadow">
            <div className="w-full h-full rounded-full border border-amber-400/60 flex flex-col items-center justify-center text-white text-center">
              <span className="text-[9px] font-bold tracking-tighter text-[#FFB900]">AICTE</span>
              <span className="text-[7px] tracking-widest uppercase">INDIA</span>
            </div>
          </div>

          <div>
            <h1 className="text-sm font-bold text-[#061E46] leading-tight">
              अखिल भारतीय तकनीकी शिक्षा परिषद
            </h1>
            <h2 className="text-xs font-semibold text-[#1E5AA8] tracking-wide">
              ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              (A Statutory Body of the Government of India, Ministry of Education)
            </p>
          </div>
        </Link>

        {/* Right: NyayaNiti Portal Branding & Interactive Role Switcher */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block border-r border-slate-200 pr-4">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold text-[#FFB900] bg-[#092D62] px-2 py-0.5 rounded">
                न्यायनीति
              </span>
              <span className="text-base font-extrabold text-[#092D62] tracking-tight">
                NyayaNiti
              </span>
            </div>
            <p className="text-[11px] text-[#66788A] font-medium max-w-xs leading-snug">
              Integrated Institution Complaint Monitoring & Cross-Bureau Coordination Platform
            </p>
          </div>

          {/* Role Switcher Menu for Authenticated Officers */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 bg-[#F4F6F9] hover:bg-slate-200/80 border border-slate-300 px-3 py-1.5 rounded text-xs font-medium text-[#092D62] shadow-sm transition-all cursor-pointer"
              title="Fast switch between officer roles for evaluation"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB900]" />
              <span className="hidden md:inline">Current Role:</span>
              <span className="font-bold text-[#092D62]">
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  Switch Administrative Role
                </div>
                <button
                  onClick={() => handleRoleSwitch('super_admin')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-[#092D62] cursor-pointer"
                >
                  <div>
                    <div className="font-bold">Super Admin</div>
                    <div className="text-[10px] text-slate-500">Dr. Rajesh Sharma (Member Sec.)</div>
                  </div>
                  {user.role === 'super_admin' && <Shield className="w-3.5 h-3.5 text-green-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('bureau_head')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-[#092D62] cursor-pointer"
                >
                  <div>
                    <div className="font-bold">Bureau Head (RB)</div>
                    <div className="text-[10px] text-slate-500">Prof. S. K. Mahapatra (Adviser-I)</div>
                  </div>
                  {user.role === 'bureau_head' && <Shield className="w-3.5 h-3.5 text-green-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('authorized_officer')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-[#092D62] cursor-pointer"
                >
                  <div>
                    <div className="font-bold">Authorized Officer (PGRC)</div>
                    <div className="text-[10px] text-slate-500">Dr. Ananya Verma (Deputy Dir.)</div>
                  </div>
                  {user.role === 'authorized_officer' && <Shield className="w-3.5 h-3.5 text-green-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('monitoring_officer')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-[#092D62] cursor-pointer"
                >
                  <div>
                    <div className="font-bold">Monitoring Officer</div>
                    <div className="text-[10px] text-slate-500">Shri Vikram Singh (Dir. Vigilance)</div>
                  </div>
                  {user.role === 'monitoring_officer' && <Shield className="w-3.5 h-3.5 text-green-600" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
