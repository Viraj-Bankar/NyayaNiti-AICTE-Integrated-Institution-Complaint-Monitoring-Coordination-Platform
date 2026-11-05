import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OfficerComplaintDetail,
  AIDuplicateCandidate,
  OfficerDuplicateVerifyPayload,
  OfficerDuplicateVerifyResponse
} from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import {
  Building2, Calendar, FileText, CheckCircle2,
  AlertTriangle, Shield, GitMerge, XCircle,
  ExternalLink, ArrowRightLeft, Sparkles, Layers
} from 'lucide-react';

interface ComplaintComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceComplaint: OfficerComplaintDetail;
  candidate: AIDuplicateCandidate | null;
  onVerificationComplete?: (response: OfficerDuplicateVerifyResponse) => void;
}

export const ComplaintComparisonModal: React.FC<ComplaintComparisonModalProps> = ({
  isOpen,
  onClose,
  sourceComplaint,
  candidate,
  onVerificationComplete
}) => {
  const navigate = useNavigate();
  const [candidateDetail, setCandidateDetail] = useState<OfficerComplaintDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [linkDossier, setLinkDossier] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load candidate full detail when opened
  useEffect(() => {
    if (isOpen && candidate?.candidate_complaint_id) {
      setReason('');
      setActionError(null);
      setActionSuccess(null);
      setLoadingDetail(true);

      api.getOfficerComplaintDetail(candidate.candidate_complaint_id)
        .then((data) => {
          setCandidateDetail(data);
        })
        .catch((err) => {
          console.warn('Could not fetch candidate full dossier, falling back to candidate summary:', err);
          setCandidateDetail(null);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [isOpen, candidate]);

  if (!candidate) return null;

  const handleVerify = async (selectedDecision: 'CONFIRM_DUPLICATE' | 'MARK_RELATED' | 'REJECT_RECOMMENDATION') => {
    if (!reason.trim()) {
      setActionError('Statutory officer justification is mandatory before recording verification.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const payload: OfficerDuplicateVerifyPayload = {
      candidate_id: candidate.candidate_complaint_id,
      decision: selectedDecision,
      reason: reason.trim(),
      link_dossier: selectedDecision === 'REJECT_RECOMMENDATION' ? false : linkDossier
    };

    try {
      const res = await api.verifyDuplicateRecommendation(sourceComplaint.id, payload);
      setActionSuccess(res.message || 'Officer determination recorded successfully.');
      if (onVerificationComplete) {
        onVerificationComplete(res);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Verification error:', err);
      setActionError(err.message || 'Failed to submit officer verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'HIGH_CONFIDENCE_DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-black rounded border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            POTENTIAL DUPLICATE (HIGH CONFIDENCE)
          </span>
        );
      case 'MANUAL_REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded border border-amber-300">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            RELATED COMPLAINT (SCRUTINY REQUIRED)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            DISTINCT MATTER
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Side-by-Side Semantic Concordance & Duplicate Comparison"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-5 text-xs text-slate-800">
        {/* Metric Comparison Banner */}
        <div className="bg-[#092D62] text-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFB900]" />
              <span className="text-xs font-bold tracking-wide uppercase">
                AICTE Semantic Analysis Evaluation
              </span>
              <span className="text-blue-300">•</span>
              <span className="text-xs text-blue-200 font-mono">
                Model: {candidate.model_version || 'all-mpnet-base-v2 + SVM'}
              </span>
            </div>

            <div>
              {getTierBadge(candidate.predicted_relationship)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-center">
            {/* Metric 1: Cosine Similarity (Strictly NOT probability) */}
            <div className="bg-blue-950/60 p-2.5 rounded border border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                Semantic Similarity
              </span>
              <span className="font-mono text-base font-black text-[#FFB900] mt-0.5 block">
                {(candidate.similarity_score * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-blue-200 block font-mono">
                Cosine: {candidate.similarity_score.toFixed(4)}
              </span>
            </div>

            {/* Metric 2: SVM Confidence / Probability */}
            <div className="bg-blue-950/60 p-2.5 rounded border border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                SVM Calibrated Conf.
              </span>
              <span className="font-mono text-base font-black text-white mt-0.5 block">
                {(candidate.duplicate_probability * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-blue-200 block">
                SVM Probability
              </span>
            </div>

            {/* Metric 3: Institution Concordance */}
            <div className="bg-blue-950/60 p-2.5 rounded border border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                Institution Match
              </span>
              <span className={`text-xs font-bold mt-1 block ${candidate.institution_match ? 'text-emerald-400' : 'text-slate-300'}`}>
                {candidate.institution_match ? 'Exact Same Institution' : 'Cross-Institution'}
              </span>
              <span className="text-[9px] text-blue-200 block">
                Council Registry
              </span>
            </div>

            {/* Metric 4: Category Concordance */}
            <div className="bg-blue-950/60 p-2.5 rounded border border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                Category Match
              </span>
              <span className={`text-xs font-bold mt-1 block ${candidate.category_match ? 'text-emerald-400' : 'text-amber-300'}`}>
                {candidate.category_match ? 'Matching Category' : 'Different Category'}
              </span>
              <span className="text-[9px] text-blue-200 block">
                AICTE Domain
              </span>
            </div>

            {/* Metric 5: Token Lexical Overlap */}
            <div className="bg-blue-950/60 p-2.5 rounded border border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-300 block">
                Lexical Token Overlap
              </span>
              <span className="font-mono text-base font-black text-white mt-0.5 block">
                {candidate.matching_features?.fuzz_token_set_ratio !== undefined
                  ? `${Math.round(candidate.matching_features.fuzz_token_set_ratio * 100)}%`
                  : 'N/A'}
              </span>
              <span className="text-[9px] text-blue-200 block">
                Token Set Concordance
              </span>
            </div>
          </div>
        </div>

        {/* AI Model Findings & Statutory Advice */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 space-y-2">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-amber-900 text-xs">AI Match Explanation</h5>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {candidate.explanation}
              </p>
            </div>
          </div>

          {candidate.statutory_advice && (
            <div className="pt-2 border-t border-amber-200/80 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                <strong className="text-amber-900 font-bold">Statutory Guidance: </strong>
                {candidate.statutory_advice}
              </p>
            </div>
          )}
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Source Complaint */}
          <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#092D62] text-white px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FFB900]" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Current Complaint (Source)
                </span>
              </div>
              <span className="font-mono text-xs font-bold bg-blue-900 px-2 py-0.5 rounded border border-blue-700">
                {sourceComplaint.id}
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Institution
                </span>
                <div className="flex items-start gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">{sourceComplaint.institution.official_name}</strong>
                    <span className="text-[10px] font-mono text-slate-500">
                      PID: {sourceComplaint.institution.permanent_id} • {sourceComplaint.institution.district}, {sourceComplaint.institution.state}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Category
                  </span>
                  <span className="font-semibold text-slate-800 block text-xs mt-0.5">
                    {sourceComplaint.category}
                  </span>
                  {sourceComplaint.subcategory && (
                    <span className="text-[10px] text-slate-500 italic block">
                      {sourceComplaint.subcategory}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Submission Date & Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={sourceComplaint.status} type="status" />
                    <span className="text-[10px] text-slate-500">
                      {new Date(sourceComplaint.date_received).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Grievance Title
                </span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">
                  {sourceComplaint.title}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Substance & Narrative
                </span>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-line font-normal">
                  {sourceComplaint.description}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Candidate Complaint */}
          <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#1E5AA8] text-white px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-200" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Candidate Dossier (Registry)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-blue-900 px-2 py-0.5 rounded border border-blue-600">
                  {candidate.candidate_complaint_id}
                </span>
                <a
                  href={`/complaint-intake/${candidate.candidate_complaint_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-blue-800 rounded transition-colors text-white"
                  title="Open candidate in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Institution
                </span>
                <div className="flex items-start gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">
                      {candidateDetail?.institution.official_name || candidate.candidate_institution_name}
                    </strong>
                    <span className="text-[10px] font-mono text-slate-500">
                      PID: {candidateDetail?.institution.permanent_id || `ID: ${candidate.candidate_institution_id}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Category
                  </span>
                  <span className="font-semibold text-slate-800 block text-xs mt-0.5">
                    {candidateDetail?.category || candidate.candidate_category}
                  </span>
                  {candidateDetail?.subcategory && (
                    <span className="text-[10px] text-slate-500 italic block">
                      {candidateDetail.subcategory}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Submission Date & Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={candidateDetail?.status || candidate.candidate_status} type="status" />
                    <span className="text-[10px] text-slate-500">
                      {new Date(candidateDetail?.date_received || candidate.candidate_date_received).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Grievance Title
                </span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">
                  {candidateDetail?.title || candidate.candidate_title || 'Institutional Grievance Record'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Substance & Narrative
                </span>
                {loadingDetail ? (
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#092D62] mx-auto mb-1" />
                    <span>Loading candidate description...</span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-line font-normal">
                    {candidateDetail?.description || (
                      <span className="italic text-slate-400">
                        Detailed narrative accessible via full candidate dossier link above.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Verification Status (if already verified) */}
        {candidate.verification_status && candidate.verification_status !== 'PENDING_REVIEW' && (
          <div className="p-3 bg-slate-100 border border-slate-300 rounded text-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs uppercase tracking-wide">
                Current Verification Decision:{' '}
              </span>
              <span className="font-bold text-xs text-[#092D62]">
                {candidate.verification_status.replace('_', ' ')}
              </span>
              {candidate.verification_reason && (
                <p className="text-[11px] text-slate-600 mt-0.5 italic">
                  Officer Remarks: {candidate.verification_reason}
                </p>
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Verified in AICTE Docket
            </span>
          </div>
        )}

        {/* Verification Action Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#092D62]" />
              <span>Officer Verification & Statutory Determination</span>
            </h4>
            <span className="text-[10px] text-slate-500 italic">
              AI recommendation requires human officer ratification
            </span>
          </div>

          {actionSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Statutory Justification / Scrutiny Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Record official statutory rationale for confirming duplicate, marking as related, or rejecting AI candidate..."
              rows={2}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#092D62] focus:border-[#092D62] outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={linkDossier}
                onChange={(e) => setLinkDossier(e.target.checked)}
                className="rounded border-slate-300 text-[#092D62] focus:ring-[#092D62] cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium">
                Link dossiers canonically under AICTE Case Relationship Register
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleVerify('REJECT_RECOMMENDATION')}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Dismiss (Distinct)</span>
              </button>

              <button
                type="button"
                onClick={() => handleVerify('MARK_RELATED')}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Mark as Related</span>
              </button>

              <button
                type="button"
                onClick={() => handleVerify('CONFIRM_DUPLICATE')}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/coordination?linkCases=${sourceComplaint.id},${candidate.candidate_complaint_id}`);
                }}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-[#092D62] hover:bg-[#072147] text-white text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
                title="Convene Multi-Bureau Joint Coordination Workspace"
              >
                <Layers className="w-3.5 h-3.5 text-[#FFB900]" />
                <span>Initiate Joint Coordination</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
