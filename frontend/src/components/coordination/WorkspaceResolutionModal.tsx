import React, { useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { CheckCircle2, AlertTriangle, Scale, Lock } from 'lucide-react';

interface WorkspaceResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  workspaceTitle: string;
  onResolved: () => void;
}

export const WorkspaceResolutionModal: React.FC<WorkspaceResolutionModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceTitle,
  onResolved
}) => {
  const [resolutionStatus, setResolutionStatus] = useState<'Completed' | 'Closed with Justification'>('Completed');
  const [consensusDecisions, setConsensusDecisions] = useState('');
  const [applyToCases, setApplyToCases] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consensusDecisions.trim()) {
      setError('Consensus decisions and directions are mandatory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.resolveCoordinationWorkspace(workspaceId, {
        resolution_status: resolutionStatus,
        consensus_decisions: consensusDecisions.trim(),
        apply_to_cases: applyToCases
      });
      onResolved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record resolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conclude Cross-Bureau Coordination & Record Consensus">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold block text-amber-950">Statutory Notice:</span>
            Recording consensus resolution formalizes the joint findings of all participating AICTE bureaus for{' '}
            <span className="font-semibold">{workspaceTitle}</span>. Once marked completed, the workspace moves to final record.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Final Disposal State <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`border rounded p-3 cursor-pointer text-xs font-medium flex items-center gap-2 ${
                resolutionStatus === 'Completed'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={resolutionStatus === 'Completed'}
                onChange={() => setResolutionStatus('Completed')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Completed (Action Taken)</span>
            </label>
            <label
              className={`border rounded p-3 cursor-pointer text-xs font-medium flex items-center gap-2 ${
                resolutionStatus === 'Closed with Justification'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={resolutionStatus === 'Closed with Justification'}
                onChange={() => setResolutionStatus('Closed with Justification')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Closed with Justification</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Binding Consensus Decisions & Directions <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Record binding directions agreed across bureaus (e.g. Institution directed to refund unauthorized fees by Dec 1, 2026; intake reduced by 25% for Academic Session 2026-27)..."
            value={consensusDecisions}
            onChange={(e) => setConsensusDecisions(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
          />
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={applyToCases}
              onChange={(e) => setApplyToCases(e.target.checked)}
              className="mt-0.5 rounded text-[#092D62] focus:ring-[#092D62]"
            />
            <span>
              <strong className="block text-slate-900">Synchronize to Linked Case Timelines</strong>
              Appends a confidential, non-public CaseEvent (`COORDINATION_RESOLVED`) to each linked case dossier without altering statutory case IDs.
            </span>
          </label>
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-700 text-white rounded text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Finalizing...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Conclude Workspace</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

