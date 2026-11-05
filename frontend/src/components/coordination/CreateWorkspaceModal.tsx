import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Institution, CoordinationWorkspace } from '../../types';
import { Modal } from '../common/Modal';
import { Layers, Building, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ws: CoordinationWorkspace) => void;
  initialCaseId?: string;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialCaseId
}) => {
  const [title, setTitle] = useState('');
  const [institutionId, setInstitutionId] = useState<number>(1);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [primaryBureauId, setPrimaryBureauId] = useState<number>(1);
  const [secondaryBureauId, setSecondaryBureauId] = useState<number>(2);
  const [justification, setJustification] = useState('');
  const [linkedCases, setLinkedCases] = useState<string>(initialCaseId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInstitutions();
      if (initialCaseId) {
        setLinkedCases(initialCaseId);
      }
    }
  }, [isOpen, initialCaseId]);

  const loadInstitutions = async () => {
    try {
      const data = await api.getInstitutions();
      setInstitutions(data);
      if (data.length > 0) {
        setInstitutionId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load institutions:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !justification.trim()) {
      setError('Title and statutory justification are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const caseIds = linkedCases
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      const created = await api.createCoordinationWorkspace({
        title: title.trim(),
        institution_id: Number(institutionId),
        primary_bureau_id: Number(primaryBureauId),
        secondary_bureau_id: Number(secondaryBureauId),
        justification: justification.trim(),
        linked_case_ids: caseIds
      });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Initiate Cross-Bureau Coordination Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Workspace Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Joint Inquiry into Unapproved Infrastructure & Fee Extortion"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#092D62] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Higher Educational Institution <span className="text-red-500">*</span>
          </label>
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(Number(e.target.value))}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#092D62] outline-none"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.official_name} ({inst.permanent_id})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Primary Lead Bureau <span className="text-red-500">*</span>
            </label>
            <select
              value={primaryBureauId}
              onChange={(e) => setPrimaryBureauId(Number(e.target.value))}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
            >
              <option value={1}>Regulation Bureau (RB)</option>
              <option value={2}>Public Grievance Redressal (PGRC)</option>
              <option value={3}>Approval Bureau (APPROVAL)</option>
              <option value={4}>Policy Bureau (POLICY)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Participating Bureau <span className="text-red-500">*</span>
            </label>
            <select
              value={secondaryBureauId}
              onChange={(e) => setSecondaryBureauId(Number(e.target.value))}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
            >
              <option value={2}>Public Grievance Redressal (PGRC)</option>
              <option value={1}>Regulation Bureau (RB)</option>
              <option value={3}>Approval Bureau (APPROVAL)</option>
              <option value={4}>Policy Bureau (POLICY)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Linked Complaint / Case Numbers (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. AICTE-RB-2024-0101, AICTE-PGRC-2024-0089"
            value={linkedCases}
            onChange={(e) => setLinkedCases(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Internal coordination events will be logged to these case dossiers without exposing deliberations publicly.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Statutory Justification & Scope <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Document why multi-bureau investigation is warranted and summarize core allegations..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
          />
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
            className="px-5 py-2 bg-[#092D62] text-white rounded text-sm font-medium hover:bg-[#072147] transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Initiating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Establish Workspace</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

