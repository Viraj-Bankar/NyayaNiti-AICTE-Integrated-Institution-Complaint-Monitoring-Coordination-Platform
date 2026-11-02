import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  Shield,
  Building2,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  User,
} from 'lucide-react';

interface ExploreHeroProps {
  onExploreClick: () => void;
  onLoginClick: () => void;
}

export const ExploreHero: React.FC<ExploreHeroProps> = ({ onExploreClick, onLoginClick }) => {
  return (
    <section
      id="hero"
      className="bg-gradient-to-b from-[#061E46] via-[#092D62] to-[#0D3875] text-white py-14 sm:py-16 px-4 border-b-4 border-[#FFB900] shadow-md relative overflow-hidden"
    >
      {/* Subtle background decorative grid pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
        {/* Left Column: Core Message & Actions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-[#FFB900]/15 border border-[#FFB900]/40 px-3.5 py-1 rounded-full text-xs font-bold text-[#FFB900] tracking-wide uppercase shadow-xs">
            <Compass className="w-3.5 h-3.5 flex-shrink-0" />
            <span>AICTE | Institutional Complaint Monitoring Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            One Platform.{' '}
            <span className="text-[#FFB900] block sm:inline">
              Unified Complaint Intelligence.
            </span>{' '}
            Coordinated Resolution.
          </h1>

          {/* Platform Description */}
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-normal">
            NyayaNiti enables centralized monitoring of institution-related complaints, intelligent identification of potential overlaps and coordinated action across AICTE bureaus and cells.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={onExploreClick}
              className="btn-3d-amber px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md transition-transform"
            >
              <span>Explore Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/complainant/login"
              className="px-5 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all"
            >
              <User className="w-4 h-4 text-[#FFB900]" />
              <span>Track Your Complaint</span>
            </Link>

            <button
              onClick={onLoginClick}
              className="btn-3d-white px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md transition-transform"
            >
              <Shield className="w-4 h-4 text-[#092D62]" />
              <span>Officer Login</span>
            </button>
          </div>

          {/* Trust & Mandate Badges */}
          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified AICTE Permanent ID Anchoring</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Human-in-the-Loop Governance</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable Statutory Audit Trails</span>
            </span>
          </div>
        </div>

        {/* Right Column: Illustrative Government Dashboard Visual */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white/95 text-slate-900 rounded-xl p-5 shadow-2xl border-2 border-white/20 backdrop-blur-md space-y-3.5">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-[#092D62] ml-1">
                  AICTE Institutional Intelligence Monitor
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-blue-50 text-[#1E5AA8] px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                Illustrative Sample
              </span>
            </div>

            {/* Illustrative Status Indicators */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Intake Desks</span>
                <span className="text-xs font-black text-[#092D62]">4 Connected</span>
              </div>
              <div className="bg-blue-50/80 p-2 rounded border border-blue-200">
                <span className="text-[9px] font-bold text-[#1E5AA8] uppercase block">AI Overlap Scan</span>
                <span className="text-xs font-black text-[#1E5AA8]">Active (MPNet)</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                <span className="text-[9px] font-bold text-emerald-800 uppercase block">Conflict Check</span>
                <span className="text-xs font-black text-emerald-800">Synchronized</span>
              </div>
            </div>

            {/* Sample Institutional Dossier Card */}
            <div className="p-3 bg-gradient-to-r from-[#061E46] to-[#092D62] text-white rounded-lg border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#FFB900] font-bold flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Technical Campus Dossier</span>
                </span>
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-slate-200">
                  AICTE-ID: 1-1029XXXX
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">
                Apex Institute of Technology & Engineering
              </div>
              <div className="text-[10px] text-slate-300">
                360° View • 2 Active Dockets • Inter-Bureau Workspace Assigned
              </div>
            </div>

            {/* Sample Cross-Bureau Overlap Alert */}
            <div className="p-2.5 bg-amber-50/90 rounded-lg border border-amber-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-950 flex items-center gap-1">
                  <GitMerge className="w-3 h-3 text-amber-600" />
                  <span>AI Overlap Advisory #OVR-7821</span>
                </span>
                <span className="text-[9px] font-bold font-mono bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded">
                  88.4% Match
                </span>
              </div>
              <p className="text-[10px] text-amber-900 leading-tight">
                Related representations detected between <strong>Regulation Bureau</strong> and <strong>PGRC Cell</strong>.
              </p>
              <div className="flex items-center justify-between text-[9px] text-amber-800 pt-0.5 border-t border-amber-200/60">
                <span>Advisory Only • Non-Destructive</span>
                <span className="font-semibold text-amber-950">Awaiting Officer Review</span>
              </div>
            </div>

            {/* Regulatory Action Sentinel Indicator */}
            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 flex items-center justify-between text-[10px] text-emerald-900">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Regulatory Action Sentinel</span>
              </span>
              <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                Zero Conflicts
              </span>
            </div>

            {/* Illustrative Disclaimer Note */}
            <div className="text-[9px] text-slate-400 text-center italic pt-0.5">
              * Illustrative interface mockup showcasing non-sensitive synthetic sample data.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;
