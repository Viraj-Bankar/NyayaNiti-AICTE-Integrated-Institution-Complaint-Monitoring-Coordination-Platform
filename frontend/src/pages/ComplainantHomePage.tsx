import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import {
  UserCheck, Shield, Clock, FileText,
  LogOut, ArrowRight, Sparkles
} from 'lucide-react';

export const ComplainantHomePage: React.FC = () => {
  const { complainant, logout } = useComplainantAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formattedDate = complainant?.created_at
    ? new Date(complainant.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Active Session';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <ComplainantHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#092D62] via-[#0D3B82] to-[#124B9E] rounded-2xl shadow-lg border border-blue-900/30 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-amber-300">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Authenticated Citizen Session • Phase 3 Identity Verified</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome, {complainant?.full_name || 'Complainant'}
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-2xl">
                You are securely signed into the AICTE NyayaNiti Public Grievance Portal. Your complainant identity is isolated and verified.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Card & Account Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-[#092D62]/10 flex items-center justify-center text-[#092D62] font-bold">
                {complainant?.full_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">{complainant?.full_name}</h3>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[#092D62] border border-blue-200">
                  {complainant?.complainant_type || 'Student'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Email Address</span>
                <span className="text-slate-800 font-medium break-all">{complainant?.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Mobile Number</span>
                <span className="text-slate-800 font-medium">{complainant?.mobile}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Registered On</span>
                <span className="text-slate-800 font-medium">{formattedDate}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Account Status</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Verified
                </span>
              </div>
            </div>
          </div>

          {/* Phase 4 Transition Callout */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Phase 3 Milestone Complete • Phase 4 Provisioning</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Citizen Grievance Submission & Milestone Tracking
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your complainant authentication, session isolation, and cryptographic identity boundary are fully operational.
                The comprehensive self-service grievance lodging and milestone lifecycle tracking workspace is scheduled for activation in <strong>Phase 4</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                  <FileText className="w-4 h-4 text-[#092D62]" />
                  <span>Unique Grievance ID</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Automatic statutory reference issuance formatted as <code className="text-[#092D62] font-semibold">AICTE-PGRC-YYYY-XXXX</code>.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                  <Clock className="w-4 h-4 text-[#092D62]" />
                  <span>Real-Time Milestone Timeline</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Transparent multi-stage progress tracking from intake to verification and resolution.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                AICTE NyayaNiti Citizen Security Engine • Zero administrative leakage
              </span>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#092D62] hover:text-blue-700 hover:underline"
              >
                <span>Explore Platform Capabilities</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Isolation Summary Banner */}
        <div className="rounded-xl bg-blue-50/60 border border-blue-200/80 p-5 flex items-start gap-4 text-xs sm:text-sm text-slate-700">
          <Shield className="w-5 h-5 text-[#092D62] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900">Cryptographic Identity Isolation Active</h4>
            <p className="text-slate-600 leading-relaxed">
              Your session is authenticated via a dedicated complainant JWT (<code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-[#092D62]">aud: nyayaniti-complainant</code>). 
              Administrative AICTE officer systems are mathematically isolated and cannot be accessed from citizen sessions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
