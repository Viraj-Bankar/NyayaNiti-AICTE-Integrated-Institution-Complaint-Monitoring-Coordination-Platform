import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

/**
 * PublicHeader:
 * Rendered for unauthenticated visitors on the public Explore page.
 *
 * Strict Requirements:
 * LEFT:
 * - AICTE logo / emblem
 * - NyayaNiti logo & branding
 * RIGHT:
 * - Login button
 *
 * Strictly NO operational or administrative elements:
 * No Dashboard, Case Register, Overlap Center, Action Conflicts, Coordination,
 * Institutions, Validation Engine, Surge Detection, Reports, SUPER ADMIN,
 * Current Role, Logout, or Authority navigation.
 */
export const PublicHeader: React.FC = () => {
  const location = useLocation();

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
};

export default PublicHeader;
