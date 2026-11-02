import React from 'react';
import {
  Globe,
  ScanText,
  Languages,
  MapPin,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PlannedFeature {
  id: string;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  status: string;
  summary: string;
  capabilities: string[];
}

export const ExploreRoadmap: React.FC = () => {
  const plannedEnhancements: PlannedFeature[] = [
    {
      id: 'plan-1',
      title: '1. Complainant Portal',
      subtitle: 'Citizen Self-Service Interface',
      icon: Globe,
      status: 'Planned Enhancement',
      summary:
        'A dedicated citizen-facing portal enabling direct complaint submission and transparent milestone tracking.',
      capabilities: [
        'End-to-end complaint submission and digital acknowledgment receipt.',
        'Generation of a unique, tamper-evident complaint reference ID.',
        'Real-time status updates without exposing internal officer notes.',
      ],
    },
    {
      id: 'plan-2',
      title: '2. Document Intelligence',
      icon: ScanText,
      subtitle: 'OCR & Text Analysis',
      status: 'Planned Enhancement',
      summary:
        'Automated optical character recognition and intelligent document parsing for uploaded affidavits and institutional evidence.',
      capabilities: [
        'OCR-based document extraction from scanned affidavits and fee receipts.',
        'Automated document classification and indexing of annexures.',
        'Structured information extraction to cross-reference claimed facts.',
      ],
    },
    {
      id: 'plan-3',
      title: '3. Multilingual AI',
      icon: Languages,
      subtitle: 'Bhashini AI Integration',
      status: 'Planned Enhancement',
      summary:
        'Broadened linguistic accessibility supporting grievance intake and processing in multiple Indian scheduled languages.',
      capabilities: [
        'Support for multiple Indian scheduled languages via national AI APIs.',
        'Automated cross-lingual translation of grievance petitions into standard dockets.',
        'Localized citizen communication for regional accessibility.',
      ],
    },
    {
      id: 'plan-4',
      title: '4. Field Visit Management',
      icon: MapPin,
      subtitle: 'On-Ground Inspection Toolkit',
      status: 'Planned Enhancement',
      summary:
        'Digital workflow tools for coordinating physical expert committee inspections and compliance audits.',
      capabilities: [
        'On-site field visit scheduling and visiting committee composition.',
        'Digital submission of structured field inspection observations and minutes.',
        'Geo-tagged photographic evidence capture and follow-up monitoring for critical cases.',
      ],
    },
    {
      id: 'plan-5',
      title: '5. Identity & Document Integration',
      icon: Award,
      subtitle: 'Statutory Verification (Subject to Authorization)',
      status: 'Subject to Authorization',
      summary:
        'Conceptual frameworks for voluntary citizen standing verification and authentic institutional credential exchange.',
      capabilities: [
        'Potential authorized Aadhaar-based identity verification via UIDAI gateways to establish standing.',
        'Potential DigiLocker integration for direct retrieval of verified marksheets and EoA certificates.',
        'Zero biometric storage with strict adherence to national digital data protection mandates.',
      ],
    },
    {
      id: 'plan-6',
      title: '6. Predictive Intelligence',
      icon: TrendingUp,
      subtitle: 'Early Warning Analytics',
      status: 'Planned Enhancement',
      summary:
        'Advanced analytical algorithms identifying emerging non-compliance patterns and acute institutional risks.',
      capabilities: [
        'Longitudinal complaint trend analysis across academic programs and regions.',
        'Early identification of critical cases approaching statutory risk thresholds.',
        'Proactive decision-support insights for Council leadership and policy formulation.',
      ],
    },
  ];

  return (
    <section id="future-vision" className="py-14 sm:py-16 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Future Scope • Planned Enhancements
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            Digital Governance Technology Roadmap
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A transparent overview of planned capabilities designed to expand accessibility, document intelligence, and on-ground compliance monitoring in technical education governance.
          </p>
        </div>

        {/* 6 Planned Enhancement Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plannedEnhancements.map((plan) => {
            const Icon = plan.icon;
            const isAuthReq = plan.status === 'Subject to Authorization';
            return (
              <div
                key={plan.id}
                className="bg-[#F4F6F9] rounded-xl p-5 sm:p-6 border border-slate-200 hover:border-[#092D62] hover:bg-white hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        isAuthReq
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-[#092D62] border-blue-200'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#061E46]">
                      {plan.title}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {plan.subtitle}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {plan.summary}
                    </p>
                  </div>

                  {/* Bullet Highlights */}
                  <ul className="space-y-2 pt-2 border-t border-slate-200/80">
                    {plan.capabilities.map((cap, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2 text-[11px] text-slate-700 leading-snug">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Roadmap Evaluation</span>
                  </span>
                  <span className="font-semibold text-[#092D62]">Phased Release</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Authorization & Implementation Demarcation Notice */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5 sm:p-6 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Important Authorization & Implementation Note</span>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            Capabilities listed in this section represent <strong>planned roadmap enhancements</strong> and are not currently active in the production platform. In particular, external identity verification (Aadhaar OTP via UIDAI gateways) and National DigiLocker document exchange are subject to formal onboarding, statutory onboarding approvals, and API licensing by competent authorities.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-amber-800 border-t border-amber-200">
            <span>• No active third-party identity connections in current phase</span>
            <span>• No biometric collection or raw Aadhaar storage</span>
            <span>• Non-operational public roadmap presentation</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreRoadmap;
