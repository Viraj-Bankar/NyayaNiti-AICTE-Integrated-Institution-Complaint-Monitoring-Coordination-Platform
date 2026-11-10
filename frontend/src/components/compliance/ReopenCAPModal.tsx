import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { CorrectiveActionPlan } from '../../types';
import { AlertTriangle, AlertCircle, RotateCcw } from 'lucide-react';

interface ReopenCAPModalProps {
  isOpen: boolean;
  onClose: () => void;
  cap: CorrectiveActionPlan;
  onSuccess: (updated: CorrectiveActionPlan) => void;
}

export const ReopenCAPModal: React.FC<ReopenCAPModalProps> = ({
  isOpen,
  onClose,
  cap,
  onSuccess
}) => {
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 10) {
      setError('Statutory reopen justification must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.reopenCAP(cap.id, {
        reopen_reason: reopenReason.trim()
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reopen CAP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statutory Reopening: CAP #${cap.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-red-50 border border-red-200 rounded p-2.5 text-red-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Consequential Regulatory Action:</div>
            <p className="mt-0.5 text-red-900 leading-relaxed">
              Reopening a closed Corrective Action Plan reinstates active institutional scrutiny, re-activates risk scoring penalties, and requires mandatory audit logging.
            </p>
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
            Statutory Reopening Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Explain newly discovered evidence, subsequent institutional non-compliance, complaint surge, or inspection discrepancy..."
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
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
            className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <span>Reopening...</span>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Corrective Action Plan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

