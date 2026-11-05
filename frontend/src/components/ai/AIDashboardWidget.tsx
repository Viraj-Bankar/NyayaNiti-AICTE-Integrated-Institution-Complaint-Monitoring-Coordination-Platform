import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { aiDuplicatesApi } from '../../services/api';
import { AIModelStatus, AIDuplicateCandidate } from '../../types';
import { AIModelStatusModal } from './AIModelStatusModal';
import {
  Sparkles, Cpu, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, ExternalLink
} from 'lucide-react';

export const AIDashboardWidget: React.FC = () => {
  const navigate = useNavigate();
  const [modelStatus, setModelStatus] = useState<AIModelStatus | null>(null);
  const [pendingRecommendations, setPendingRecommendations] = useState<AIDuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusRes, pendingRes] = await Promise.allSettled([
        aiDuplicatesApi.getModelStatus(),
        aiDuplicatesApi.getPending({ limit: 5 })
      ]);

      if (statusRes.status === 'fulfilled') {
        setModelStatus(statusRes.value);
      }
      if (pendingRes.status === 'fulfilled') {
        setPendingRecommendations(pendingRes.value);
      }
    } catch (err: any) {
      console.error('Error loading AI dashboard widget data:', err);
      setError(err.message || 'Unable to load AI duplicate monitoring metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const highConfidenceCount = pendingRecommendations.filter(
    (r) => r.predicted_relationship === 'HIGH_CONFIDENCE_DUPLICATE'
  ).length;

  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#061E46] uppercase tracking-wide">
                AI Duplicate & Overlap Intelligence Center
              </h4>
              <span className="text-[10px] font-mono text-[#092D62] font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                Sentence-MPNet (768d) + SVM
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Active real-time cross-complaint semantic vector matching across institutional dockets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {modelStatus && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                modelStatus.is_available
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {modelStatus.is_available ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ONLINE ({modelStatus.device.toUpperCase()})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>FALLBACK MODE</span>
                </>
              )}
            </span>
          )}

          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="p-1.5 text-slate-500 hover:text-[#092D62] hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            title="Model Diagnostics"
          >
            <Cpu className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-[#092D62] hover:bg-slate-100 rounded border border-slate-200 transition-colors disabled:opacity-50"
            title="Refresh AI Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="text-red-900 font-bold underline hover:no-underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Reviews</span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {pendingRecommendations.length}
          </span>
          <span className="text-[9px] text-slate-500 block">Requiring Ratification</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Potential Duplicates</span>
          <span className={`text-base font-black mt-0.5 block ${highConfidenceCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {highConfidenceCount}
          </span>
          <span className="text-[9px] text-slate-500 block">High Confidence Tier</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Model Engine</span>
          <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
            {modelStatus?.model_name || 'all-mpnet-base-v2'}
          </span>
          <span className="text-[9px] text-slate-500 block">
            {modelStatus ? `${modelStatus.embedding_dim}-dim Vectors` : '768 Dimensions'}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Statutory Action</span>
          <Link
            to="/complaint-intake"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#092D62] hover:underline mt-1"
          >
            <span>Open Intake Docket</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-[9px] text-slate-500 block">Council Scrutiny Queue</span>
        </div>
      </div>

      {/* Pending Recommendations Mini Table */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
            Recent Unverified Semantic Duplicate Alerts
          </span>
          <Link
            to="/complaint-intake"
            className="text-[11px] font-semibold text-[#1E5AA8] hover:underline flex items-center gap-1"
          >
            <span>View All in Intake</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 text-[#092D62] animate-spin mx-auto mb-1" />
            <span>Scanning duplicate alerts...</span>
          </div>
        ) : pendingRecommendations.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
            {pendingRecommendations.map((rec) => (
              <div
                key={`${rec.source_complaint_id}-${rec.candidate_complaint_id}`}
                className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#092D62]">
                      {rec.source_complaint_id}
                    </span>
                    <span className="text-slate-400">↔</span>
                    <span className="font-mono font-bold text-slate-700">
                      {rec.candidate_complaint_id}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        rec.predicted_relationship === 'HIGH_CONFIDENCE_DUPLICATE'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {rec.predicted_relationship === 'HIGH_CONFIDENCE_DUPLICATE'
                        ? 'Potential Duplicate'
                        : 'Related Grievance'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 font-medium">
                    {rec.candidate_institution_name} • {rec.candidate_category}
                  </p>

                  <p className="text-[10px] text-slate-500 italic">
                    {rec.explanation}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">
                      Cosine: <strong className="text-slate-800 font-mono">{rec.similarity_score.toFixed(4)}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      SVM Conf: <strong className="text-slate-800 font-mono">{(rec.duplicate_probability * 100).toFixed(1)}%</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/complaint-intake/${rec.source_complaint_id}`)}
                    className="px-2.5 py-1 bg-[#092D62] text-white hover:bg-[#123C7B] text-[11px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Scrutinize</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center border border-dashed border-slate-200 rounded text-xs text-slate-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <span>No pending unverified duplicate alerts in council queue.</span>
          </div>
        )}
      </div>

      {/* Model Status Modal */}
      <AIModelStatusModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        status={modelStatus}
      />
    </div>
  );
};
