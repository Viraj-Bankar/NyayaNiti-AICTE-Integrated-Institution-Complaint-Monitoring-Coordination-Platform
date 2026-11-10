import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { RegulatoryRequirement, RegulatoryRequirementCreatePayload } from '../../types';
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (req: RegulatoryRequirement) => void;
  bureaus: { id: number; code: string; name: string }[];
}

export const CreateRequirementModal: React.FC<CreateRequirementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bureaus
}) => {
  const [formData, setFormData] = useState<RegulatoryRequirementCreatePayload>({
    id: '',
    title: '',
    description: '',
    category_code: 'INFRASTRUCTURE',
    regulatory_source: '',
    source_reference_url: '',
    applicable_institution_types: ['ALL'],
    weight: 1.0,
    responsible_bureau_id: bureaus[0]?.id || 1,
    default_evidence_requirements: []
  });

  const [evidenceTag, setEvidenceTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { code: 'INFRASTRUCTURE', label: 'Land & Infrastructure Standards' },
    { code: 'FACULTY_CADRE', label: 'Faculty Cadre & Cadre Ratio' },
    { code: 'ANTI_RAGGING', label: 'Mandatory Anti-Ragging Committee' },
    { code: 'GOVERNANCE', label: 'Internal Complaints Committee & Governance' },
    { code: 'FINANCIAL_AUDIT', label: 'Fee Transparency & Financial Audit' },
    { code: 'ACADEMIC_STANDARDS', label: 'Curriculum & Academic Approvals' }
  ];

  const institutionTypeOptions = ['ALL', 'ENGINEERING', 'MANAGEMENT', 'PHARMACY', 'POLYTECHNIC', 'ARCHITECTURE'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim()) {
      setError('Requirement Identifier (e.g. REG-FAC-01) is mandatory.');
      return;
    }
    if (!formData.title.trim() || formData.title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    if (!formData.regulatory_source.trim()) {
      setError('Regulatory source citation (e.g. AICTE APH 2024-27 Clause 7.12) is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.createRegulatoryRequirement(formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create regulatory requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEvidenceItem = () => {
    if (evidenceTag.trim()) {
      setFormData((prev) => ({
        ...prev,
        default_evidence_requirements: [...(prev.default_evidence_requirements || []), evidenceTag.trim()]
      }));
      setEvidenceTag('');
    }
  };

  const removeEvidenceItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      default_evidence_requirements: (prev.default_evidence_requirements || []).filter((_, i) => i !== idx)
    }));
  };

  const toggleInstType = (type: string) => {
    setFormData((prev) => {
      let current = [...(prev.applicable_institution_types || [])];
      if (type === 'ALL') {
        return { ...prev, applicable_institution_types: ['ALL'] };
      }
      current = current.filter((t) => t !== 'ALL');
      if (current.includes(type)) {
        current = current.filter((t) => t !== type);
      } else {
        current.push(type);
      }
      return { ...prev, applicable_institution_types: current.length > 0 ? current : ['ALL'] };
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Promulgate Canonical Regulatory Requirement">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-900 flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Statutory Promulgation: All defined requirements establish legal compliance benchmarks for technical institutions across India. Initial promulgation creates Version 1 automatically.
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
              Requirement Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. REG-FAC-01"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62] font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Category Code <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_code}
              onChange={(e) => setFormData({ ...formData, category_code: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              {categories.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Requirement Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Mandatory Student-Faculty Ratio Compliance"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Statutory Description & Standards <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Explain detailed legal and infrastructural mandate..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Regulatory Authority Citation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AICTE Approval Process Handbook Clause 7.12"
              value={formData.regulatory_source}
              onChange={(e) => setFormData({ ...formData, regulatory_source: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Responsible AICTE Bureau <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.responsible_bureau_id}
              onChange={(e) => setFormData({ ...formData, responsible_bureau_id: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              {bureaus.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Compliance Severity Weight (Formula Factor)
            </label>
            <select
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value={1.0}>1.0 - Critical Statutory Mandate (Full Weight)</option>
              <option value={0.7}>0.7 - Major Institutional Standard</option>
              <option value={0.4}>0.4 - Minor Procedural / Reporting Standard</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Gazette / Source URL Reference (Optional)
            </label>
            <input
              type="url"
              placeholder="https://aicte-india.org/statutory-orders/..."
              value={formData.source_reference_url || ''}
              onChange={(e) => setFormData({ ...formData, source_reference_url: e.target.value })}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Applicable Institution Types</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {institutionTypeOptions.map((type) => {
              const active = formData.applicable_institution_types?.includes(type);
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => toggleInstType(type)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#092D62] text-white border-[#092D62]'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Required Evidence Types</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Certified Biometric Attendance Register"
              value={evidenceTag}
              onChange={(e) => setEvidenceTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEvidenceItem();
                }
              }}
              className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
            <button
              type="button"
              onClick={addEvidenceItem}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded font-semibold cursor-pointer"
            >
              Add
            </button>
          </div>
          {formData.default_evidence_requirements && formData.default_evidence_requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.default_evidence_requirements.map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] text-slate-700">
                  {item}
                  <button type="button" onClick={() => removeEvidenceItem(idx)} className="text-red-500 font-bold hover:text-red-700 ml-1">×</button>
                </span>
              ))}
            </div>
          )}
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
              <span>Promulgating...</span>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Promulgate Requirement</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

