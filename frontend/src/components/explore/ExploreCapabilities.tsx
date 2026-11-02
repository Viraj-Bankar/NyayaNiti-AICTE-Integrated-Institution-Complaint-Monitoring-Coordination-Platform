import React from 'react';
import {
  FileText,
  Building2,
  Cpu,
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  tag: string;
  summary: string;
  highlights: string[];
}

export const ExploreCapabilities: React.FC = () => {
  const capabilities: FeatureItem[] = [
    {
      id: '01',
      title: 'Centralized Complaint Monitoring',
      icon: FileText,
      tag: 'Active Core Capability',
      summary:
        'Maintains a single operational register of institution-related grievances across AICTE bureaus and intake desks.',
      highlights: [
        'Unified visibility into institution-related complaint cases across intake desks.',
        'Continuous complaint status tracking and lifecycle progress monitoring.',
        'Preserves original filing records and individual statutory dockets.',
      ],
    },
    {
      id: '02',
      title: 'Institution 360',
      icon: Building2,
      tag: 'Active Core Capability',
      summary:
        'Anchors all regulatory intelligence around verified AICTE Permanent IDs for complete institutional visibility.',
      highlights: [
        'Verified institutional identity, alias harmonization, and approval profile.',
        'Comprehensive historical grievance records across departments and academic sessions.',
        'Institution-wise monitoring to identify recurring compliance patterns.',
      ],
    },
    {
      id: '03',
      title: 'AI-Powered Complaint Overlap Detection',
      icon: Cpu,
      tag: 'Decision-Support Advisory',
      summary:
        'Employs deep semantic sentence representations to surface potentially related representations across bureaus.',
      highlights: [
        'Semantic identification of potentially related complaints across varied wording.',
        'Candidate similarity analysis using 768-dimensional MPNet embeddings and SVM.',
        'Mandatory officer verification before treating cases as duplicates or related.',
      ],
    },
    {
      id: '04',
      title: 'Cross-Bureau Coordination',
      icon: Users,
      tag: 'Active Core Capability',
      summary:
        'Enables inter-departmental collaboration through shared digital workspaces and synchronized minutes.',
      highlights: [
        'Shared coordination workspaces across Regulation, PGRC, Approvals, and Vigilance.',
        'Task assignment, collaborative notes, and progress monitoring.',
        'Designation of lead bureaus while preserving statutory departmental autonomy.',
      ],
    },
    {
      id: '05',
      title: 'Action Conflict Intelligence',
      icon: AlertTriangle,
      tag: 'Active Core Capability',
      summary:
        'Proactively scans proposed administrative orders to prevent contradictory directives between departments.',
      highlights: [
        'Identification of potentially conflicting administrative actions before dispatch.',
        'Detects simultaneous closures and inspection orders regarding the same campus.',
        'Supports coordinated, legally coherent administrative decisions.',
      ],
    },
    {
      id: '06',
      title: 'Priority and SLA Monitoring',
      icon: Clock,
      tag: 'Active Core Capability',
      summary:
        'Enforces statutory regulatory timelines and escalates critical grievances approaching SLA deadlines.',
      highlights: [
        'Objective multi-factor priority evaluation based on regulatory severity.',
        'Statutory deadline monitoring with automated SLA countdown clocks.',
        'Critical case visibility with expedited triage for anti-ragging and safety matters.',
      ],
    },
    {
      id: '07',
      title: 'Audit and Reporting',
      icon: ShieldCheck,
      tag: 'Active Core Capability',
      summary:
        'Maintains immutable chronological event records for complete transparency and statutory oversight defense.',
      highlights: [
        'Complete chronological case activity history and status transitions.',
        'Cryptographically verifiable, tamper-evident officer audit trails.',
        'Operational reporting and grievance trend analysis for Council leadership.',
      ],
    },
  ];

  return (
    <section id="capabilities" className="py-14 sm:py-16 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            Major Operational Capabilities
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            An integrated suite of administrative capabilities engineered to deliver institutional visibility, intelligent overlap identification, and coordinated resolution across AICTE bureaus.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs hover:border-[#092D62] hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-[#092D62] transition-colors">
                      {feat.id}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-[#061E46]">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {feat.summary}
                    </p>
                  </div>

                  {/* Bullet Highlights */}
                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {feat.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 leading-snug">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-bold text-[#092D62] uppercase tracking-wider bg-blue-50/70 px-2.5 py-0.5 rounded border border-blue-100">
                    {feat.tag}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Complementary Card: Operational Integrity & Human Verification Guarantee */}
          <div className="bg-gradient-to-br from-[#061E46] via-[#092D62] to-[#0D3875] text-white rounded-xl p-5 sm:p-6 border border-slate-700 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFB900] uppercase tracking-wider">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Statutory Governance Guarantee</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Human-Centric Administrative Oversight
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                All AI and machine learning components in NyayaNiti are calibrated as decision-support advisory systems. The platform identifies potential complaint overlaps and conflict risks, but never automatically merges, closes, or disposes of cases. Authorized officers conduct mandatory review before any coordinating action or disposal is finalized.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-200">
                <div className="p-2.5 bg-white/10 rounded border border-white/15">
                  <span className="font-bold text-[#FFB900] block text-[11px]">No Automated Closures</span>
                  <span className="text-[10px] text-slate-300">Cases require officer evaluation</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded border border-white/15">
                  <span className="font-bold text-[#FFB900] block text-[11px]">Verified Relationships</span>
                  <span className="text-[10px] text-slate-300">Similarity alerts are advisory</span>
                </div>
                <div className="p-2.5 bg-white/10 rounded border border-white/15">
                  <span className="font-bold text-[#FFB900] block text-[11px]">Independent Dockets</span>
                  <span className="text-[10px] text-slate-300">Case files are non-destructive</span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 mt-4 border-t border-slate-700 text-[10px] text-slate-300">
              Active operational architecture supporting authorized personnel across AICTE bureaus.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreCapabilities;
