import React from 'react';
import {
  Globe,
  Activity,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Eye,
  FileCheck,
  Network,
} from 'lucide-react';

export const ExploreRoadmap: React.FC = () => {
  return (
    <section id="future-vision" className="py-14 px-4 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#092D62] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Innovation Roadmap
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            Towards Intelligent and Proactive Institutional Governance
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The strategic technology roadmap for next-generation technical education governance, proactive compliance, and digital trust.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Roadmap 1 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-blue-50 text-[#1E5AA8] flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">1. Multilingual Natural Language Intake</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Integration with Government of India Bhashini AI to ingest grievances in 22 scheduled languages with automated legal translation.
            </p>
          </div>

          {/* Roadmap 2 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-amber-50 text-[#B8860B] flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">2. Predictive Institutional Risk Scoring</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Early warning algorithms flagging potential institutional distress or infrastructure collapse before acute complaints surge.
            </p>
          </div>

          {/* Roadmap 3 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">3. Real-Time EoA Synchronization</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Direct programmatic integration with the AICTE Approval portal to auto-flag active regulatory inquiries during annual approval cycles.
            </p>
          </div>

          {/* Roadmap 4 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">4. Mobile Field Inspection Assistant</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Offline-capable mobile toolkit for visiting committee officers, featuring geo-tagged evidence capture and immediate synchronization.
            </p>
          </div>

          {/* Roadmap 5 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">5. Geospatial Grievance Heatmaps</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              GIS-enabled regional dashboards visualizing institutional dispute clusters across districts, states, and educational corridors.
            </p>
          </div>

          {/* Roadmap 6 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-blue-50 text-[#092D62] flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">6. Complainant Self-Service Tracker</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Public OTP-secured milestone tracking enabling citizens to follow their grievance progress without disclosing internal officer notes.
            </p>
          </div>

          {/* Roadmap 7 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">7. Smart Document Authentication</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Automated OCR and forensic validation of institutional affidavits, bank guarantees, and land deeds to prevent fraudulent documentation.
            </p>
          </div>

          {/* Roadmap 8 */}
          <div className="p-4 rounded-lg bg-[#F4F6F9] border border-slate-200 hover:border-[#1E5AA8] transition-colors space-y-2">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Network className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#061E46]">8. Inter-Agency Regulatory Exchange</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Secure information exchange corridors connecting AICTE with UGC, state technical universities, and statutory Ombudsman registries.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
