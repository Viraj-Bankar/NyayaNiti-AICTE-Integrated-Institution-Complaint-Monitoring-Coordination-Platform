import React from 'react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  FileCheck,
  Database,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface SecurityPrinciple {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  tag: string;
  summary: string;
  points: string[];
}

export const ExploreSecurityTrust: React.FC = () => {
  const securityPrinciples: SecurityPrinciple[] = [
    {
      id: '01',
      title: '1. Role-Based Access Control',
      icon: KeyRound,
      tag: 'Access Segmentation',
      summary:
        'Configures distinct access permissions tailored specifically to authorized institutional and administrative roles.',
      points: [
        'Granular permission tiers for Super Admin, Bureau Heads, Grievance Officers, and Monitoring Officers.',
        'Enforces the principle of least privilege, preventing unauthorized inter-bureau modifications.',
        'Role-scoped visibility ensures personnel only access cases aligned with their statutory mandate.',
      ],
    },
    {
      id: '02',
      title: '2. Authenticated Officer Access',
      icon: ShieldCheck,
      tag: 'Mandatory Authentication',
      summary:
        'Enforces strict authentication before any personnel can access operational modules or institutional records.',
      points: [
        'JWT-based secure credential authentication required for all internal platform interactions.',
        'Session validity checks with automatic expiration on idle or invalid authentication tokens.',
        'Immediate termination of operational access upon user logout or session revocation.',
      ],
    },
    {
      id: '03',
      title: '3. Protected Operational Routes',
      icon: Lock,
      tag: 'Air-Gapped Guards',
      summary:
        'Prevents unauthorized public visitors from viewing internal dashboards, registries, or confidential dockets.',
      points: [
        'Robust route guards redirect unauthenticated requests directly to the public Explore page.',
        'Client-side and API-level authorization checks prevent direct URL parameter bypass.',
        'Clean separation between public informational presentation and internal authority tools.',
      ],
    },
    {
      id: '04',
      title: '4. Audit Logging',
      icon: FileCheck,
      tag: 'Administrative Traceability',
      summary:
        'Maintains detailed chronological records of administrative activities to ensure procedural accountability.',
      points: [
        'Chronological audit trail recording case status transitions, review notes, and coordination actions.',
        'Cryptographically signed officer attribution documenting who performed each action and when.',
        'Provides an unalterable activity history for statutory reviews and institutional oversight.',
      ],
    },
    {
      id: '05',
      title: '5. Institutional Data Protection',
      icon: Database,
      tag: 'Restricted Purview',
      summary:
        'Restricts operational information and institutional dossiers strictly to authorized administrative users.',
      points: [
        'Confidential complaint allegations, whistleblower details, and institutional files remain restricted.',
        'Pseudonymized references protect complainant identities from unauthorized exposure.',
        'Non-destructive case history preserves original evidence without unauthorized alteration.',
      ],
    },
  ];

  return (
    <section id="security-trust" className="py-14 sm:py-16 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Security & Governance
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            Platform Security & Access Governance
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Architectural principles safeguarding institutional complaint intelligence through strict role-based isolation, route protection, and comprehensive auditability.
          </p>
        </div>

        {/* 5 Security Principle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPrinciples.map((sec, idx) => {
            const Icon = sec.icon;
            const isFullSpan = idx === securityPrinciples.length - 1;
            return (
              <div
                key={sec.id}
                className={`bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs hover:border-[#092D62] hover:shadow-md transition-all flex flex-col justify-between group ${
                  isFullSpan ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-[#092D62] transition-colors">
                      {sec.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#061E46]">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {sec.summary}
                    </p>
                  </div>

                  {/* Bullet Highlights */}
                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {sec.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 text-[11px] text-slate-700 leading-snug">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-bold text-[#092D62] uppercase tracking-wider bg-blue-50/70 px-2.5 py-0.5 rounded border border-blue-100">
                    {sec.tag}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Complementary Card: Governance Context & Notice */}
          <div className="bg-gradient-to-br from-[#061E46] to-[#092D62] text-white rounded-xl p-5 sm:p-6 border border-slate-700 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFB900] uppercase tracking-wider">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Governance Transparency Notice</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Application-Level Security Architecture
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Security controls, access boundaries, and operational route protections in NyayaNiti are implemented through strict software engineering practices, including cryptographically signed tokens, parameterized database queries, and role-based middleware filters.
              </p>
              <div className="p-3 bg-white/10 rounded-lg border border-white/15 text-xs text-slate-300 space-y-1">
                <strong className="text-white block text-[11px]">Documentation Standard:</strong>
                <p className="text-[11px] text-slate-300">
                  The platform reports only those access controls and audit capabilities verified by current implementation. External government certifications, sovereign accreditations, or third-party audits are claimed only when backed by formal official documentation.
                </p>
              </div>
            </div>

            <div className="pt-3.5 mt-4 border-t border-slate-700 text-[10px] text-slate-300 font-mono">
              Enforced across internal operational dockets and backend services.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreSecurityTrust;
