import React from 'react';
import { AIModelStatus } from '../../types';
import { Modal } from '../common/Modal';
import {
  Cpu, Shield, CheckCircle2, AlertTriangle, Database,
  Layers
} from 'lucide-react';

interface AIModelStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: AIModelStatus | null;
  isLoading?: boolean;
}

export const AIModelStatusModal: React.FC<AIModelStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  isLoading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AICTE Semantic Duplicate Detection Engine — Model Diagnostics"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mb-2" />
            <p className="text-slate-500">Querying model runtime diagnostics...</p>
          </div>
        )}

        {!isLoading && !status && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>AI Model diagnostics unavailable. Please check backend server logs.</span>
          </div>
        )}

        {!isLoading && status && (
          <>
            {/* Model Architecture Header Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center shrink-0 shadow-xs">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{status.model_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                      Version: {status.model_version}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Embedding: {status.embedding_dim}-dimensional dense vectors
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {status.is_available ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    OPERATIONAL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    FALLBACK ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Architecture Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hardware Device</span>
                <span className="font-mono text-xs font-bold text-slate-800 uppercase mt-0.5 block">
                  {status.device || 'CPU (Threaded BLAS)'}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vector Dimensions</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">
                  {status.embedding_dim} Features (L2-Normalized)
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pairwise Features</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">
                  {status.feature_count} Dimensional Vector
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classifier Kernel</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">
                  SVM (RBF Kernel, C={status.best_hyperparameters?.C || 1.0})
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">High Confidence Cutoff</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">
                  {(status.decision_thresholds?.high_confidence_duplicate * 100).toFixed(0)}% Probability
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Review Required Cutoff</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">
                  {(status.decision_thresholds?.manual_review_required * 100).toFixed(0)}% Probability
                </span>
              </div>
            </div>

            {/* Vector Search Architecture Note */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-blue-900 text-xs">Vector Search & Candidate Indexing Strategy</h5>
                  <p className="text-[11px] text-blue-800 mt-0.5 font-mono">{status.vector_engine}</p>
                  <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">{status.pgvector_note}</p>
                </div>
              </div>
            </div>

            {/* 13 Feature Breakdown */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Pairwise Feature Representation (13 Dimensions)</span>
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {status.feature_names?.map((feat, idx) => (
                  <span
                    key={feat}
                    className="font-mono text-[10px] px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700"
                  >
                    f{idx}: {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Statutory Decision-Support Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-lg flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-amber-900 text-xs">Council Statutory Safeguard Notice</h5>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {status.statutory_safeguard}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#092D62] text-white text-xs font-bold rounded hover:bg-[#072249] transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </Modal>
  );
};
