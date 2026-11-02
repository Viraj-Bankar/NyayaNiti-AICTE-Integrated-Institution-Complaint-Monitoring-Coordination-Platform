import React from 'react';
import { Compass, ArrowRight, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

interface ExploreHeroProps {
  onExploreClick: () => void;
  onLoginClick: () => void;
}

export const ExploreHero: React.FC<ExploreHeroProps> = ({ onExploreClick, onLoginClick }) => {
  return (
    <section
      id="hero"
      className="bg-gradient-to-b from-[#061E46] via-[#092D62] to-[#0D3875] text-white py-14 px-4 border-b-4 border-[#FFB900] shadow-md relative overflow-hidden"
    >
      {/* Subtle background decorative grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[#FFB900]/15 border border-[#FFB900]/40 px-3 py-1 rounded-full text-xs font-bold text-[#FFB900] tracking-wide uppercase">
            <Compass className="w-3.5 h-3.5" />
            <span>Government of India • Ministry of Education • AICTE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            Explore <span className="text-[#FFB900]">NyayaNiti</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 font-semibold leading-relaxed">
            Towards a Unified and Intelligent Institutional Grievance Ecosystem
          </p>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            An Integrated Intelligence Platform for Monitoring, Tracking and Coordinating Institution-Related Complaints Across AICTE Bureaus and Cells. NyayaNiti connects institutional data, complaint histories and inter-bureau workflows to provide complete institutional visibility, proactive coordination and informed decision-making.
          </p>

          {/* CTAs using existing 3D button styles */}
          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <button
              onClick={onExploreClick}
              className="btn-3d-amber px-5 py-2.5 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Explore Our Vision</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onLoginClick}
              className="btn-3d-white px-5 py-2.5 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Shield className="w-4 h-4 text-[#092D62]" />
              <span>Login to Platform</span>
            </button>
          </div>
        </div>

        {/* Hero Visual Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white/95 text-slate-900 rounded-xl p-5 shadow-2xl border-2 border-white/20 backdrop-blur-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-[#092D62] ml-1">AICTE Convergence Engine</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-[#1E5AA8] px-2 py-0.5 rounded border border-blue-200">
                SYSTEM ARCHITECTURE
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {/* Visual node representation of Bureaus converging */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-blue-50/80 rounded border border-blue-200 text-[#092D62]">
                  <span className="font-extrabold block text-xs">Regulation Bureau</span>
                  <span className="text-[10px] text-slate-600">Norms & statutory governance</span>
                </div>
                <div className="p-2.5 bg-amber-50/80 rounded border border-amber-200 text-amber-900">
                  <span className="font-extrabold block text-xs">PGRC Cell</span>
                  <span className="text-[10px] text-slate-600">Student & citizen grievances</span>
                </div>
                <div className="p-2.5 bg-emerald-50/80 rounded border border-emerald-200 text-emerald-900">
                  <span className="font-extrabold block text-xs">Approval Bureau</span>
                  <span className="text-[10px] text-slate-600">Institutional EoA & intake</span>
                </div>
                <div className="p-2.5 bg-purple-50/80 rounded border border-purple-200 text-purple-900">
                  <span className="font-extrabold block text-xs">Policy & Vigilance</span>
                  <span className="text-[10px] text-slate-600">Investigation & compliance</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-[#061E46] to-[#092D62] text-white rounded-lg border border-slate-700 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFB900]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NyayaNiti Centralized Intelligence Platform</span>
                </div>
                <p className="text-[10px] text-slate-200 mt-1">
                  Permanent AICTE ID • MPNet Semantic Overlap Engine • Unified Dossier
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Preserves Case Identity
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Auditable Traces
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;
