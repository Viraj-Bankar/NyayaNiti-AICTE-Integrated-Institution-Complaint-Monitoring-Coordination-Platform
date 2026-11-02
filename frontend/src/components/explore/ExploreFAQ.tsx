import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';

interface FaqItem {
  id: number;
  q: string;
  a: string;
  type: 'implemented' | 'planned';
  typeLabel: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    q: 'What is NyayaNiti?',
    a: 'NyayaNiti is an integrated institutional complaint monitoring and cross-bureau coordination platform designed for the All India Council for Technical Education (AICTE). It centralizes institutional case visibility, provides AI-assisted candidate overlap detection, and establishes collaborative workspaces for coordinated administrative resolution across AICTE bureaus and cells.',
    type: 'implemented',
    typeLabel: 'Implemented System Architecture',
  },
  {
    id: 2,
    q: 'What problem does NyayaNiti solve?',
    a: 'In technical education governance, complaints concerning the same institution often arrive through fragmented intake channels to different AICTE bureaus (such as Regulation, PGRC, or Approval). Without unified visibility, this leads to complaint duplication, scattered institutional histories, contradictory administrative directives, and redundant follow-ups. NyayaNiti connects records around verified AICTE Permanent Institution IDs to eliminate operational blind spots.',
    type: 'implemented',
    typeLabel: 'Core Operational Mandate',
  },
  {
    id: 3,
    q: 'What is Institution 360?',
    a: 'Institution 360 is an operational intelligence profile that consolidates all active and historical complaints, regulatory notices, action conflict alerts, and bureau interventions tied to a specific AICTE-approved institution. Instead of evaluating grievances in isolation, authorized officers gain a 360-degree audit perspective of an institution’s overall compliance trajectory.',
    type: 'implemented',
    typeLabel: 'Implemented Operational Feature',
  },
  {
    id: 4,
    q: 'How does AI-assisted complaint overlap detection work?',
    a: 'NyayaNiti utilizes a specialized two-stage architecture: grievance text is first normalized and transformed into dense 768-dimensional semantic embeddings using the sentence-transformers/all-mpnet-base-v2 model. Candidate pairs are identified using cosine similarity, after which engineered pairwise features are evaluated by a trained Support Vector Machine (SVM) classifier to detect deep contextual relationships beyond keyword matching.',
    type: 'implemented',
    typeLabel: 'Deployed ML Pipeline (MPNet + SVM)',
  },
  {
    id: 5,
    q: 'Does AI automatically declare complaints as duplicates?',
    a: 'No. The AI system operates strictly as an advisory decision-support tool and never merges, closes, or invalidates complaints unilaterally. Potential overlaps identified by the ML pipeline are surfaced in the Overlap Review Centre as candidate matches with confidence scores and evidence highlights. Only authorized administrative officers possess the statutory authority to verify relationships or initiate joint proceedings.',
    type: 'implemented',
    typeLabel: 'Statutory Human-in-the-Loop Safeguard',
  },
  {
    id: 6,
    q: 'How does cross-bureau coordination work?',
    a: 'When an institutional issue involves multiple AICTE divisions (e.g. Approval Process Bureau and Regulation Bureau), officers can initiate a Shared Coordination Workspace. This workspace enables joint document review, inter-bureau task assignment, collaborative findings documentation, and synchronized administrative directives before formal decisions are dispatched.',
    type: 'implemented',
    typeLabel: 'Implemented Multi-Bureau Workflow',
  },
  {
    id: 7,
    q: 'Who can access the operational dashboard?',
    a: 'Operational modules—including the Case Register, Institution 360, Overlap Review Centre, Coordination Workspaces, and Audit Logs—are strictly restricted to authenticated and authorized AICTE officers. Access is enforced via granular Role-Based Access Control (Super Admin, Bureau Head, Grievance Officer, Monitoring Officer, Regional Officer). Public visitors have access only to transparency and informational pages.',
    type: 'implemented',
    typeLabel: 'Authenticated Officer RBAC Access',
  },
  {
    id: 8,
    q: 'Is complainant self-service available currently?',
    a: 'Not currently. NyayaNiti is presently deployed as an internal monitoring, intelligence, and coordination platform for AICTE administrative personnel. A dedicated public Complainant Portal—featuring unique complaint reference ID generation, direct status tracking, and automated milestone updates—is a planned enhancement on the strategic roadmap.',
    type: 'planned',
    typeLabel: 'Planned Future Capability',
  },
  {
    id: 9,
    q: 'Does NyayaNiti support Aadhaar and DigiLocker currently?',
    a: 'No. Direct Aadhaar identity verification (TrustID framework) and DigiLocker cryptographically verified document extraction are conceptual architectures designed for future phased implementation. When deployed with approved government gateways, they will operate strictly under consent-driven, DPDP Act-compliant protocols.',
    type: 'planned',
    typeLabel: 'Planned Future Capability',
  },
  {
    id: 10,
    q: 'What are the planned future enhancements?',
    a: 'Planned future enhancements include: (1) Complainant Public Portal for citizen tracking; (2) Document Intelligence with OCR extraction and automated affidavit classification; (3) Multilingual AI grievance understanding across regional Indian languages; (4) Field Visit & Inspection coordination tracking; (5) Automated Compliance Verification; and (6) Inter-agency data exchange bridges with external portals like CPGRAMS.',
    type: 'planned',
    typeLabel: 'Strategic Technology Roadmap',
  },
];

export const ExploreFAQ: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-14 sm:py-16 px-4 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Frequently Asked Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Platform Clarifications & Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Essential information regarding NyayaNiti’s purpose, operational scope, AI governance, and the distinction between implemented systems and planned enhancements.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            const isImplemented = item.type === 'implemented';

            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs transition-colors"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#092D62]/10 text-[#092D62] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                      {item.id}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#061E46] flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 hidden sm:inline" />
                      <span>{item.q}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`hidden md:inline-flex text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isImplemented
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isImplemented ? 'Current' : 'Planned'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#092D62] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-[#F4F6F9]/50 space-y-2.5">
                    <div className="flex items-center gap-2">
                      {isImplemented ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          {item.typeLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-amber-700" />
                          {item.typeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 text-xs sm:text-[13px] leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExploreFAQ;
