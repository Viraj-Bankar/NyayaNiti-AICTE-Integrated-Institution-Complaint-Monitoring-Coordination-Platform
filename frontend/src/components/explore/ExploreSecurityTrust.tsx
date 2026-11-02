import React from 'react';
import { ShieldCheck, Check, Lock } from 'lucide-react';

export const ExploreSecurityTrust: React.FC = () => {
  return (
    <section id="security-trust" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Identity Verification & Trust
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Trust, Identity and Responsible Digital Governance
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Introducing the proposed <strong>NyayaNiti TrustID</strong> framework to safeguard complainant authenticity while upholding privacy, data minimization, and procedural fairness.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: TrustID Framework Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#061E46] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>NyayaNiti TrustID Security Principles</span>
                </h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                  Proposed Framework • Under Development
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Aadhaar-based identity verification</strong>, subject to authorized UIDAI integration and regulatory approvals.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Alternative approved identity verification methods</strong> (Institutional email, PAN, or government credentials) for comprehensive accessibility.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Consent-based verification</strong> ensuring citizens retain explicit control over their personal data in accordance with DPDP regulations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Secure user profile management</strong> enabling complainants to track grievances securely across departments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Privacy-conscious storage</strong> utilizing cryptographic hashing and masked identifiers; zero storage of raw Aadhaar numbers or biometrics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Complaint activity traceability</strong> ensuring immutable logs of when a grievance is modified, escalated, or coordinated.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Duplicate and suspicious-submission indicators</strong> surfaced for human review to deter automated spam and malicious campaigns.</span>
                </li>
              </ul>
            </div>

            {/* Regulatory Compliance Notice */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-[#092D62] flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Statutory Privacy Standards:</strong> NyayaNiti does not collect biometric data or store full Aadhaar numbers. Identity verification references are cryptographically pseudonymized to preserve citizen privacy while ensuring legitimate legal standing.
              </p>
            </div>
          </div>

          {/* Right: DigiLocker Integration Concept */}
          <div className="lg:col-span-5 bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1E5AA8] flex items-center justify-center font-bold text-sm">
                  DL
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-[#1E5AA8] border border-blue-200 px-2 py-0.5 rounded uppercase">
                  Proposed Integration • Under Development
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#061E46]">
                DigiLocker – Document Verification
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                Under the proposed digital governance roadmap, complainants and institutions can share eligible verified certificates, fee receipts, approvals, and affidavits directly through the National DigiLocker ecosystem.
              </p>

              <div className="bg-[#F4F6F9] p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-[#092D62] text-[11px] block">Planned Verification Capabilities:</span>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Direct verification of student enrollment & marksheets</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Digitally signed Extension of Approval (EoA) certificates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Tamper-evident compliance affidavits from governing bodies</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 italic">
              * Note: DigiLocker and UIDAI document exchange capabilities are proposed architectural concepts subject to formal onboarding and API authorization by competent authorities.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
