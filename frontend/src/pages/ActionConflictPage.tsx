import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ActionConflictAlert } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight,
  History, Info, Scale, ExternalLink, HelpCircle
} from 'lucide-react';

export const ActionConflictPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ActionConflictAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ActionConflictAlert | null>(null);

  // Review state
  const [decision, setDecision] = useState('CONFIRM_CONFLICT');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reconciledAction, setReconciledAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getActionConflicts();
      setConflicts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await api.reviewActionConflict(selectedConflict!.id, {
        decision,
        resolution_notes: resolutionNotes,
        reconciled_action: reconciledAction
      });
      setSelectedConflict(null);
      setResolutionNotes('');
      setReconciledAction('');
      await loadConflicts();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#C62828] px-2 py-0.5 rounded">
                REGULATORY COHERENCE ENGINE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{conflicts.length} Recorded Alerts</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#C62828]" />
              <span>Action Conflict Detection & Reconciliation Centre</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Identifies contradictory directives, duplicate inspection orders, or opposing disposal outcomes across departments.
            </p>
          </div>
        </div>

        {/* Advisory Box (Mandatory from Section 13 & 14) */}
        <div className="bg-amber-50 border-l-4 border-[#FFB900] p-3.5 rounded text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
          <HelpCircle className="w-4 h-4 text-[#D49B00] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-900">Legal Integrity Notice:</strong>
            An action conflict alert means departmental actions require reconciliation. It does not prove an officer committed an error.
            Original action records are strictly preserved—corrections are appended as new auditable harmonization events.
          </div>
        </div>

        {/* Conflicts List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-500">Checking recorded departmental directives...</div>
          ) : conflicts.length === 0 ? (
            <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500">
              Zero active action conflicts detected across Council bureaus.
            </div>
          ) : (
            conflicts.map((cf) => {
              const caseA = cf.case_a;
              const caseB = cf.case_b;

              return (
                <div key={cf.id} className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-[#C62828] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded uppercase">
                        {cf.severity} CONFLICT
                      </span>
                      <span className="font-bold text-slate-900 text-xs">
                        {cf.conflict_type}: {cf.rule_triggered}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={cf.status} type="conflict" />
                      <button
                        onClick={() => {
                          setSelectedConflict(cf);
                          setDecision('RESOLVE');
                          setResolutionNotes('');
                          setReconciledAction('');
                        }}
                        className="btn-3d-navy px-3 py-1 rounded text-xs font-bold cursor-pointer"
                      >
                        Reconcile Directives
                      </button>
                    </div>
                  </div>

                  {/* Evidence & Reconciliation Advice */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Institution:</strong> {cf.institution_name} |
                      <strong className="ml-2">Triggered Rule:</strong> {cf.rule_triggered}
                    </p>
                    <p className="text-slate-600 italic">
                      "{cf.evidence?.explanation || 'Discrepancy detected between independent bureau orders'}"
                    </p>
                    {cf.evidence?.reconciliation_advice && (
                      <p className="text-emerald-800 font-semibold text-[11px]">
                        Suggested Harmonization: {cf.evidence.reconciliation_advice}
                      </p>
                    )}
                  </div>

                  {/* Side-by-Side Contradicting Orders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 p-5 gap-4">
                    {/* Directive A */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => navigate(`/cases/${cf.case_a_id}`)}
                          className="font-bold text-[#092D62] text-xs hover:underline cursor-pointer"
                        >
                          Case A: {cf.case_a_id} ({cf.evidence?.case_a_bureau || 'RB'})
                        </span>
                        {caseA && <StatusBadge status={caseA.status} type="status" />}
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-300 text-xs text-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Recorded Action:</span>
                        <p className="font-semibold mt-0.5 text-slate-900">
                          {cf.evidence?.case_a_action || caseA?.last_action || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Directive B */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => navigate(`/cases/${cf.case_b_id}`)}
                          className="font-bold text-[#092D62] text-xs hover:underline cursor-pointer"
                        >
                          Case B: {cf.case_b_id} ({cf.evidence?.case_b_bureau || 'PGRC'})
                        </span>
                        {caseB && <StatusBadge status={caseB.status} type="status" />}
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-300 text-xs text-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Recorded Action:</span>
                        <p className="font-semibold mt-0.5 text-slate-900">
                          {cf.evidence?.case_b_action || caseB?.last_action || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {cf.reconciled_action && (
                    <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-2.5 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                      <span>Official Reconciled Order: {cf.reconciled_action}</span>
                      <span className="text-[10px] font-mono text-emerald-700">Status: {cf.status}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Reconcile Action Conflict */}
        <Modal
          isOpen={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          title="Reconcile Inter-Bureau Action Conflict"
          subtitle={selectedConflict ? `Reconciling ${selectedConflict.case_a_id} ↔ ${selectedConflict.case_b_id}` : ''}
          maxWidth="max-w-2xl"
        >
          {selectedConflict && (
            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Reconciliation Decision *</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-medium"
                >
                  <option value="RESOLVE">Issue Harmonized Reconciled Directive (Resolve Conflict)</option>
                  <option value="REFER_TO_BUREAU_HEAD">Refer to Member Secretary / Bureau Head</option>
                  <option value="REQUEST_CLARIFICATION">Request Clarification from Originating Bureau</option>
                  <option value="CONFIRM_CONFLICT">Confirm Conflict Awaiting Review</option>
                  <option value="REJECT_CONFLICT">Reject (No Substantive Conflict)</option>
                </select>
              </div>

              {decision === 'RESOLVE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Harmonized / Reconciled Action *</label>
                  <input
                    type="text"
                    value={reconciledAction}
                    onChange={(e) => setReconciledAction(e.target.value)}
                    placeholder="e.g. Conduct Joint Standing Inspection while holding previous conflicting show cause in abeyance"
                    className="w-full p-2 border border-slate-300 rounded text-xs font-medium"
                    required={decision === 'RESOLVE'}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This order will be appended as a new regulatory event on both cases without overwriting original historical records.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reconciliation Notes & Justification *</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record formal reasons for harmonizing these contradictory orders..."
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="btn-3d-white px-3.5 py-1.5 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-3d-amber px-5 py-1.5 rounded text-xs font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Recording Reconciliation...' : 'Submit Reconciled Decision'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
