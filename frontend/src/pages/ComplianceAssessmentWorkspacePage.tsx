import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { ComplianceAssessment, Institution, RegulatoryRequirement, ComplianceEvidence } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import { ReviewAssessmentModal } from '../components/compliance/ReviewAssessmentModal';
import { UploadEvidenceModal } from '../components/compliance/UploadEvidenceModal';
import {
  CheckSquare, PlusCircle, Filter, Search, FileText,
  AlertCircle, Shield, CheckCircle2, RefreshCw, ChevronRight,
  ExternalLink, Calendar, Paperclip, Clock
} from 'lucide-react';

export const ComplianceAssessmentWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<ComplianceAssessment | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('AY-2025-26');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [createInstId, setCreateInstId] = useState<number>(1);
  const [createReqId, setCreateReqId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [statusFilter, periodFilter]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assessData, instsData, reqsData] = await Promise.all([
        complianceApi.listAssessments({
          assessment_period: periodFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter
        }),
        api.getInstitutions().catch(() => []),
        complianceApi.listRequirements().catch(() => [])
      ]);

      setAssessments(assessData);
      setInstitutions(instsData);
      setRequirements(reqsData);
      if (instsData.length > 0) setCreateInstId(instsData[0].id);
      if (reqsData.length > 0) setCreateReqId(reqsData[0].id);

      // If URL param provided or select first
      if (id) {
        const target = assessData.find((a: ComplianceAssessment) => a.id === parseInt(id, 10));
        if (target) setSelectedAssessment(target);
      } else if (assessData.length > 0 && !selectedAssessment) {
        setSelectedAssessment(assessData[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createReqId) return;
    setIsCreating(true);
    try {
      const created = await complianceApi.createAssessment({
        institution_id: createInstId,
        requirement_id: createReqId,
        assessment_period: periodFilter
      });
      setAssessments((prev) => [created, ...prev]);
      setSelectedAssessment(created);
      setIsCreateOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to initialize assessment');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.requirement_id.toLowerCase().includes(q) ||
      (a.institution_name && a.institution_name.toLowerCase().includes(q)) ||
      (a.requirement_title && a.requirement_title.toLowerCase().includes(q))
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIALLY_COMPLIANT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NON_COMPLIANT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PENDING_EVIDENCE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <ComplianceSubNav />

      <div className="max-w-7xl mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
              <span>National Institutional Governance</span>
              <span>/</span>
              <span className="text-[#092D62] font-semibold">Compliance Assessment Workspace</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#FFB900]" />
              Institutional Statutory Assessment & Audit Scrutiny
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Evaluate institutional compliance per requirement, review evidentiary documentation, and record determinations.
            </p>
          </div>

          {hasRole(['super_admin', 'bureau_head', 'monitoring_officer', 'authorized_officer']) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>Initiate Assessment</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by institution or requirement code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="PARTIALLY_COMPLIANT">Partially Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="PENDING_EVIDENCE">Pending Evidence</option>
            </select>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="AY-2025-26">AY-2025-26</option>
              <option value="AY-2024-25">AY-2024-25</option>
              <option value="AY-2023-24">AY-2023-24</option>
            </select>
          </div>
        </div>

        {/* Master-Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* Assessment List (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Evaluations ({filteredAssessments.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Select to review dossier</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading assessments...</div>
            ) : filteredAssessments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No assessments match current criteria.</p>
                <p className="text-[11px] text-slate-400 mt-1">Initiate a statutory assessment using the button above.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {filteredAssessments.map((a) => {
                  const isSelected = selectedAssessment?.id === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAssessment(a)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/70 border-l-4 border-[#092D62]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                              {a.requirement_id}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getStatusColor(a.status)}`}>
                              {a.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-1">
                            {a.institution_name}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {a.requirement_title}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-xs font-bold text-[#092D62]">
                            Score: {a.score_contribution.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {a.evidences?.length || 0} proofs attached
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessment Detail Workspace (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            {selectedAssessment ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                        Assessment #{selectedAssessment.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(selectedAssessment.status)}`}>
                        {selectedAssessment.status}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-[#092D62] mt-1.5">
                      {selectedAssessment.institution_name}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {selectedAssessment.requirement_id}: {selectedAssessment.requirement_title}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsReviewOpen(true)}
                      className="bg-[#092D62] hover:bg-[#061E46] text-white px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => setIsEvidenceOpen(true)}
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      + Evidence
                    </button>
                  </div>
                </div>

                {/* Score & Weight Meta */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Mandate Weight</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedAssessment.requirement_weight}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Score Awarded</div>
                    <div className="font-bold text-[#092D62] mt-0.5">{selectedAssessment.score_contribution.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Statutory Version</div>
                    <div className="font-bold text-slate-800 mt-0.5">v{selectedAssessment.requirement_version}</div>
                  </div>
                </div>

                {/* Official Findings */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Official Reviewer Remarks & Audit Findings
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed min-h-[60px]">
                    {selectedAssessment.reviewer_remarks || (
                      <span className="italic text-slate-400">
                        No official review recorded yet. Officer determination pending.
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Evidence Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Evidentiary Documentation ({selectedAssessment.evidences?.length || 0})
                    </span>
                    <button
                      onClick={() => navigate('/compliance/evidence')}
                      className="text-[10px] text-[#092D62] font-semibold hover:underline"
                    >
                      Inspect in Evidence Centre →
                    </button>
                  </div>

                  {selectedAssessment.evidences && selectedAssessment.evidences.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedAssessment.evidences.map((e: ComplianceEvidence) => (
                        <div key={e.id} className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            <div>
                              <div className="font-semibold text-slate-800">{e.evidence_type}</div>
                              <div className="text-[10px] text-slate-500">{e.document_name || `Doc #${e.document_id}`}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {e.verification_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded border border-dashed border-slate-300 text-center text-[11px] text-slate-500">
                      No proof documents attached. Use "+ Evidence" button to link institutional records.
                    </div>
                  )}
                </div>

                {/* Audit Trail */}
                {selectedAssessment.decision_history && selectedAssessment.decision_history.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Decision History Audit</span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {selectedAssessment.decision_history.map((dh: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-slate-700">
                            <span>Status: {dh.status}</span>
                            <span className="text-[10px] text-slate-400">{new Date(dh.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-slate-600 mt-0.5 italic">"{dh.remarks}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <CheckSquare className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-xs font-medium">Select an assessment to inspect details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Initiate Assessment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 text-xs">
            <h2 className="text-sm font-bold text-[#092D62] mb-3">Initiate Compliance Assessment</h2>
            <form onSubmit={handleCreateAssessment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Institution</label>
                <select
                  value={createInstId}
                  onChange={(e) => setCreateInstId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
                >
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.official_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Regulatory Mandate</label>
                <select
                  value={createReqId}
                  onChange={(e) => setCreateReqId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>{r.id} - {r.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-[#092D62] text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Initializing...' : 'Initialize Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewOpen && selectedAssessment && (
        <ReviewAssessmentModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          assessment={selectedAssessment}
          onSuccess={(updated: ComplianceAssessment) => {
            setAssessments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setSelectedAssessment(updated);
          }}
        />
      )}

      {/* Upload Evidence Modal */}
      {isEvidenceOpen && selectedAssessment && (
        <UploadEvidenceModal
          isOpen={isEvidenceOpen}
          onClose={() => setIsEvidenceOpen(false)}
          assessment={selectedAssessment}
          onSuccess={() => {
            loadInitialData();
          }}
        />
      )}
    </div>
  );
};

export default ComplianceAssessmentWorkspacePage;
