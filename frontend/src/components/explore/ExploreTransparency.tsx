import React from 'react';
import {
  Scale,
  Database,
  ShieldCheck,
  Layers,
  Lock,
  Sparkles,
  Award,
} from 'lucide-react';

export const ExploreTransparency: React.FC = () => {
  return (
    <section id="transparency" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-white px-2.5 py-1 rounded border border-slate-300">
            Ethical Governance
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Designed Around Responsible Administrative Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Seven non-negotiable principles engineered into every layer of NyayaNiti to preserve citizen rights and statutory sovereignty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Scale className="w-4 h-4 text-[#FFB900]" />
              <span>1. Human-in-the-Loop Supremacy</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI algorithms serve solely as advisory decision-support tools. No complaint is consolidated, closed, or penalized without review by an authorized statutory officer.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Database className="w-4 h-4 text-[#FFB900]" />
              <span>2. Non-Destructive Data Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Individual complaint records, legal docket identifiers, and complainant submissions are never overwritten, merged, or deleted during coordination.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <ShieldCheck className="w-4 h-4 text-[#FFB900]" />
              <span>3. Complete Immutable Auditability</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every administrative access, case linkage, conflict alert resolution, and note is permanently recorded with cryptographic officer attribution.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Layers className="w-4 h-4 text-[#FFB900]" />
              <span>4. Separation of Administrative Powers</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Each AICTE bureau retains its autonomous statutory purview. Coordinated workspaces enable consultation without infringing on departmental jurisdictions.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Lock className="w-4 h-4 text-[#FFB900]" />
              <span>5. Privacy & Data Minimization</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict adherence to the DPDP Act 2023. Pseudonymized complainant identifiers, zero biometric storage, and role-based masking of sensitive whistleblower details.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Sparkles className="w-4 h-4 text-[#FFB900]" />
              <span>6. Explainable AI Decisions</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every similarity score is accompanied by highlighted evidence passages and shared feature vectors, allowing officers to understand precisely why cases were flagged.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#092D62]">
              <Award className="w-4 h-4 text-[#FFB900]" />
              <span>7. Strict Statutory Alignment (AICTE Act, 1987)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All platform rules, approval linkages, and investigation workflows conform to the statutory mandates established under the All India Council for Technical Education Act, 1987 and relevant Gazette regulations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
