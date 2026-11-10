import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { CorrectiveActionPlan, CAPCreatePayload } from '../../types';
import { AlertOctagon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateCAPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cap: CorrectiveActionPlan) => void;
  institutions: { id: number; official_name: string }[];
  bureaus: { id: number; code: string; name: string }[];
}

export const CreateCAPModal: React.FC<CreateCAPModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  institutions,
  bureaus
}) => {
  const [formData, setFormData] = useState<CAPCreatePayload>({
    institution_id: institutions[0]?.id || 1,
    title: '',
    identified_gap: '',
    required_action: '',
    responsible_bureau_id: bureaus[0]?.id || 1,
    assigned_officer_id: 1,
    priority: 'High',
    prescribed_deadline: new Date(Date.now() + 86400000 * 30).toISOString()
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.title.length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }
    if (!formData.identified_gap.trim() || formData.identified_gap.length < 10) {
      setError('Identified deficiency gap must be at least 10 characters.');
      return;
    }
    if (!formData.required_action.trim() || formData.required_action.length < 10) {
      setError('Required statutory remediation action must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.createCorrectiveActionPlan(formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue Corrective Action Plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Statutory Corrective Action Plan (CAP)">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-900 flex items-start gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Statutory Remediation Directive: Issuing a CAP places the institution on official notice to rectify a verified regulatory gap before the prescribed deadline.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target Institution <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.institution_id}
              onChange={(e) => setFormData({ ...formData, institution_id: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.official_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Priority Tier <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="Critical">Critical (Immediate Rectification)</option>
              <option value="High">High (Strict Statutory Deadline)</option>
              <option value="Medium">Medium (Standard Rectification)</option>
              <option value="Low">Low (Procedural Notice)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            CAP Title / Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Remediation of Deficient Student-Faculty Cadre Ratio"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Identified Compliance Gap <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="Document exact deficiency observed, shortfall numbers, or missing facilities..."
            value={formData.identified_gap}
            onChange={(e) => setFormData({ ...formData, identified_gap: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Required Remediation Mandate <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="Specify precise corrective steps institution must complete and document..."
            value={formData.required_action}
            onChange={(e) => setFormData({ ...formData, required_action: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Accountable Bureau <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.responsible_bureau_id}
              onChange={(e) => setFormData({ ...formData, responsible_bureau_id: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              {bureaus.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Prescribed Statutory Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.prescribed_deadline.slice(0, 10)}
              onChange={(e) => setFormData({ ...formData, prescribed_deadline: new Date(e.target.value).toISOString() })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>
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
              <span>Issuing...</span>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Issue Corrective Action Plan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

