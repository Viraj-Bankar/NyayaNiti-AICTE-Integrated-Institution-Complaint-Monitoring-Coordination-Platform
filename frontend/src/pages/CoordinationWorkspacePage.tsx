import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CoordinationWorkspace } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  Layers, Users, CheckCircle2, Clock, Calendar, PlusCircle,
  ExternalLink, Building, ShieldCheck, AlertCircle
} from 'lucide-react';

export const CoordinationWorkspacePage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<CoordinationWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<CoordinationWorkspace | null>(null);

  // New task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskBureau, setTaskBureau] = useState(1);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('High');

  const navigate = useNavigate();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCoordinationWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !selectedWs) {
        setSelectedWs(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedWs) return;
    try {
      await api.addCoordinationTask(selectedWs.id, {
        title: taskTitle,
        description: taskDesc,
        assigned_to_id: selectedWs.coordination_owner_id,
        bureau_id: taskBureau,
        due_date: taskDueDate || new Date(Date.now() + 86400000 * 5).toISOString(),
        priority: taskPriority
      });
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      // Reload workspaces
      const updated = await api.getCoordinationWorkspaces();
      setWorkspaces(updated);
      setSelectedWs(updated.find((w) => w.id === selectedWs.id) || updated[0]);
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await api.updateCoordinationTask(taskId, nextStatus);
      const updated = await api.getCoordinationWorkspaces();
      setWorkspaces(updated);
      if (selectedWs) {
        setSelectedWs(updated.find((w) => w.id === selectedWs.id) || null);
      }
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                JOINT BUREAU PLATFORM
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{workspaces.length} Active Workspaces</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#092D62]" />
              <span>Cross-Bureau Coordination Workspaces</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Multi-departmental collaboration workspace for shared tasks, joint orders, and synchronized regulatory disposal.
            </p>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Workspaces List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
              Active Coordination Units
            </h3>

            {isLoading ? (
              <div className="bg-white p-6 rounded border border-slate-200 text-center text-xs text-slate-500">
                Loading coordination workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="bg-white p-6 rounded border border-slate-200 text-center text-xs text-slate-500">
                No active coordination workspaces. To initiate one, visit the Overlap Center or Case Dossier.
              </div>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => setSelectedWs(ws)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedWs?.id === ws.id
                      ? 'bg-white border-[#092D62] shadow-md ring-1 ring-[#092D62]'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">WS #{ws.id}</span>
                    <span className="bg-blue-50 text-[#092D62] border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      {ws.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#061E46] line-clamp-1">{ws.title}</h4>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">{ws.institution_name}</p>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>Bureaus: <strong>{ws.primary_bureau_code}</strong> {ws.secondary_bureau_code && `& ${ws.secondary_bureau_code}`}</span>
                    <span>•</span>
                    <span>Tasks: <strong>{ws.tasks?.length || 0}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Selected Workspace Detail */}
          <div className="lg:col-span-8">
            {selectedWs ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">Workspace #{selectedWs.id}</span>
                      <span className="bg-[#092D62] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Lead: {selectedWs.primary_bureau_code}
                      </span>
                      {selectedWs.secondary_bureau_code && (
                        <span className="bg-[#1E5AA8] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Peer: {selectedWs.secondary_bureau_code}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-[#061E46] mt-1.5">{selectedWs.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Institution: <strong>{selectedWs.institution_name}</strong> |
                      Lead Coordinator: <strong>{selectedWs.coordination_owner_name}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="btn-3d-amber px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Assign Shared Task</span>
                  </button>
                </div>

                {/* Justification & Consensus Decisions */}
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Coordination Mandate & Justification</span>
                    <p className="text-slate-800 leading-relaxed">{selectedWs.justification || 'Joint inter-bureau resolution mandate.'}</p>
                  </div>

                  {selectedWs.decisions && (
                    <div className="bg-blue-50/70 p-3.5 rounded border border-blue-200 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#1E5AA8] block">Standing Committee Consensus Decision</span>
                      <p className="text-slate-900 font-semibold">{selectedWs.decisions}</p>
                    </div>
                  )}
                </div>

                {/* Linked Cases Across Bureaus */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Linked Cases Under Joint Monitoring (Separate Legal Identities Preserved):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedWs.linked_case_ids.map((cid) => (
                      <div
                        key={cid}
                        onClick={() => navigate(`/cases/${cid}`)}
                        className="p-3 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#092D62] text-xs hover:underline">{cid}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared Coordination Tasks */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Shared Action Tasks ({selectedWs.tasks?.length || 0})
                    </span>
                    <span className="text-[10px] text-slate-500">Click checkmark to toggle progress</span>
                  </div>

                  <div className="space-y-2.5">
                    {(!selectedWs.tasks || selectedWs.tasks.length === 0) ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No tasks assigned yet. Click "Assign Shared Task" above.</p>
                    ) : (
                      selectedWs.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded border text-xs flex items-start justify-between gap-3 transition-colors ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleTaskStatus(task.id, task.status)}
                              className={`p-1 rounded mt-0.5 transition-colors cursor-pointer ${
                                task.status === 'Completed'
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-400 hover:bg-slate-100 text-transparent'
                              }`}
                              title={task.status === 'Completed' ? 'Mark In Progress' : 'Mark Completed'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            <div>
                              <h5 className={`font-bold text-xs ${task.status === 'Completed' ? 'line-through text-slate-500' : 'text-[#061E46]'}`}>
                                {task.title}
                              </h5>
                              {task.description && (
                                <p className="text-[11px] text-slate-600 mt-0.5">{task.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                <span>Assigned to: <strong className="text-slate-700">{task.assigned_to_name}</strong></span>
                                <span>•</span>
                                <span>Bureau: <strong className="text-[#092D62]">{task.bureau_code}</strong></span>
                                <span>•</span>
                                <span>Due: <span className="font-mono">{new Date(task.due_date).toLocaleDateString()}</span></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <StatusBadge status={task.priority} type="priority" />
                            <span className="text-[10px] font-bold text-slate-600">{task.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-xs text-slate-500">
                Select a coordination workspace from the left to view tasks and joint orders.
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Task */}
        <Modal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          title="Assign Shared Coordination Task"
          subtitle={selectedWs ? `Workspace: ${selectedWs.title}` : ''}
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Verify EPF Challans with Regional Bank"
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Detailed Instructions</label>
              <textarea
                rows={3}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Specific evidentiary requirements or inquiry steps..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsible Bureau</label>
                <select
                  value={taskBureau}
                  onChange={(e) => setTaskBureau(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value={1}>Regulation Bureau (RB)</option>
                  <option value={2}>Public Grievance Cell (PGRC)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-3d-amber px-4 py-1.5 rounded text-xs font-bold"
              >
                Create Task
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
