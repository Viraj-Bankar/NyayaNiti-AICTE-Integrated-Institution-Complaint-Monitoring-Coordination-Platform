import React from 'react';
import { Eye, GitMerge, Users, ShieldCheck } from 'lucide-react';

export const ExploreAbout: React.FC = () => {
  return (
    <section id="about" className="py-14 sm:py-16 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            About NyayaNiti
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            Integrated Institutional Complaint Monitoring & Coordination
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            NyayaNiti is an integrated institutional complaint monitoring and cross-bureau coordination platform designed to improve visibility, identify related complaints and support coordinated resolution.
          </p>
        </div>

        {/* 2-Column Explanatory Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text: Context & Need */}
          <div className="lg:col-span-7 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p>
              In a national technical education framework encompassing thousands of affiliated institutions, representations and grievances regarding an educational campus frequently reach different AICTE departments independently.
            </p>
            <p>
              Academic norm deficiencies and curricular issues may be submitted to the <strong>Regulation Bureau (RB)</strong>, while student fee grievances and faculty petitions are concurrently submitted to the <strong>Public Grievance Redressal Cell (PGRC)</strong>. Meanwhile, queries concerning sanctioned intake or program approvals are routed to the <strong>Approval Bureau</strong>.
            </p>

            <div className="p-4 bg-[#F4F6F9] border-l-4 border-[#092D62] rounded-r-lg space-y-1.5 text-xs text-slate-800">
              <span className="font-bold text-[#061E46] block text-sm">
                Why Centralized Coordination is Needed
              </span>
              <p className="text-slate-600 leading-relaxed">
                When complaints are processed in departmental silos without a shared overview, administrative effort is duplicated, parallel hearings may occur, and contradictory decisions can arise. NyayaNiti bridges these operational boundaries by anchoring complaints to verified AICTE Permanent Institution IDs.
              </p>
            </div>

            <p>
              By providing Council leadership and statutory officers with a synchronized cross-bureau workspace, NyayaNiti facilitates informed decision-making, protects case lineage, and ensures accountability without eroding individual departmental jurisdiction.
            </p>
          </div>

          {/* Right Cards: 3 Foundational Objectives */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Objective 1 */}
            <div className="bg-[#F4F6F9] rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-[#092D62] transition-colors flex items-start gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#061E46]">
                  1. Comprehensive Institutional Visibility
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Consolidates all complaints, past directives, and compliance undertakings linked to an institution into a single master overview.
                </p>
              </div>
            </div>

            {/* Objective 2 */}
            <div className="bg-[#F4F6F9] rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-[#092D62] transition-colors flex items-start gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center flex-shrink-0">
                <GitMerge className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#061E46]">
                  2. Related Complaint Identification
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Identifies related grievances filed across bureaus using semantic similarity analysis, surfacing ranked decision-support alerts for officer review.
                </p>
              </div>
            </div>

            {/* Objective 3 */}
            <div className="bg-[#F4F6F9] rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-[#092D62] transition-colors flex items-start gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#061E46]">
                  3. Coordinated Statutory Resolution
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enables departments to synchronize inquiry schedules, agree upon joint inspection notices, and prevent contradictory orders before dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preserving Statutory Identity Badge */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#092D62] flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1E5AA8] flex-shrink-0" />
            <span>Preserves independent legal dockets, original case evidence, and statutory bureau autonomy.</span>
          </span>
          <span className="text-[10px] font-bold font-mono uppercase bg-white px-2 py-0.5 rounded border border-blue-200 text-[#092D62]">
            AICTE Act, 1987 Aligned
          </span>
        </div>
      </div>
    </section>
  );
};

export default ExploreAbout;
