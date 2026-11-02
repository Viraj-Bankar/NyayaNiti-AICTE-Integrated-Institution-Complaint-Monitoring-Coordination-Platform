import React from 'react';
import { FileText, CheckCircle2, Award, Cpu, Users, FileCheck } from 'lucide-react';

export const ExploreHowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-14 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#FFB900] bg-[#061E46] px-2.5 py-1 rounded uppercase tracking-wide">
            OPERATIONAL LIFECYCLE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            From Complaint Submission to Coordinated Monitoring
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            A seamless six-stage statutory lifecycle connecting complainants, educational institutions, and Council authorities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">01</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">1. Complaint Submission</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A complainant submits an institution-related grievance, providing incident details, institution name or permanent ID, category of grievance, and supporting attachments.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              Intake & Category Ingestion
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">02</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">2. Standing & Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The platform verifies the complainant through an approved verification method to establish standing, protect bona fide whistleblowers, and deter frivolous submissions.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              TrustID Standing Verification
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">03</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">3. Permanent ID Concordance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The complaint receives a unique, tamper-evident reference number (e.g. <code>AICTE-RB-2024-XXXX</code>) and is linked to the institution’s official AICTE profile.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              Permanent AICTE Record
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">04</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">4. AI Similarity Mapping</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The semantic matching engine analyzes complaint texts against active cases, calculating similarity embeddings, evaluating priority scores, and detecting potential conflicts.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              Overlap & Severity Evaluation
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">05</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">5. Bureau Coordination</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Relevant authorities review findings in joint workspaces, designate lead bureaus, agree on unified inquiries, and reconcile potential order contradictions.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              Collaborative Inter-Bureau Workspace
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 relative flex flex-col justify-between hover:border-[#092D62] transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#092D62] font-mono">06</span>
                <div className="w-8 h-8 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">6. Timed Resolution & Audit</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized officers update compliance milestones, enforce statutory SLA deadlines, and finalize official disposals with a complete chronological audit history.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
              Audited Statutory Disposal
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
