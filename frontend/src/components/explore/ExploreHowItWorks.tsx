import React from 'react';
import {
  FileText,
  Building2,
  Cpu,
  UserCheck,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  tag: string;
  description: string;
  details: string;
}

export const ExploreHowItWorks: React.FC = () => {
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Complaint Registration',
      subtitle: 'Authorized Intake',
      icon: FileText,
      tag: 'Step 01 • Intake',
      description:
        'A complaint is received and registered through the authorized complaint intake process.',
      details:
        'Captures factual allegations, permanent institution reference, and supporting records through authorized channels.',
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Centralized Monitoring',
      subtitle: 'Institutional Master Record',
      icon: Building2,
      tag: 'Step 02 • Master Record',
      description:
        'The complaint becomes available for authorized monitoring and institutional tracking.',
      details:
        'Anchored to the verified AICTE Permanent Institution ID, establishing complete longitudinal history.',
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'AI-Assisted Relationship Identification',
      subtitle: 'Semantic Overlap Scan',
      icon: Cpu,
      tag: 'Step 03 • Advisory Mapping',
      description:
        'The system can identify potentially related complaints and suggest candidates for officer verification.',
      details:
        'Extracts candidate matches across bureaus using semantic similarity analysis without altering case dockets.',
    },
    {
      id: 'step-4',
      stepNumber: 4,
      title: 'Officer Verification',
      subtitle: 'Mandatory Human Review',
      icon: UserCheck,
      tag: 'Step 04 • Human Review',
      description:
        'Authorized officers review suggested relationships before confirming overlap or initiating coordination.',
      details:
        'Officers inspect comparative passage highlights and determine whether coordination or joint inquiries are warranted.',
    },
    {
      id: 'step-5',
      stepNumber: 5,
      title: 'Cross-Bureau Coordination',
      subtitle: 'Collaborative Workspaces',
      icon: Users,
      tag: 'Step 05 • Coordination',
      description:
        'Relevant bureaus coordinate responsibilities, activities and tasks.',
      details:
        'Regulation, PGRC, Approvals, and Regional cells collaborate in shared digital workspaces to agree on joint directives.',
    },
    {
      id: 'step-6',
      stepNumber: 6,
      title: 'Resolution Monitoring',
      subtitle: 'Time-Bound SLA Tracking',
      icon: Clock,
      tag: 'Step 06 • Progress Tracking',
      description:
        "The complaint's progress, deadlines and activities are monitored through the platform.",
      details:
        'Dynamic SLA clocks track time-bound statutory targets, triggering escalation notifications when deadlines approach.',
    },
    {
      id: 'step-7',
      stepNumber: 7,
      title: 'Accountability and Audit',
      subtitle: 'Chronological Integrity',
      icon: ShieldCheck,
      tag: 'Step 07 • Oversight',
      description:
        'Case events and administrative activities support transparency and accountability.',
      details:
        'Every status change, coordination note, and regulatory disposal is permanently recorded in tamper-evident audit logs.',
    },
  ];

  return (
    <section id="how-it-works" className="py-14 sm:py-16 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#FFB900] bg-[#061E46] px-3 py-1 rounded uppercase tracking-wider">
            Operational Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            How NyayaNiti Works
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            The end-to-end journey of an institutional complaint through centralized intake, intelligent relationship discovery, officer verification, and coordinated resolution.
          </p>
        </div>

        {/* Connected Horizontal Timeline Ribbon for Desktop */}
        <div className="hidden lg:block bg-[#F4F6F9] border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="text-[11px] font-bold text-[#092D62] uppercase tracking-wider mb-5 flex items-center justify-between">
            <span>7-Stage Statutory Workflow Sequence</span>
            <span className="text-slate-400 font-mono text-[10px]">Sequential Platform Lifecycle</span>
          </div>

          <div className="grid grid-cols-7 gap-2 relative">
            {workflowSteps.map((s, index) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="relative flex flex-col items-center text-center group">
                  {/* Step Connector Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 bg-slate-300 z-0 pointer-events-none group-hover:bg-[#FFB900] transition-colors" />
                  )}

                  {/* Circular Node Icon */}
                  <div className="w-10 h-10 rounded-full bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold text-xs shadow-sm z-10 border-2 border-white group-hover:bg-[#FFB900] group-hover:text-[#061E46] transition-all">
                    <Icon className="w-4 h-4" />
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#092D62] mt-2 block">
                    Stage 0{s.stepNumber}
                  </span>
                  <span className="text-xs font-bold text-[#061E46] leading-tight mt-0.5 px-1 line-clamp-2">
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Workflow Step Cards (Responsive: Horizontal Desktop, Vertical Mobile) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Detailed Operational Breakdown</span>
            <span className="text-[11px] text-slate-400 font-mono">Stages 01 – 07</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === workflowSteps.length - 1;
              return (
                <div
                  key={step.id}
                  className={`bg-[#F4F6F9] rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-[#092D62] hover:bg-white hover:shadow-md transition-all flex flex-col justify-between group ${
                    isLast ? 'md:col-span-2 lg:col-span-3 xl:col-span-1' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 text-[#092D62]">
                          {step.subtitle}
                        </span>
                      </div>
                      <span className="text-xl font-black font-mono text-slate-300 group-hover:text-[#FFB900] transition-colors">
                        0{step.stepNumber}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#061E46] leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-200/70">
                      {step.details}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{step.tag}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#092D62] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informational Demarcation Banner: Planned Complainant Portal */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 sm:p-6 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
            <Info className="w-4 h-4 text-[#1E5AA8] flex-shrink-0" />
            <span>Planned Complainant-Facing Capabilities (Digital Roadmap)</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            In accordance with the current phased rollout, complaints are ingested into NyayaNiti through authorized institutional intake desks and administrative channels. Direct online public complaint registration, OTP-based public milestone lookup, and citizen-facing portals are designated as <strong>planned future capabilities</strong> on the digital governance roadmap.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-slate-600 border-t border-blue-100">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Current Intake: Authorized Departmental Processing</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Future Scope: Complainant Self-Service Milestone Tracker</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Non-Public Operational Dashboard</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHowItWorks;
