import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ComplianceEvidence } from '../../types';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ReviewEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: ComplianceEvidence;
  onSuccess: (updated: ComplianceEvidence) => void;
}

export const ReviewEvidenceModal: React.FC<ReviewEvidenceModalProps> = ({
  isOpen,
  onClose,
  evidence,
  onSuccess
}) => {
  const [status, setStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [verificationRemarks, setVerificationRemarks] = useState(evidence.verification_remarks || '');
  const [rejectionReason, setRejectionReason] = useState(evidence.rejection_reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationRemarks.trim() || verificationRemarks.trim().length < 3) {
      setError('Verification remarks must be at least 3 characters.');
      return;
    }
    if (status === 'REJECTED' && (!rejectionReason.trim() || rejectionReason.trim().length < 5)) {
      setError('Specific rejection reason is mandatory when rejecting evidence.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.reviewComplianceEvidence(evidence.id, {
        status,
        verification_remarks: verificationRemarks,
        rejection_reason: status === 'REJECTED' ? rejectionReason : undefined
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to review evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review Evidence Item #${evidence.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="font-semibold text-[#092D62]">{evidence.evidence_type}</div>
          <div className="text-slate-600 mt-0.5">Document Name: <strong>{evidence.document_name || `Doc #${evidence.document_id}`}</strong></div>
          <div className="text-slate-500 text-[11px] mt-0.5">Submitted By: {evidence.submitted_by_role} | Timestamp: {new Date(evidence.submitted_at).toLocaleString()}</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Verification Decision <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('VERIFIED')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded border font-semibold cursor-pointer ${
                status === 'VERIFIED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Accept</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus('REJECTED')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded border font-semibold cursor-pointer ${
                status === 'REJECTED'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Evidence</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Official Reviewer Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Document authenticity verification findings, biometric cross-check results, seal inspection..."
            value={verificationRemarks}
            onChange={(e) => setVerificationRemarks(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        {status === 'REJECTED' && (
          <div>
            <label className="block font-semibold text-red-700 mb-1">
              Statutory Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Incomplete notarization, expired fire safety certificate, uncertified signatures..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-red-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        )}

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
            className={`flex items-center gap-1.5 text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer ${
              status === 'VERIFIED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? 'Recording...' : 'Submit Evidence Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

