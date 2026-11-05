import React, { useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { UserPlus, ShieldCheck } from 'lucide-react';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  onAdded: () => void;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onAdded
}) => {
  const [officerId, setOfficerId] = useState<number>(4);
  const [bureauId, setBureauId] = useState<number>(1);
  const [role, setRole] = useState<string>('Participant Officer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.addCoordinationParticipant(workspaceId, {
        officer_id: Number(officerId),
        bureau_id: Number(bureauId),
        role
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add participant officer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Participating Officer to Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Designated Officer <span className="text-red-500">*</span>
          </label>
          <select
            value={officerId}
            onChange={(e) => {
              const val = Number(e.target.value);
              setOfficerId(val);
              // auto-select corresponding bureau
              if (val === 4) setBureauId(1); // officer_rb
              if (val === 5) setBureauId(2); // officer_pgrc
              if (val === 6) setBureauId(4); // monitor
              if (val === 2) setBureauId(1); // bureauhead_rb
              if (val === 3) setBureauId(2); // bureauhead_pgrc
            }}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
          >
            <option value={4}>Dr. Anil Sharma (Officer - Regulation Bureau / RB)</option>
            <option value={5}>Smt. Meera Nair (Officer - Public Grievance Redressal / PGRC)</option>
            <option value={2}>Dr. K. S. Rao (Bureau Head - Regulation Bureau)</option>
            <option value={3}>Dr. P. V. Raman (Bureau Head - PGRC)</option>
            <option value={6}>Monitoring Officer (AICTE Vigilance & Oversight)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Represented Bureau <span className="text-red-500">*</span>
          </label>
          <select
            value={bureauId}
            onChange={(e) => setBureauId(Number(e.target.value))}
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
            Coordination Role <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
          >
            <option value="Co-Lead">Co-Lead (Secondary Bureau Coordinator)</option>
            <option value="Participant Officer">Participant Officer (Field Investigator / Reviewer)</option>
            <option value="Reviewer">Reviewer (Auditor / Legal Advisor)</option>
            <option value="Observer">Observer (Monitoring & Vigilance)</option>
          </select>
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
              <span>Inviting...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add Participant</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

