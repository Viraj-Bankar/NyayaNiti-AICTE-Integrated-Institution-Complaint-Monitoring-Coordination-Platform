import React from 'react';
import {
  FileText,
  Cpu,
  Users,
  AlertTriangle,
  Building2,
  Clock,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export const ExploreCapabilities: React.FC = () => {
  return (
    <section id="capabilities" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46]">
            An Integrated Framework for Institutional Complaint Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Eight interconnected capabilities engineered to provide AICTE with end-to-end institutional visibility, early risk detection, and harmonized cross-bureau actions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Capability 1 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                1. Centralized Complaint Register
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintains a unified master view of complaints across all intake desks while strictly preserving each case’s statutory identity, original documentation, and independent timeline.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Preserves Case Identity
            </div>
          </div>

          {/* Capability 2 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                2. AI-Powered Overlap Detection
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identifies related complaints using deep semantic embeddings and pairwise machine learning, generating ranked decision-support alerts for human officer review.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              MPNet + SVM Classification
            </div>
          </div>

          {/* Capability 3 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <Users className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                3. Cross-Bureau Workspaces
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enables departments to coordinate activities on related matters through shared digital workspaces, collaborative assignments, unified hearings, and synchronized minutes.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Inter-Departmental Synergy
            </div>
          </div>

          {/* Capability 4 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                4. Action Conflict Prevention
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Proactively flags potentially contradictory administrative actions (such as simultaneous closures and inspection orders) before official orders are dispatched to institutions.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Regulatory Coherence
            </div>
          </div>

          {/* Capability 5 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                5. 360° Institution Dossier
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consolidates historical grievance records, compliance undertakings, approved programmes, and verified institution aliases into a unified institutional profile.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Permanent AICTE ID
            </div>
          </div>

          {/* Capability 6 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                6. Priority & Escalation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculates statutory priority scores, enforces time-bound regulatory SLAs, and automatically triggers escalation alerts to senior leadership when deadlines approach breach.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Time-Bound Governance
            </div>
          </div>

          {/* Capability 7 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                7. Surge & Anomaly Detection
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitors complaint velocity to identify sudden statistical surges against specific institutions, distinguishing coordinated malicious campaigns from acute campus crises.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Velocity Analytics
            </div>
          </div>

          {/* Capability 8 */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#092D62] hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-md bg-[#092D62] text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#FFB900]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">
                8. Statutory Audit & Integrity
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintains tamper-evident chronological audit logs capturing every officer interaction, status change, coordination note, and regulatory disposal for oversight defense.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-slate-100 text-[10px] font-semibold text-[#092D62] uppercase tracking-wider">
              Immutable Audit Trail
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
