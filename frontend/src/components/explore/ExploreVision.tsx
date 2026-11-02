import React from 'react';
import {
  FileText,
  Cpu,
  Building2,
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const ExploreVision: React.FC = () => {
  const solutions = [
    {
      id: '01',
      title: '1. Centralized Complaint Monitoring',
      icon: FileText,
      tag: 'Unified Master Register',
      description:
        'Unifies complaint intake across all AICTE bureaus and cells into a standardized master register, anchoring every record to the verified AICTE Permanent ID while strictly preserving statutory case lineage.',
    },
    {
      id: '02',
      title: '2. AI-Assisted Semantic Overlap Identification',
      icon: Cpu,
      tag: 'Decision-Support Advisory',
      description:
        'Employs deep semantic sentence representations to identify potential complaint overlaps across bureaus, generating ranked decision-support alerts for human officer review and verification.',
    },
    {
      id: '03',
      title: '3. Institution 360-Degree Visibility',
      icon: Building2,
      tag: 'Comprehensive Institutional Dossier',
      description:
        'Consolidates historical grievances, active dockets, compliance status, and verified institutional alias records into an all-inclusive institutional profile for complete longitudinal visibility.',
    },
    {
      id: '04',
      title: '4. Cross-Bureau Coordination',
      icon: Users,
      tag: 'Collaborative Governance',
      description:
        'Provides shared digital workspaces enabling Regulation, PGRC, Approvals, and Regional cells to coordinate joint inquiries, synchronize hearings, and designate lead bureaus.',
    },
    {
      id: '05',
      title: '5. Action Conflict Detection',
      icon: AlertTriangle,
      tag: 'Regulatory Coherence Sentinel',
      description:
        'Continuously scans proposed administrative directives across bureaus to proactively detect and flag contradictory orders before official documents are dispatched to institutions.',
    },
    {
      id: '06',
      title: '6. Priority & Resolution Monitoring',
      icon: Clock,
      tag: 'Time-Bound Regulatory SLAs',
      description:
        'Calculates objective statutory priority scores, enforces time-bound regulatory SLAs, and automatically notifies leadership when deadlines require administrative intervention.',
    },
  ];

  return (
    <section id="vision" className="py-14 sm:py-16 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Our Solution
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            How NyayaNiti Addresses Complaint Governance
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A comprehensive, technology-enabled framework engineered to unify institutional visibility, detect related representations, and support harmonized administrative action.
          </p>
        </div>

        {/* 6 Solution Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {solutions.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className="bg-[#F4F6F9] rounded-xl p-5 sm:p-6 border border-slate-200 hover:border-[#092D62] hover:bg-white hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-[#092D62] transition-colors">
                      {s.id}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#061E46]">
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-bold text-[#092D62] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                    {s.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Accuracy & Human-in-the-Loop Guarantee Callout */}
        <div className="p-5 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
            <ShieldCheck className="w-4 h-4 text-[#1E5AA8] flex-shrink-0" />
            <span>Essential Governance Guarantee: Human-in-the-Loop Oversight</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            NyayaNiti enforces a strict human-in-the-loop architecture. Artificial intelligence and machine learning models function exclusively as advisory decision-support systems. AI does not automatically consolidate, dispose of, or close complaints. All case determinations, inter-bureau coordination notes, and official orders remain solely within the jurisdiction of authorized AICTE statutory officers.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] text-slate-500 border-t border-blue-100">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Advisory-Only Relationship Mapping</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Automated Case Disposal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Preserves Statutory Autonomy</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreVision;
