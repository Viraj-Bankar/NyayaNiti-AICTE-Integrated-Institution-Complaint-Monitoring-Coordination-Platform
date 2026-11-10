import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ComplianceAssessment } from '../../types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ReviewAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: ComplianceAssessment;
  onSuccess: (updated: ComplianceAssessment) => void;
}

export const ReviewAssessmentModal: React.FC<ReviewAssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onSuccess
}) => {
  const [status, setStatus] = useState<string>(assessment.status || 'COMPLIANT');
  const [reviewerRemarks, setReviewerRemarks] = useState<string>(assessment.reviewer_remarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerRemarks.trim() || reviewerRemarks.trim().length < 5) {
      setError('Statutory review remarks must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.reviewComplianceAssessment(assessment.id, {
        status: status as any,
        reviewer_remarks: reviewerRemarks
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record assessment review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statutory Review: Assessment #${assessment.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="font-semibold text-[#092D62]">{assessment.requirement_id}: {assessment.requirement_title}</div>
          <div className="text-slate-600 mt-0.5">Institution: <strong>{assessment.institution_name}</strong> | Academic Period: <strong>{assessment.assessment_period}</strong></div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Statutory Determination Status <span className="text-red-500">*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          >
            <option value="COMPLIANT">COMPLIANT (100% Score Awarded)</option>
            <option value="PARTIALLY_COMPLIANT">PARTIALLY COMPLIANT (50% Score Awarded - Minor Rectification)</option>
            <option value="NON_COMPLIANT">NON-COMPLIANT (0% Score Awarded - Deficiency Flagged)</option>
            <option value="PENDING_EVIDENCE">PENDING EVIDENCE (Documentation Awaited)</option>
            <option value="UNDER_REVIEW">UNDER REVIEW (Inspection / Document Verification in Progress)</option>
            <option value="NOT_APPLICABLE">NOT APPLICABLE (Institution Exempt from Standard)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Official Reviewer Remarks & Evidence Findings <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Record detailed evaluation notes, verified cadred numbers, inspection date, or statutory deficiency details..."
            value={reviewerRemarks}
            onChange={(e) => setReviewerRemarks(e.target.value)}
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
            className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Recording...</span>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Review Determination</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

