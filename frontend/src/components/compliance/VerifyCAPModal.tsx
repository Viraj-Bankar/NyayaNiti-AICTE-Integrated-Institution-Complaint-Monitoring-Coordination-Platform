import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { CorrectiveActionPlan } from '../../types';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface VerifyCAPModalProps {
  isOpen: boolean;
  onClose: () => void;
  cap: CorrectiveActionPlan;
  onSuccess: (updated: CorrectiveActionPlan) => void;
}

export const VerifyCAPModal: React.FC<VerifyCAPModalProps> = ({
  isOpen,
  onClose,
  cap,
  onSuccess
}) => {
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [closureDecision, setClosureDecision] = useState('Remediation Verified & Deficiency Resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationRemarks.trim() || verificationRemarks.trim().length < 5) {
      setError('Verification inspection remarks must be at least 5 characters.');
      return;
    }
    if (!closureDecision.trim() || closureDecision.trim().length < 5) {
      setError('Statutory closure decision must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.verifyCAP(cap.id, {
        verification_remarks: verificationRemarks.trim(),
        closure_decision: closureDecision.trim()
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify and close CAP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statutory Verification: CAP #${cap.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-emerald-950">
          <div className="font-semibold">{cap.title}</div>
          <div className="text-slate-700 mt-0.5">Institution: <strong>{cap.institution_name}</strong></div>
          <div className="text-emerald-800 text-[11px] mt-1 font-medium">
            Anti-Self-Certification Guard Active: Only an authorized independent officer can formally certify remediation completion and close this statutory directive.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Official Closure Determination <span className="text-red-500">*</span>
          </label>
          <select
            value={closureDecision}
            onChange={(e) => setClosureDecision(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          >
            <option value="Remediation Verified & Deficiency Resolved">
              Remediation Verified & Deficiency Resolved (Full Compliance Restored)
            </option>
            <option value="Satisfactorily Substituted & Conditionally Closed">
              Satisfactorily Substituted & Conditionally Closed
            </option>
            <option value="Statutory Rectification Confirmed by Regional Directorate">
              Statutory Rectification Confirmed by Regional Directorate
            </option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Verification Officer Audit Findings <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Record detailed inspection findings, verified document serial numbers, on-site cross-check findings..."
            value={verificationRemarks}
            onChange={(e) => setVerificationRemarks(e.target.value)}
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
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <span>Verifying...</span>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Remediation & Close CAP</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

