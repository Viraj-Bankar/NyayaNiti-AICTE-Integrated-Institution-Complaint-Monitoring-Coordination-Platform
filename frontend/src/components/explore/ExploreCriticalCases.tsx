import React from 'react';
import { Clock, AlertCircle, Building2, ShieldAlert } from 'lucide-react';

export const ExploreCriticalCases: React.FC = () => {
  return (
    <section id="critical-cases" className="py-14 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#C62828] uppercase tracking-wider bg-red-50 px-2.5 py-1 rounded border border-red-200">
            Statutory Escalation & Field Protocol
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Moving Beyond Digital Monitoring
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Standardized administrative triage ensuring zero procedural oversight on acute regulatory infractions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg border border-slate-200 bg-[#F4F6F9] space-y-3">
            <div className="w-9 h-9 rounded-md bg-red-50 text-[#C62828] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">Urgent Triage & SLA Triggers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cases involving severe statutory breaches—such as anti-ragging non-compliance, capitation fees, or safety endangerment—trigger compressed regulatory SLAs (7-day maximum response).
            </p>
          </div>

          <div className="p-5 rounded-lg border border-slate-200 bg-[#F4F6F9] space-y-3">
            <div className="w-9 h-9 rounded-md bg-amber-50 text-[#FFB900] flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">Executive Escalation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated multi-tier notification dispatches alerts directly to Bureau Heads and Member Secretary offices when cases breach 80% of their prescribed timeline without substantive action.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-slate-200 bg-[#F4F6F9] space-y-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 text-[#1E5AA8] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">On-Ground Field Assessment Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When authorized authorities order physical inspection, NyayaNiti supports recording field visit orders, on-ground inspection observations, photographic evidence, and formal compliance affidavits.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#092D62]" />
            <span>Full audit preservation: every priority change and escalation notice is stamped with officer ID and justification.</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Traceable Protocol</span>
        </div>
      </div>
    </section>
  );
};
