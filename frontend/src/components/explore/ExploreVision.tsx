import React from 'react';
import { Building2, Sparkles, Cpu, AlertTriangle, Activity } from 'lucide-react';

export const ExploreVision: React.FC = () => {
  return (
    <section id="vision" className="py-14 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Strategic Blueprint
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            One Institution. One Unified View. Coordinated Action.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            NyayaNiti anchors the entire complaint governance ecosystem around verified AICTE Permanent IDs, synchronizing intelligence without destroying individual statutory jurisdictions.
          </p>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="bg-[#F4F6F9] border-2 border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <span className="text-xs font-bold text-[#092D62] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-300 shadow-2xs">
              NyayaNiti Integrated Convergence Architecture
            </span>
          </div>

          {/* Level 1: Educational Institution */}
          <div className="max-w-md mx-auto bg-gradient-to-r from-[#061E46] to-[#092D62] text-white p-4 rounded-xl shadow-md text-center border border-slate-700">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#FFB900]">
              <Building2 className="w-4 h-4" />
              <span>Educational Institution Under AICTE Purview</span>
            </div>
            <p className="text-[11px] text-slate-200 mt-1">
              Anchored to Permanent AICTE Institution ID • Alias Harmonization • 360° Dossier
            </p>
          </div>

          {/* Flow Indicator Down */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-slate-300" />
          </div>

          {/* Level 2: Multi-Bureau Intake Channels */}
          <div>
            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Decentralized Intake Touchpoints & Complainant Representations
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-xs font-extrabold text-[#092D62] block">Regulation Bureau</span>
                <span className="text-[10px] text-slate-500">Curricular & Norm Deficiencies</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-xs font-extrabold text-amber-900 block">PGRC Cell</span>
                <span className="text-[10px] text-slate-500">Student & Staff Grievances</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-xs font-extrabold text-emerald-900 block">Approval Bureau</span>
                <span className="text-[10px] text-slate-500">Sanctioned Intake & EoA</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-xs font-extrabold text-purple-900 block">Vigilance & Regional</span>
                <span className="text-[10px] text-slate-500">Site Inquiries & Fact Finding</span>
              </div>
            </div>
          </div>

          {/* Flow Indicator Down */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-slate-300" />
          </div>

          {/* Level 3: NyayaNiti Core Engine */}
          <div className="bg-white p-5 rounded-xl border-2 border-[#1E5AA8] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-2 border-b border-slate-200 gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFB900]" />
                <span className="text-xs font-bold text-[#061E46] uppercase tracking-wide">
                  NyayaNiti Core Intelligence & Coordination Engine
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                Dual-Stage Machine Learning
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                <div className="font-bold text-[#092D62] text-[11px] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#1E5AA8]" />
                  <span>MPNet Semantic Matching</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  768-d vector embeddings detect related grievances across varied phrasing and languages.
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <div className="font-bold text-amber-950 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Action Conflict Engine</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Continuously scans proposed directives to prevent contradictory orders or simultaneous actions.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                <div className="font-bold text-emerald-950 text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Priority & Surge Triage</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Dynamic severity scoring, SLA clock tracking, and statistical complaint surge anomaly flags.
                </p>
              </div>
            </div>
          </div>

          {/* Flow Indicator Down */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-slate-300" />
          </div>

          {/* Level 4: Coordinated Outcomes */}
          <div>
            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Synchronized Governance & Informed Decision-Making
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="font-bold text-[#092D62] block text-xs">Shared Bureau Workspaces</span>
                <span className="text-[10px] text-slate-600">Cross-department collaborative notes & minutes</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="font-bold text-[#092D62] block text-xs">Harmonized Directives</span>
                <span className="text-[10px] text-slate-600">Unified show-cause notices & joint inspections</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="font-bold text-[#092D62] block text-xs">Audited Resolutions</span>
                <span className="text-[10px] text-slate-600">Complete chronological audit trails for oversight</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
