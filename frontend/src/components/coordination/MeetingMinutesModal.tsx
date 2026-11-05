import React, { useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { Users, FileText, Calendar, PlusCircle, Trash2 } from 'lucide-react';

interface MeetingMinutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  workspaceTitle: string;
  onLogged: () => void;
}

export const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceTitle,
  onLogged
}) => {
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [chairName, setChairName] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddActionItem = () => {
    setActionItems([...actionItems, '']);
  };

  const handleActionItemChange = (index: number, val: string) => {
    const updated = [...actionItems];
    updated[index] = val;
    setActionItems(updated);
  };

  const handleRemoveActionItem = (index: number) => {
    const updated = actionItems.filter((_, i) => i !== index);
    setActionItems(updated.length > 0 ? updated : ['']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Discussion summary is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const validActionItems = actionItems.map((a) => a.trim()).filter((a) => a.length > 0);

    try {
      await api.recordWorkspaceMeeting(workspaceId, {
        meeting_date: new Date(meetingDate).toISOString(),
        chair_name: chairName.trim() || undefined,
        discussion_summary: summary.trim(),
        action_items: validActionItems
      });
      onLogged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log meeting minutes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Joint Committee Meeting Minutes">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Meeting Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Committee Chair / Lead Officer
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. R. K. Sharma (Advisor, Approval)"
              value={chairName}
              onChange={(e) => setChairName(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Discussion Summary & Findings <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Document proceedings, statements presented by participating bureaus, and joint evaluation..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Agreed Action Items & Deadlines
            </label>
            <button
              type="button"
              onClick={handleAddActionItem}
              className="text-xs text-[#092D62] hover:underline flex items-center gap-1 font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Action Item</span>
            </button>
          </div>
          <div className="space-y-2">
            {actionItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={`Action item #${idx + 1} (e.g. Regional Bureau to verify faculty rolls by Nov 12)`}
                  value={item}
                  onChange={(e) => handleActionItemChange(idx, e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#092D62]"
                />
                {actionItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveActionItem(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
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
              <span>Recording...</span>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Save Meeting Minutes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

