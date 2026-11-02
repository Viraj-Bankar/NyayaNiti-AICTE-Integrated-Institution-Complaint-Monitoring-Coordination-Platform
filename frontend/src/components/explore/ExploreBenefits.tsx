import React from 'react';
import { Eye, GitMerge, Users, Clock, ShieldCheck, FileCheck } from 'lucide-react';

export const ExploreBenefits: React.FC = () => {
  return (
    <section id="benefits" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#218653] uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            Institutional Outcomes
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Creating Better Institutional Oversight
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Measurable administrative impact delivered through unified intelligence and cross-bureau coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#092D62] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">1. Single Source of Truth</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              A single authoritative window providing Council leadership with complete visibility into institutional grievance trends across the nation.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#FFB900] flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">2. Elimination of Redundant Inquiries</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Eliminates repeated parallel inquiries by multiple departments examining identical allegations on the same technical campus.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">3. Prevention of Conflicting Orders</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Synchronized decision-making between Regulation Bureau, PGRC, Approvals, and Vigilance teams for legally coherent regulatory directives.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">4. Accelerated Redressal Cycles</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citizen-centric speed with automated SLA countdowns, priority triage, and immediate escalation alerts to resolve urgent grievances faster.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">5. Deterrence Against Malicious Filings</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verified identity checks and historical correlation expose frivolous campaigns and retaliatory grievances against educational institutions.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#061E46]">6. Evidence-Based Policy Formulation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aggregate insights and systemic violation heatmaps enable AICTE leadership to adapt approval criteria and formulate targeted regulatory reforms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
