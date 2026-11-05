import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ActionConflictAlert } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight,
  History, Info, Scale, ExternalLink, HelpCircle, RefreshCw,
  Layers, Filter, Search
} from 'lucide-react';

export const ActionConflictPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ActionConflictAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ActionConflictAlert | null>(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Review state
  const [decision, setDecision] = useState('COORDINATE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reconciledAction, setReconciledAction] = useState('');
  const [coordinationTitle, setCoordinationTitle] = useState('');
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

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await api.scanAllActionConflicts();
      setScanMessage(
        `Scan complete: Evaluated ${res.results?.pairs_evaluated || 0} case pairs. Detected ${res.results?.new_conflicts_detected || 0} new conflict alert(s).`
      );
      await loadConflicts();
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;

    if (!window.confirm(`Are you sure you want to record the decision '${decision}' for this action conflict?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.reviewActionConflict(selectedConflict!.id, {
        decision,
        resolution_notes: resolutionNotes,
        reconciled_action: reconciledAction || undefined,
        coordination_title: coordinationTitle || undefined
      });

      setSelectedConflict(null);
      setResolutionNotes('');
      setReconciledAction('');
      setCoordinationTitle('');
      await loadConflicts();

      if (res.coordination_workspace_id) {
        navigate(`/coordination?workspaceId=${res.coordination_workspace_id}`);
      }
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredConflicts = conflicts.filter((cf) => {
    const matchesSeverity = severityFilter === 'ALL' || cf.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || cf.status === statusFilter;
    const matchesSearch =
      cf.rule_triggered.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cf.institution_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cf.case_a_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cf.case_b_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#C62828] px-2 py-0.5 rounded tracking-wider">
                REGULATORY COHERENCE ENGINE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{conflicts.length} Recorded Alerts</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#C62828]" />
              <span>Action Conflict Detection & Reconciliation Centre</span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Identifies contradictory directives, duplicate inspection orders, or opposing disposal outcomes across departments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="px-3.5 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Run Conflict Sweep</span>
            </button>
            <button
              onClick={() => navigate('/coordination')}
              className="px-4 py-2 bg-[#092D62] text-white rounded text-xs font-semibold hover:bg-[#072147] transition flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-4 h-4" />
              <span>Coordination Workspaces</span>
            </button>
          </div>
        </div>

        {/* Scan Message */}
        {scanMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded text-xs flex items-center justify-between">
            <span>{scanMessage}</span>
            <button onClick={() => setScanMessage(null)} className="text-blue-500 font-bold hover:text-blue-700">
              ×
            </button>
          </div>
        )}

        {/* Advisory Box */}
        <div className="bg-amber-50 border-l-4 border-[#FFB900] p-3.5 rounded text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
          <HelpCircle className="w-4 h-4 text-[#D49B00] shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-900">Legal Integrity Notice:</strong>
            An action conflict alert means departmental directives require harmonization. It does not imply an officer committed an error.
            Original case records are strictly preserved—harmonization directives are recorded as new auditable events or coordinated in dedicated workspaces.
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by rule, institution, or case ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs w-full sm:w-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="In Coordination">In Coordination</option>
              <option value="Confirmed Conflict">Confirmed Conflict</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white p-12 text-center text-xs text-slate-500 rounded border border-slate-200">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700 mx-auto mb-2" />
              Scanning recorded departmental directives...
            </div>
          ) : filteredConflicts.length === 0 ? (
            <div className="bg-white p-12 rounded border border-slate-200 text-center text-xs text-slate-500">
              <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Zero action conflicts matching your filters.
            </div>
          ) : (
            filteredConflicts.map((cf) => {
              const caseA = cf.case_a;
              const caseB = cf.case_b;
              const isCritical = cf.severity === 'Critical';

              return (
                <div
                  key={cf.id}
                  className={`bg-white rounded border shadow-sm overflow-hidden ${
                    isCritical ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
                      isCritical ? 'bg-red-50/60 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-600 text-white'
                            : cf.severity === 'High'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {cf.severity}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">
                        ALERT #{cf.id}: {cf.rule_triggered}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={cf.status} />
                      {cf.coordination_workspace_id && (
                        <button
                          onClick={() => navigate(`/coordination?workspaceId=${cf.coordination_workspace_id}`)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#092D62] text-white rounded hover:bg-[#072147] flex items-center gap-1 shadow-sm"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Open Workspace #{cf.coordination_workspace_id}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedConflict(cf);
                          setDecision('COORDINATE');
                          setResolutionNotes('');
                          setReconciledAction('');
                          setCoordinationTitle(`Inter-Bureau Alignment: ${cf.rule_triggered}`);
                        }}
                        className="px-3 py-1 bg-red-700 text-white rounded text-xs font-medium hover:bg-red-800 transition shadow-sm"
                      >
                        Harmonize Directives
                      </button>
                    </div>
                  </div>

                  {/* Evidence & Reconciliation Advice */}
                  <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-200 text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Institution:</strong> {cf.institution_name} |
                      <strong className="ml-2">Triggered Rule:</strong> {cf.rule_triggered}
                    </p>
                    <p className="text-slate-600 italic">
                      "{cf.evidence?.explanation || 'Contradictory directives detected between independent bureaus.'}"
                    </p>
                    {cf.evidence?.reconciliation_advice && (
                      <p className="text-emerald-800 font-semibold text-[11px] pt-0.5">
                        Statutory Harmonization Advice: {cf.evidence.reconciliation_advice}
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
                          className="font-bold text-[#092D62] text-xs hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Case A: {cf.case_a_id}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold">
                          {cf.evidence?.case_a_bureau || caseA?.bureau_code || 'RB'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Recorded Action:</span>
                        <p className="font-semibold text-slate-900">
                          {cf.evidence?.case_a_action || caseA?.last_action || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Directive B */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => navigate(`/cases/${cf.case_b_id}`)}
                          className="font-bold text-[#092D62] text-xs hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Case B: {cf.case_b_id}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold">
                          {cf.evidence?.case_b_bureau || caseB?.bureau_code || 'PGRC'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Recorded Action:</span>
                        <p className="font-semibold text-slate-900">
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

        {/* Harmonize Action Conflict Modal */}
        <Modal
          isOpen={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          title="Administrative Harmonization of Bureau Directives"
          subtitle={selectedConflict ? `Harmonizing ${selectedConflict.case_a_id} ↔ ${selectedConflict.case_b_id}` : ''}
          maxWidth="max-w-2xl"
        >
          {selectedConflict && (
            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reconciliation Strategy <span className="text-red-500">*</span>
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-medium outline-none"
                >
                  <option value="COORDINATE">
                    Launch Cross-Bureau Coordination Workspace (Recommended)
                  </option>
                  <option value="RESOLVE">
                    Issue Direct Harmonized Regulatory Order (Resolve Alert)
                  </option>
                  <option value="REFER_TO_BUREAU_HEAD">Refer to Member Secretary / Bureau Head</option>
                  <option value="REQUEST_CLARIFICATION">Request Clarification from Originating Bureau</option>
                  <option value="CONFIRM_CONFLICT">Confirm Conflict Awaiting Review</option>
                  <option value="DISMISS">Dismiss Alert (False Positive / Independent Track)</option>
                </select>
              </div>

              {decision === 'COORDINATE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Coordination Workspace Title
                  </label>
                  <input
                    type="text"
                    value={coordinationTitle}
                    onChange={(e) => setCoordinationTitle(e.target.value)}
                    placeholder="e.g. Joint Inter-Bureau Alignment on Approval & Fee Irregularities"
                    className="w-full p-2 border border-slate-300 rounded text-xs font-medium outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automatically initializes a new Coordination Workspace, links both cases, and designates the reviewing officer as Lead Coordinator.
                  </p>
                </div>
              )}

              {decision === 'RESOLVE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Harmonized / Reconciled Directive <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reconciledAction}
                    onChange={(e) => setReconciledAction(e.target.value)}
                    placeholder="e.g. Conduct Joint Standing Inspection while holding previous conflicting show-cause in abeyance"
                    className="w-full p-2 border border-slate-300 rounded text-xs font-medium outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Appends a confidential, non-public CaseEvent (`CONFLICT_RECONCILED`) to both cases without overwriting original historical actions.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reconciliation Justification & Regulatory Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record formal statutory rationale for harmonizing these contradictory directives..."
                  className="w-full p-2 border border-slate-300 rounded text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#092D62] text-white rounded text-xs font-bold hover:bg-[#072147] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Authorize Decision'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
