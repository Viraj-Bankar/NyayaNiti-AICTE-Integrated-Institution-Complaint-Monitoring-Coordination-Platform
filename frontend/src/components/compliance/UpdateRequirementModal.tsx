import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { RegulatoryRequirement, RegulatoryRequirementUpdatePayload } from '../../types';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface UpdateRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: RegulatoryRequirement;
  onSuccess: (updated: RegulatoryRequirement) => void;
}

export const UpdateRequirementModal: React.FC<UpdateRequirementModalProps> = ({
  isOpen,
  onClose,
  requirement,
  onSuccess
}) => {
  const [formData, setFormData] = useState<RegulatoryRequirementUpdatePayload>({
    title: requirement.title,
    description: requirement.description,
    category_code: requirement.category_code,
    regulatory_source: requirement.regulatory_source,
    source_reference_url: requirement.source_reference_url || '',
    weight: requirement.weight,
    is_active: requirement.is_active,
    changes_summary: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.changes_summary?.trim()) {
      setError('Statutory Summary of Changes is mandatory when promulgating a requirement update.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.updateRegulatoryRequirement(requirement.id, formData);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Promulgate Statutory Update: ${requirement.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-900 text-xs">
          <p className="font-semibold mb-1">
            Statutory Versioning Engine Alert:
          </p>
          <p>
            Promulgating this change will archive the current Version {requirement.version} state into the permanent statutory audit registry and generate <strong>Version {requirement.version + 1}</strong>.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Requirement Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Statutory Description</label>
          <textarea
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Regulatory Citation</label>
            <input
              type="text"
              required
              value={formData.regulatory_source}
              onChange={(e) => setFormData({ ...formData, regulatory_source: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Severity Weight</label>
            <select
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value={1.0}>1.0 - Critical Statutory Mandate</option>
              <option value={0.7}>0.7 - Major Institutional Standard</option>
              <option value={0.4}>0.4 - Minor Procedural Standard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Gazette Notification Summary / Change Rationale <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="Explain gazette notification number or official statutory reason for update..."
            value={formData.changes_summary || ''}
            onChange={(e) => setFormData({ ...formData, changes_summary: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded text-[#092D62] focus:ring-[#092D62]"
          />
          <label htmlFor="is_active" className="text-xs font-semibold text-slate-700">
            Mandate remains active for institutional evaluations
          </label>
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
              <span>Promulgating...</span>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Promulgate Version {requirement.version + 1}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

