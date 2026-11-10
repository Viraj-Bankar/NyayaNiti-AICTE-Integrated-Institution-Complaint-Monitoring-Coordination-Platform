import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { CorrectiveActionPlan } from '../../types';
import { FileUp, AlertCircle } from 'lucide-react';

interface SubmitCAPEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cap: CorrectiveActionPlan;
  onSuccess: (updated: CorrectiveActionPlan) => void;
}

export const SubmitCAPEvidenceModal: React.FC<SubmitCAPEvidenceModalProps> = ({
  isOpen,
  onClose,
  cap,
  onSuccess
}) => {
  const [docId, setDocId] = useState<string>('1');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docNum = parseInt(docId, 10);
    if (isNaN(docNum) || docNum <= 0) {
      setError('Please provide a valid document ID.');
      return;
    }
    if (!remarks.trim() || remarks.trim().length < 5) {
      setError('Submission remarks must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.submitCAPEvidence(cap.id, {
        completion_evidence_doc_id: docNum,
        remarks: remarks.trim()
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit remediation evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Remediation Evidence: CAP #${cap.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="font-semibold text-[#092D62]">{cap.title}</div>
          <div className="text-slate-600 mt-0.5">Institution: <strong>{cap.institution_name}</strong></div>
          <div className="text-slate-500 text-[11px] mt-0.5">Required Action: {cap.required_action}</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Completion Proof Document ID <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            required
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Institutional Rectification Narrative & Proof Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Document actions completed to rectify the gap, appointment orders, infrastructure handover, inspection date..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <FileUp className="w-3.5 h-3.5" />
                <span>Submit Evidence for Officer Verification</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
