import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ComplianceAssessment, ComplianceEvidence } from '../../types';
import { FileUp, AlertCircle } from 'lucide-react';

interface UploadEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: ComplianceAssessment;
  onSuccess: (evidence: ComplianceEvidence) => void;
}

export const UploadEvidenceModal: React.FC<UploadEvidenceModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onSuccess
}) => {
  const [documentId, setDocumentId] = useState<string>('1');
  const [evidenceType, setEvidenceType] = useState<string>('Inspection Report');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evidenceTypes = [
    'Inspection Report',
    'Biometric Cadre Register',
    'AICTE Mandatory Affidavit',
    'Third-Party Financial Audit',
    'State Directorate Order',
    'Fire Safety Certificate',
    'Occupancy Certificate'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docIdNum = parseInt(documentId, 10);
    if (isNaN(docIdNum) || docIdNum <= 0) {
      setError('Please provide a valid document identifier.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.attachAssessmentEvidence(assessment.id, {
        document_id: docIdNum,
        evidence_type: evidenceType,
        remarks: remarks.trim() || undefined
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to attach evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Evidence: Assessment #${assessment.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="font-semibold text-[#092D62]">{assessment.requirement_id}: {assessment.requirement_title}</div>
          <div className="text-slate-600 mt-0.5">Institution: <strong>{assessment.institution_name}</strong></div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Document Repository Identifier <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            required
            placeholder="e.g. 1"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            References metadata record in secure document repository.
          </p>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Evidence Type Classification <span className="text-red-500">*</span>
          </label>
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value)}
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
          >
            {evidenceTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Submission Notes & Remarks</label>
          <textarea
            rows={3}
            placeholder="Document details, certified authority, date of issuance..."
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
            className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-4 py-1.5 rounded font-semibold disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Attaching...</span>
            ) : (
              <>
                <FileUp className="w-3.5 h-3.5" />
                <span>Attach Evidence</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

