import React, { useState } from 'react';
import { api } from '../../services/api';
import { CoordinationTask } from '../../types';
import { Modal } from '../common/Modal';
import { CheckSquare, GitFork, AlertCircle, Calendar } from 'lucide-react';

interface TaskDependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  existingTasks: CoordinationTask[];
  onTaskCreated: () => void;
}

export const TaskDependencyModal: React.FC<TaskDependencyModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  existingTasks,
  onTaskCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bureauId, setBureauId] = useState<number>(1);
  const [assignedToId, setAssignedToId] = useState<number>(4);
  const [priority, setPriority] = useState<string>('Medium');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10)
  );
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      bureau_id: Number(bureauId),
      assigned_to_id: Number(assignedToId),
      priority,
      due_date: new Date(dueDate).toISOString()
    };

    if (dependsOnTaskId && dependsOnTaskId !== 'none') {
      payload.depends_on_task_id = Number(dependsOnTaskId);
    }

    try {
      await api.addCoordinationTask(workspaceId, payload);
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create coordination task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Coordination Task with DAG Dependencies">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Conduct On-Site Verification of Engineering Block C"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Task Description / Deliverables
          </label>
          <textarea
            rows={2}
            placeholder="Specific deliverables, evidence requirements, and inspection guidelines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Accountable Bureau <span className="text-red-500">*</span>
            </label>
            <select
              value={bureauId}
              onChange={(e) => {
                const bId = Number(e.target.value);
                setBureauId(bId);
                if (bId === 1) setAssignedToId(4);
                if (bId === 2) setAssignedToId(5);
                if (bId === 4) setAssignedToId(6);
              }}
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
              Assigned Field Officer <span className="text-red-500">*</span>
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(Number(e.target.value))}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
            >
              <option value={4}>Dr. Anil Sharma (Officer - RB)</option>
              <option value={5}>Smt. Meera Nair (Officer - PGRC)</option>
              <option value={1}>Super Admin (Directorate Oversight)</option>
              <option value={6}>Monitoring Officer (AICTE Vigilance)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Milestone Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none"
            >
              <option value="Critical">Critical (Immediate Regulatory Priority)</option>
              <option value="High">High (Standard SLA)</option>
              <option value="Medium">Medium (Routine Verification)</option>
              <option value="Low">Low (Informational)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Prescribed Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#092D62]"
            />
          </div>
        </div>

        {/* DAG Task Dependency Selection */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-blue-600" />
            <span>Prerequisite Task Dependency (DAG Sequence)</span>
          </label>
          <select
            value={dependsOnTaskId}
            onChange={(e) => setDependsOnTaskId(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-3 py-2 outline-none bg-white"
          >
            <option value="none">-- No prerequisite (Can begin immediately) --</option>
            {existingTasks.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id}: {t.title} [{t.bureau_code || `Bureau ${t.bureau_id}`}] - Status: {t.status}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">
            If a prerequisite task is selected and not yet completed, this task will automatically initialize in{' '}
            <strong className="text-amber-800">Blocked</strong> status and automatically unlock when the prerequisite completes.
          </p>
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
              <span>Scheduling...</span>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Create Task</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

