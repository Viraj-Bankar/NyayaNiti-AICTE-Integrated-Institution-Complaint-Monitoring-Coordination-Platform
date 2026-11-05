import React, { useState, useEffect, useCallback } from 'react';
import {
  OfficerComplaintDetail,
  AIDuplicateCandidate,
  AIDuplicateAnalysis,
  AIModelStatus,
  OfficerDuplicateVerifyResponse
} from '../../types';
import { aiDuplicatesApi } from '../../services/api';
import { ComplaintComparisonModal } from './ComplaintComparisonModal';
import { AIModelStatusModal } from './AIModelStatusModal';
import {
  Cpu, Sparkles, RefreshCw, AlertTriangle, CheckCircle2,
  ArrowRightLeft, ExternalLink
} from 'lucide-react';

interface AIDuplicatePanelProps {
  complaint: OfficerComplaintDetail;
  onVerificationSuccess?: () => void;
}

export const AIDuplicatePanel: React.FC<AIDuplicatePanelProps> = ({
  complaint,
  onVerificationSuccess
}) => {
  // AI Candidates and Analysis Data
  const [candidates, setCandidates] = useState<AIDuplicateCandidate[]>([]);
  const [analysisMeta, setAnalysisMeta] = useState<{
    analyzedAt?: string;
    totalEvaluated?: number;
    highConfidenceCount?: number;
    reviewRequiredCount?: number;
    modelVersion?: string;
  }>({});
  const [modelStatus, setModelStatus] = useState<AIModelStatus | null>(null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [selectedCandidateForCompare, setSelectedCandidateForCompare] = useState<AIDuplicateCandidate | null>(null);
  const [isModelStatusModalOpen, setIsModelStatusModalOpen] = useState<boolean>(false);

  // Load Existing Candidates and Model Status
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statusRes, candidatesRes, summaryRes] = await Promise.allSettled([
        aiDuplicatesApi.getModelStatus(),
        aiDuplicatesApi.getCandidates(complaint.id),
        aiDuplicatesApi.getSummary(complaint.id)
      ]);

      if (statusRes.status === 'fulfilled') {
        setModelStatus(statusRes.value);
      }

      if (candidatesRes.status === 'fulfilled') {
        setCandidates(candidatesRes.value);
      }

      if (summaryRes.status === 'fulfilled') {
        const sum = summaryRes.value;
        setAnalysisMeta({
          analyzedAt: sum.last_analyzed_at,
          totalEvaluated: sum.total_candidates_analyzed,
          highConfidenceCount: sum.high_confidence_duplicates_count,
          reviewRequiredCount: sum.review_required_count,
          modelVersion: sum.model_version
        });
      }
    } catch (err: any) {
      console.error('Error loading AI duplicate data:', err);
      setErrorMessage(err.message || 'Unable to retrieve AI duplicate candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [complaint.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Trigger Fresh AI Duplicate Analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessToast(null);
    try {
      const analysis: AIDuplicateAnalysis = await aiDuplicatesApi.analyzeComplaint(
        complaint.id,
        10,    // Top 10 candidates
        0.35,  // Min similarity threshold
        false  // Focus on same institution first
      );

      setCandidates(analysis.candidates);
      setAnalysisMeta({
        analyzedAt: analysis.analyzed_at,
        totalEvaluated: analysis.total_candidates_evaluated,
        highConfidenceCount: analysis.high_confidence_count,
        reviewRequiredCount: analysis.review_required_count,
        modelVersion: analysis.model_version
      });

      const dupCount = analysis.high_confidence_count;
      const relCount = analysis.review_required_count;

      setSuccessToast(
        `AI Analysis complete: Evaluated ${analysis.total_candidates_evaluated} institution records. Found ${dupCount} potential duplicate(s) and ${relCount} related grievance(s).`
      );
    } catch (err: any) {
      console.error('Error running AI analysis:', err);
      setErrorMessage(err.message || 'Failed to complete AI semantic duplicate analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerificationComplete = (response: OfficerDuplicateVerifyResponse) => {
    setSuccessToast(response.message || 'Officer determination recorded.');
    loadData();
    if (onVerificationSuccess) {
      onVerificationSuccess();
    }
  };

  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'HIGH_CONFIDENCE_DUPLICATE':
        return {
          label: 'Potential Duplicate',
          badgeClass: 'bg-red-100 text-red-900 border-red-300',
          dotClass: 'bg-red-500',
          indicatorText: 'High Confidence'
        };
      case 'MANUAL_REVIEW_REQUIRED':
        return {
          label: 'Related Grievance',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-500',
          indicatorText: 'Review Required'
        };
      default:
        return {
          label: 'Distinct Matter',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          dotClass: 'bg-slate-400',
          indicatorText: 'Low Overlap'
        };
    }
  };

  const highConfidenceCount = candidates.filter(
    (c) => c.predicted_relationship === 'HIGH_CONFIDENCE_DUPLICATE'
  ).length;

  const relatedCount = candidates.filter(
    (c) => c.predicted_relationship === 'MANUAL_REVIEW_REQUIRED'
  ).length;

  return (
    <div className="bg-white border-2 border-blue-900/20 rounded-lg p-5 shadow-xs space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#092D62] uppercase tracking-wide">
                AI Duplicate & Overlap Intelligence
              </h3>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded">
                MPNet-768 + SVM
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Automated sentence-level semantic similarity against institutional registry dockets.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsModelStatusModalOpen(true)}
            className="p-1.5 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
            title="Inspect Model Architecture & Parameters"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Diagnostics</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading || isAnalyzing}
            className="p-1.5 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
            title="Refresh Candidate Dockets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-[#092D62] hover:bg-[#123C7B] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#FFB900] ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Semantics...' : 'Analyze Complaint'}</span>
          </button>
        </div>
      </div>

      {/* Model Unavailable Alert Banner */}
      {modelStatus && !modelStatus.is_available && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">AI Engine Degraded: </strong>
              <span>
                LinearSVC model offline; operating in lexical token and TF-IDF fallback mode.
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsModelStatusModalOpen(true)}
            className="text-[11px] font-bold text-amber-900 underline hover:no-underline ml-2"
          >
            View Diagnostics
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={handleRunAnalysis} className="text-xs font-bold text-red-900 underline ml-2">
            Retry Analysis
          </button>
        </div>
      )}

      {/* Metric Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Analysis Status
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${candidates.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800">
              {isAnalyzing ? 'Analyzing...' : candidates.length > 0 ? 'Evaluated' : 'Ready'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {analysisMeta.analyzedAt
              ? new Date(analysisMeta.analyzedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'No prior scan'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Candidates Evaluated
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {candidates.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {analysisMeta.totalEvaluated !== undefined ? `From ${analysisMeta.totalEvaluated} registry dockets` : 'Within Institution'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Potential Duplicates
          </span>
          <span className={`text-base font-black mt-0.5 block ${highConfidenceCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {highConfidenceCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            High Confidence (Cosine &gt; 0.70)
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Related Complaints
          </span>
          <span className={`text-base font-black mt-0.5 block ${relatedCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
            {relatedCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Requires Officer Review
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#092D62]" />
          <span className="text-xs text-slate-500 font-medium">
            Fetching candidate complaints and semantic matches...
          </span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && candidates.length === 0 && (
        <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800">
            No Duplicate or Clustered Complaints Detected
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            The Sentence-MPNet semantic vector engine found no prior institutional complaints exceeding the duplicate threshold for this institution.
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="mt-3 px-3 py-1.5 bg-[#092D62] text-white text-xs font-bold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-[#123C7B] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFB900]" />
            <span>Run Fresh AI Scrutiny</span>
          </button>
        </div>
      )}

      {/* Candidate Cards Grid */}
      {!isLoading && candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
              Ranked Candidate Matches ({candidates.length})
            </span>
            <span className="italic text-[11px]">
              Click &quot;Compare Dossiers&quot; for side-by-side verification
            </span>
          </div>

          <div className="space-y-3">
            {candidates.map((cand) => {
              const tier = getTierDetails(cand.predicted_relationship);
              const isVerified = cand.verification_status && cand.verification_status !== 'PENDING_REVIEW';

              return (
                <div
                  key={cand.candidate_complaint_id}
                  className={`border rounded-lg p-4 transition-all bg-white hover:border-[#092D62] hover:shadow-xs ${
                    cand.predicted_relationship === 'HIGH_CONFIDENCE_DUPLICATE'
                      ? 'border-red-200 bg-red-50/20'
                      : cand.predicted_relationship === 'MANUAL_REVIEW_REQUIRED'
                      ? 'border-amber-200 bg-amber-50/15'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {cand.candidate_complaint_id}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${tier.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tier.dotClass}`} />
                          {tier.label}
                        </span>

                        {isVerified && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold rounded">
                            Verified: {cand.verification_status.replace('_', ' ')}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono">
                          Received: {new Date(cand.candidate_date_received).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Complaint Title */}
                      <h4 className="text-xs font-bold text-slate-900">
                        {cand.candidate_title || 'Institutional Grievance Matter'}
                      </h4>

                      {/* Institution and Category */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <span>
                          Institution: <strong className="text-slate-800">{cand.candidate_institution_name}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Category: <strong className="text-slate-800">{cand.candidate_category}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">
                          Status: {cand.candidate_status}
                        </span>
                      </div>

                      {/* Model Explanation */}
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-1 leading-relaxed">
                        <strong className="text-slate-800">Model Analysis: </strong>
                        {cand.explanation}
                      </p>
                    </div>

                    {/* Right Metrics & Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Metric Display - Strictly Separated */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            Cosine Similarity:
                          </span>
                          <span className="font-mono text-xs font-black text-[#092D62]">
                            {cand.similarity_score.toFixed(4)} ({(cand.similarity_score * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            SVM Confidence:
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {(cand.duplicate_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`/complaint-intake/${cand.candidate_complaint_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          title="Open Complaint Docket in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => setSelectedCandidateForCompare(cand)}
                          className="px-3 py-1.5 bg-[#092D62] hover:bg-[#123C7B] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#FFB900]" />
                          <span>Compare Dossiers</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {selectedCandidateForCompare && (
        <ComplaintComparisonModal
          isOpen={!!selectedCandidateForCompare}
          onClose={() => setSelectedCandidateForCompare(null)}
          sourceComplaint={complaint}
          candidate={selectedCandidateForCompare}
          onVerificationComplete={handleVerificationComplete}
        />
      )}

      {/* Model Status Modal */}
      <AIModelStatusModal
        isOpen={isModelStatusModalOpen}
        onClose={() => setIsModelStatusModalOpen(false)}
        status={modelStatus}
      />
    </div>
  );
};
