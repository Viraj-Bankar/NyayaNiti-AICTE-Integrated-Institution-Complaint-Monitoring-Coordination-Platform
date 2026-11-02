import React from 'react';
import { Scale } from 'lucide-react';

export const ExploreAbout: React.FC = () => {
  return (
    <section id="about" className="py-14 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Administrative Mandate
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Understanding the Need for NyayaNiti
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Transforming technical education grievance governance by connecting administrative touchpoints into a unified institutional view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p>
              In a nationwide technical education ecosystem encompassing thousands of approved universities, colleges, and polytechnics, complaints regarding the <strong>same educational institution</strong> can reach different AICTE bureaus or cells through multiple intake portals and official representations.
            </p>
            <p>
              A faculty irregularity complaint may be submitted to the <strong>Regulation Bureau (RB)</strong>, while simultaneous student petitions regarding fee overcharging reach the <strong>Public Grievance Redressal Cell (PGRC)</strong>. Concurrently, questions concerning sanctioned intake or course authenticity may be logged with the <strong>Approval Bureau</strong>.
            </p>
            <div className="p-4 bg-amber-50/70 border-l-4 border-[#FFB900] rounded-r-lg text-xs text-amber-950 space-y-1">
              <span className="font-bold block text-sm text-[#061E46]">The Silo Challenge</span>
              <p>
                Without a unified monitoring system, related complaints may be handled independently by each department. This fragmentation leads to duplicated administrative effort, potentially inconsistent or conflicting departmental actions, and prolonged resolution times for complainants.
              </p>
            </div>
            <p>
              <strong>NyayaNiti</strong> solves this challenge by serving as the centralized administrative platform that links every complaint to verified AICTE Permanent IDs, identifies cross-bureau relationships, and provides authorized officers with coordinated workspaces to reach harmonious, statutory outcomes.
            </p>
          </div>

          <div className="bg-[#F4F6F9] rounded-xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-[#092D62] uppercase tracking-wide flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#1E5AA8]" />
              <span>Foundational Pillars</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1E5AA8] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#061E46]">Unified Institutional Visibility</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                    Every complaint is mapped to a verified AICTE Permanent Institution ID, assembling complete multi-bureau history into a comprehensive dossier.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-[#FFB900] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#061E46]">Intelligent Complaint Relationships</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                    Deep semantic machine learning connects complaints with overlapping factual allegations across departments, surfacing decision-support alerts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#061E46]">Coordinated Administrative Response</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                    Inter-departmental workspaces allow bureaus to collaborate on joint inquiries, designate lead officers, and reconcile orders before dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreAbout;
