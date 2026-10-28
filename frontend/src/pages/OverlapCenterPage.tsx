import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { OverlapAlert } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  GitMerge, Sparkles, CheckCircle2, XCircle, ArrowRight,
  Layers, AlertTriangle, Shield, Building, Clock, Info
} from 'lucide-react';

export const OverlapCenterPage: React.FC = () => {
  const [alerts, setAlerts] = useState<OverlapAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Modal Review
  const [selectedAlert, setSelectedAlert] = useState<OverlapAlert | null>(null);
  const [decision, setDecision] = useState<'COORDINATE' | 'PROCEED_SEPARATELY' | 'REJECT'>('COORDINATE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
  }, [statusFilter]);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOverlapAlerts({ status: statusFilter });
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await api.scanAllOverlaps();
      setScanResult(`AI Scan Complete: ${res.new_overlaps_detected} new candidate overlap pairs discovered.`);
      await loadAlerts();
    } catch (err: any) {
      setScanResult(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await api.reviewOverlap(selectedAlert!.id, {
        decision,
        review_notes: reviewNotes
      });
      setSelectedAlert(null);
      setReviewNotes('');
      await loadAlerts();
    } catch (err: any) {
      alert(`Error submitting decision: ${err.message}`);
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
              <span className="text-xs font-bold text-[#FFB900] bg-[#092D62] px-2 py-0.5 rounded">
                AICTE SBERT AI ENGINE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{alerts.length} Detected Pairs</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-[#092D62]" />
              <span>Overlap Detection Centre & Decision Review</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Sentence-BERT semantic comparison identifies potentially duplicate complaints across Regulation Bureau and PGRC.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScanAll}
              disabled={isScanning}
              className="btn-3d-amber px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning All Cases...' : 'Trigger Full AI Scan'}</span>
            </button>
          </div>
        </div>

        {scanResult && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded text-xs font-semibold flex items-center justify-between">
            <span>{scanResult}</span>
            <button onClick={() => setScanResult(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        {/* Advisory Callout (Mandatory from Section 10 & 32) */}
        <div className="bg-blue-50 border-l-4 border-[#1E5AA8] p-3.5 rounded text-xs text-[#061E46] flex items-start gap-2.5 shadow-xs">
          <Info className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[#092D62]">AI Decision-Support Guidance:</strong>
            The SBERT similarity score measures textual and contextual resemblance. It does not establish that two complaints are legally or procedurally duplicates.
            Authorized officers must review evidence side-by-side and choose whether to <strong>Coordinate Cases</strong> or <strong>Proceed Separately</strong>.
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-600">Review Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 rounded border border-slate-300 bg-white text-xs"
            >
              <option value="">All Overlap States</option>
              <option value="New">New Awaiting Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Coordination Required">Coordination Required</option>
              <option value="Confirmed Related">Confirmed Related</option>
              <option value="Resolved">Resolved / Proceeded Separately</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">Threshold: &gt; 60% Semantic Resemblance</span>
        </div>

        {/* Candidate Pairs Side-by-Side List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-500">Evaluating candidate overlap pairs...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500">
              No overlap alerts matching current filter.
            </div>
          ) : (
            alerts.map((alert) => {
              const caseA = alert.case_a;
              const caseB = alert.case_b;
              const pct = Math.round(alert.similarity_score * 100);

              return (
                <div key={alert.id} className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                  {/* Pair Header Banner */}
                  <div className="bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#1E5AA8] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#FFB900] text-[#061E46] text-xs font-black px-2.5 py-1 rounded shadow-xs">
                        {pct}% SEMANTIC SIMILARITY
                      </div>
                      <span className="text-xs font-bold text-slate-100">
                        {alert.institution_name} (ID: {alert.permanent_id})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={alert.review_status} type="overlap" />
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setDecision('COORDINATE');
                          setReviewNotes('');
                        }}
                        className="btn-3d-amber px-3 py-1 rounded text-xs font-bold cursor-pointer"
                      >
                        Record Officer Decision
                      </button>
                    </div>
                  </div>

                  {/* Explainable AI Evidence Bar */}
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">AI Model: </span>
                      <strong className="text-[#092D62]">{alert.model_name}</strong> |
                      <span className="font-semibold text-slate-500 ml-2">Shared Concepts: </span>
                      <span className="text-slate-800 font-medium">
                        {(alert.evidence_summary?.shared_terms || ['fee', 'certificate', 'deposit']).join(', ')}
                      </span>
                    </div>
                    {alert.review_notes && (
                      <span className="text-amber-900 font-semibold italic text-[11px]">
                        Reviewer Remark: "{alert.review_notes}"
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side Comparison Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Case A Column */}
                    <div className="p-5 space-y-3 bg-white">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => navigate(`/cases/${alert.case_a_id}`)}
                            className="font-bold text-[#092D62] text-sm hover:underline cursor-pointer"
                          >
                            Case A: {alert.case_a_id}
                          </span>
                          <span className="bg-[#092D62] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {caseA?.bureau_code || 'RB'}
                          </span>
                        </div>
                        {caseA && <StatusBadge status={caseA.status} type="status" />}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Category</span>
                        <p className="text-xs font-bold text-[#061E46]">{caseA?.category || 'Regulatory Allegation'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Complaint Statement</span>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed min-h-[80px]">
                          {caseA?.description || 'N/A'}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        <div>Assigned Officer: <strong>{caseA?.officer_name || 'Unassigned'}</strong></div>
                        <div>Last Recorded Action: <strong>{caseA?.last_action || 'Preliminary Scrutiny'}</strong></div>
                        <div>Prescribed SLA: <span className="font-mono">{caseA?.prescribed_deadline ? new Date(caseA.prescribed_deadline).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Case B Column */}
                    <div className="p-5 space-y-3 bg-white">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => navigate(`/cases/${alert.case_b_id}`)}
                            className="font-bold text-[#092D62] text-sm hover:underline cursor-pointer"
                          >
                            Case B: {alert.case_b_id}
                          </span>
                          <span className="bg-[#1E5AA8] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {caseB?.bureau_code || 'PGRC'}
                          </span>
                        </div>
                        {caseB && <StatusBadge status={caseB.status} type="status" />}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Category</span>
                        <p className="text-xs font-bold text-[#061E46]">{caseB?.category || 'Grievance Allegation'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Complaint Statement</span>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed min-h-[80px]">
                          {caseB?.description || 'N/A'}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        <div>Assigned Officer: <strong>{caseB?.officer_name || 'Unassigned'}</strong></div>
                        <div>Last Recorded Action: <strong>{caseB?.last_action || 'Preliminary Scrutiny'}</strong></div>
                        <div>Prescribed SLA: <span className="font-mono">{caseB?.prescribed_deadline ? new Date(caseB.prescribed_deadline).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Review Overlap Decision (Features 11 & 12) */}
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title="Review Overlap Candidate Decision"
          subtitle={selectedAlert ? `Evaluating: ${selectedAlert.case_a_id} ↔ ${selectedAlert.case_b_id}` : ''}
          maxWidth="max-w-2xl"
        >
          {selectedAlert && (
            <form onSubmit={handleSubmitReview} className="space-y-5">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Official Action Choice (Mandatory) *</label>
                
                {/* Option A: Coordinate Cases */}
                <label className={`block p-3.5 rounded border cursor-pointer transition-all ${
                  decision === 'COORDINATE'
                    ? 'border-[#092D62] bg-blue-50/70 ring-1 ring-[#092D62]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="decision"
                      value="COORDINATE"
                      checked={decision === 'COORDINATE'}
                      onChange={() => setDecision('COORDINATE')}
                      className="mt-1"
                    />
                    <div>
                      <strong className="text-xs text-[#092D62] block">Option A: Coordinate Cases (Recommended)</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Establishes an official Joint Coordination Workspace between Regulation Bureau and PGRC.
                        Designates coordination ownership, creates shared tasks, while preserving each case's independent identity and history.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option B: Proceed Separately */}
                <label className={`block p-3.5 rounded border cursor-pointer transition-all ${
                  decision === 'PROCEED_SEPARATELY'
                    ? 'border-[#092D62] bg-blue-50/70 ring-1 ring-[#092D62]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="decision"
                      value="PROCEED_SEPARATELY"
                      checked={decision === 'PROCEED_SEPARATELY'}
                      onChange={() => setDecision('PROCEED_SEPARATELY')}
                      className="mt-1"
                    />
                    <div>
                      <strong className="text-xs text-[#092D62] block">Option B: Proceed Separately</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Acknowledges the textual resemblance but requires separate regulatory tracks (e.g. one concerns personal student refund, while the other concerns systemic institution approval norms). Requires formal justification.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option C: Reject */}
                <label className={`block p-3.5 rounded border cursor-pointer transition-all ${
                  decision === 'REJECT'
                    ? 'border-red-500 bg-red-50/60 ring-1 ring-red-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="decision"
                      value="REJECT"
                      checked={decision === 'REJECT'}
                      onChange={() => setDecision('REJECT')}
                      className="mt-1"
                    />
                    <div>
                      <strong className="text-xs text-red-900 block">Option C: Reject Relationship (False Positive)</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Dismiss candidate overlap as unrelated or coincidental keyword match.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Review Remarks & Justification *</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record detailed official rationale for this decision. Will be attached permanently to Council audit logs..."
                  className="w-full p-2.5 border border-slate-300 rounded text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="btn-3d-white px-3.5 py-1.5 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-3d-amber px-5 py-1.5 rounded text-xs font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Recording Decision...' : 'Confirm Regulatory Decision'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
