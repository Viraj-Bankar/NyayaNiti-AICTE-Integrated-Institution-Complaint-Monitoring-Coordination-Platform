import React from 'react';
import { Layers, GitMerge, AlertTriangle, Building2, Clock, FileSearch } from 'lucide-react';

export const ExploreChallenges: React.FC = () => {
  return (
    <section id="challenges" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#C62828] uppercase tracking-wider bg-red-50 px-2.5 py-1 rounded border border-red-200">
            Operational Vulnerabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Why a Unified Monitoring System Matters
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Six critical administrative challenges that arise when institutional grievance management operates across isolated departmental silos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#092D62] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#092D62] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                1. Fragmented Information
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complaints regarding the same college or university are scattered across distinct databases, intake desks, and emails, preventing authorities from observing overall compliance health.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Isolated Records
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#FFB900] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#B8860B] flex items-center justify-center">
                <GitMerge className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                2. Repeated Investigation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multiple bureaus examine parallel representations filed by faculty and student unions regarding identical disputes, resulting in duplicated hearings and wasted officer hours.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Redundant Inquiries
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#C62828] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-[#C62828] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                3. Coordination Gaps
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                One bureau may issue a closure order or compliance certificate while another department actively schedules an on-site fact-finding inquiry for the same academic session.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Contradictory Rulings
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#25B8BD] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#25B8BD] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                4. Limited Institutional Insights
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Difficulty in detecting recurring institutional non-compliance patterns across years, including recurrent faculty shortages, unauthorized shifts, or infrastructure deficits.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Lack of Pattern Detection
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#1E5AA8] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1E5AA8] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                5. Delayed Administrative Awareness
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Critical institutional escalations may languish at junior appraisal levels without senior leadership receiving consolidated risk notifications prior to statutory deadlines.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Escalation Delays
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-white rounded-lg p-5 border-t-4 border-[#7B1FA2] border-x border-b border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#7B1FA2] flex items-center justify-center">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                6. Limited Historical Context
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Officers evaluating a new complaint have limited means to cross-reference historical show-cause notices, previous inspection minutes, and compliance undertakings filed earlier.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Missing Compliance Lineage
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreChallenges;
