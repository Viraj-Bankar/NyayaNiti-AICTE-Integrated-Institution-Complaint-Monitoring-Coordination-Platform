import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { CoordinationWorkspace, CoordinationTask, EscalationSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { CreateWorkspaceModal } from '../components/coordination/CreateWorkspaceModal';
import { TaskDependencyModal } from '../components/coordination/TaskDependencyModal';
import { WorkspaceResolutionModal } from '../components/coordination/WorkspaceResolutionModal';
import { MeetingMinutesModal } from '../components/coordination/MeetingMinutesModal';
import { AddParticipantModal } from '../components/coordination/AddParticipantModal';
import {
  Layers, Users, CheckCircle2, Clock, Calendar, PlusCircle,
  ExternalLink, Building, ShieldCheck, AlertCircle, GitFork,
  BarChart3, AlertTriangle, FileText, Lock, RefreshCw, CheckSquare,
  Search, Filter, ChevronRight, Scale, ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export const CoordinationWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlWsId = searchParams.get('workspaceId');
  const urlLinkCases = searchParams.get('linkCases');

  const [activeView, setActiveView] = useState<'workspaces' | 'dashboard' | 'kanban' | 'escalations'>('workspaces');
  const [workspaces, setWorkspaces] = useState<CoordinationWorkspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<CoordinationWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Escalation Summary state
  const [escalationSummary, setEscalationSummary] = useState<EscalationSummary | null>(null);
  const [isScanningEscalations, setIsScanningEscalations] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);

  // Workspace sub-tabs
  const [wsTab, setWsTab] = useState<'tasks' | 'cases' | 'participants' | 'meetings' | 'decisions'>('tasks');

  // Task inline editing
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [taskRemarks, setTaskRemarks] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadAllData();
    if (urlLinkCases) {
      setIsCreateModalOpen(true);
    }
  }, [urlLinkCases]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [wsData, escData] = await Promise.all([
        api.getCoordinationWorkspaces(),
        api.getEscalationSummary().catch(() => null)
      ]);
      setWorkspaces(wsData);
      setEscalationSummary(escData);

      if (wsData.length > 0) {
        if (urlWsId) {
          const match = wsData.find((w) => w.id === Number(urlWsId));
          setSelectedWs(match || wsData[0]);
        } else if (!selectedWs) {
          setSelectedWs(wsData[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load coordination workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshWorkspace = async (wsId: number) => {
    try {
      const updatedWs = await api.getCoordinationWorkspace(wsId);
      setSelectedWs(updatedWs);
      const all = await api.getCoordinationWorkspaces();
      setWorkspaces(all);
    } catch (err) {
      console.error('Failed to refresh workspace:', err);
    }
  };

  const handleTaskStatusToggle = async (task: CoordinationTask) => {
    const nextStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await api.updateCoordinationTask(task.id, nextStatus, taskRemarks || undefined);
      setUpdatingTaskId(null);
      setTaskRemarks('');
      if (selectedWs) {
        await handleRefreshWorkspace(selectedWs.id);
      }
    } catch (err: any) {
      alert(`Error updating task status: ${err.message}`);
    }
  };

  const handleTriggerEscalationScan = async () => {
    setIsScanningEscalations(true);
    setScanMessage(null);
    try {
      const res = await api.scanEscalations();
      const updatedSum = await api.getEscalationSummary();
      setEscalationSummary(updatedSum);
      setScanMessage(
        `Escalation scan complete: ${res.results?.tasks_marked_overdue || 0} overdue task(s) flagged, ${res.results?.notifications_dispatched || 0} notification(s) dispatched.`
      );
      // Refresh current workspace in case tasks were marked overdue
      if (selectedWs) {
        await handleRefreshWorkspace(selectedWs.id);
      }
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setIsScanningEscalations(false);
    }
  };

  const handleRemoveParticipant = async (officerId: number) => {
    if (!selectedWs) return;
    if (!window.confirm('Are you sure you want to remove this officer from the workspace?')) return;
    try {
      await api.removeCoordinationParticipant(selectedWs.id, officerId);
      await handleRefreshWorkspace(selectedWs.id);
    } catch (err: any) {
      alert(`Error removing participant: ${err.message}`);
    }
  };

  // Filter workspaces
  const filteredWorkspaces = workspaces.filter((w) => {
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    const matchesSearch =
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.institution_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.primary_bureau_code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // KPI calculations for dashboard
  const totalTasks = workspaces.reduce((acc, w) => acc + (w.tasks?.length || 0), 0);
  const completedTasks = workspaces.reduce(
    (acc, w) => acc + (w.tasks?.filter((t) => t.status === 'Completed').length || 0),
    0
  );
  const pendingTasks = workspaces.reduce(
    (acc, w) => acc + (w.tasks?.filter((t) => t.status === 'Pending').length || 0),
    0
  );
  const blockedTasks = workspaces.reduce(
    (acc, w) => acc + (w.tasks?.filter((t) => t.status === 'Blocked').length || 0),
    0
  );
  const overdueTasks = escalationSummary?.overdue_tasks || 0;

  // Chart data
  const taskStatusData = [
    { name: 'Completed', count: completedTasks, color: '#059669' },
    { name: 'In Progress / Pending', count: pendingTasks, color: '#2563eb' },
    { name: 'Blocked (DAG)', count: blockedTasks, color: '#d97706' },
    { name: 'Overdue (SLA)', count: overdueTasks, color: '#dc2626' }
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white bg-[#092D62] px-2 py-0.5 rounded tracking-wider">
                AICTE STATUTORY COLLABORATION
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {workspaces.length} Registered Workspaces
              </span>
              {overdueTasks > 0 && (
                <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  {overdueTasks} Overdue Tasks
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#092D62]" />
              <span>Cross-Bureau Coordination & Governance Hub</span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Multi-departmental collaboration workspace for shared tasks, DAG dependency execution, and synchronized regulatory disposal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTriggerEscalationScan}
              disabled={isScanningEscalations}
              className="px-3.5 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningEscalations ? 'animate-spin' : ''}`} />
              <span>Scan Escalations</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#092D62] text-white rounded text-xs font-semibold hover:bg-[#072147] transition flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Initiate Workspace</span>
            </button>
          </div>
        </div>

        {/* Scan Feedback Alert */}
        {scanMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{scanMessage}</span>
            </div>
            <button onClick={() => setScanMessage(null)} className="text-blue-500 hover:text-blue-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-t px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveView('workspaces')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'workspaces'
                ? 'border-[#092D62] text-[#092D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Workspaces & Dossiers</span>
          </button>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'dashboard'
                ? 'border-[#092D62] text-[#092D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Operations Dashboard</span>
          </button>
          <button
            onClick={() => setActiveView('kanban')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'kanban'
                ? 'border-[#092D62] text-[#092D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Task Dependency Board (DAG)</span>
          </button>
          <button
            onClick={() => setActiveView('escalations')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeView === 'escalations'
                ? 'border-[#092D62] text-[#092D62]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>SLA Escalation Center</span>
            {overdueTasks > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                {overdueTasks}
              </span>
            )}
          </button>
        </div>

        {/* VIEW 1: WORKSPACES & CASE DOSSIERS */}
        {activeView === 'workspaces' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Workspaces List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search workspace or institution..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded outline-none focus:ring-1 focus:ring-[#092D62]"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto text-[11px]">
                  {['ALL', 'In Coordination', 'Completed', 'Closed with Justification'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-1 rounded whitespace-nowrap ${
                        statusFilter === st
                          ? 'bg-[#092D62] text-white font-medium'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#092D62] mx-auto mb-2" />
                  Loading coordination records...
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No coordination workspaces matching criteria.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                  {filteredWorkspaces.map((ws) => {
                    const isSelected = selectedWs?.id === ws.id;
                    const overdueInWs = ws.tasks?.filter((t) => t.status === 'Overdue').length || 0;
                    return (
                      <div
                        key={ws.id}
                        onClick={() => setSelectedWs(ws)}
                        className={`p-3.5 rounded border text-left cursor-pointer transition shadow-sm ${
                          isSelected
                            ? 'bg-slate-50 border-[#092D62] ring-1 ring-[#092D62]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            WS #{ws.id}
                          </span>
                          <StatusBadge status={ws.status} />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                          {ws.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{ws.institution_name}</span>
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
                            {ws.primary_bureau_code || 'RB'} ↔ {ws.secondary_bureau_code || 'PGRC'}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            {overdueInWs > 0 ? (
                              <span className="text-red-600 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> {overdueInWs} Overdue
                              </span>
                            ) : (
                              <span>{ws.tasks?.length || 0} Tasks</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Workspace Detail View */}
            <div className="lg:col-span-8">
              {selectedWs ? (
                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
                  {/* Top Bar of Workspace */}
                  <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          WORKSPACE #{selectedWs.id}
                        </span>
                        <StatusBadge status={selectedWs.status} />
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-700">
                          Lead: {selectedWs.coordination_owner_name || 'Designated Lead'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-[#061E46]">
                        {selectedWs.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{selectedWs.institution_name}</span>
                        <span className="text-slate-400">|</span>
                        <span>Primary Bureau: <strong>{selectedWs.primary_bureau_code}</strong></span>
                        {selectedWs.secondary_bureau_code && (
                          <>
                            <span className="text-slate-400">|</span>
                            <span>Participating: <strong>{selectedWs.secondary_bureau_code}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setIsMeetingModalOpen(true)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Log Minutes</span>
                      </button>
                      {selectedWs.status !== 'Completed' && (
                        <button
                          onClick={() => setIsResolveModalOpen(true)}
                          className="px-3.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800 flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve / Conclude</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Justification Banner */}
                  {selectedWs.justification && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Statutory Justification & Mandate:</span>
                      {selectedWs.justification}
                    </div>
                  )}

                  {/* Sub-Navigation Tabs */}
                  <div className="flex border-b border-slate-200 gap-1 text-xs">
                    <button
                      onClick={() => setWsTab('tasks')}
                      className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                        wsTab === 'tasks'
                          ? 'border-[#092D62] text-[#092D62]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Task Roster ({selectedWs.tasks?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setWsTab('cases')}
                      className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                        wsTab === 'cases'
                          ? 'border-[#092D62] text-[#092D62]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Linked Dossiers ({selectedWs.linked_case_ids?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setWsTab('participants')}
                      className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                        wsTab === 'participants'
                          ? 'border-[#092D62] text-[#092D62]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Bureau Officers ({selectedWs.participants?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setWsTab('meetings')}
                      className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                        wsTab === 'meetings'
                          ? 'border-[#092D62] text-[#092D62]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Meeting Proceedings ({selectedWs.meeting_records?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setWsTab('decisions')}
                      className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                        wsTab === 'decisions'
                          ? 'border-[#092D62] text-[#092D62]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Consensus Orders</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: TASKS */}
                  {wsTab === 'tasks' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">
                          Allocated Cross-Bureau Field Tasks
                        </span>
                        <button
                          onClick={() => setIsTaskModalOpen(true)}
                          className="px-2.5 py-1 bg-[#092D62] text-white rounded text-xs font-medium hover:bg-[#072147] flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Task</span>
                        </button>
                      </div>

                      {(!selectedWs.tasks || selectedWs.tasks.length === 0) ? (
                        <div className="bg-slate-50 p-6 rounded text-center text-xs text-slate-500 border border-dashed border-slate-300">
                          No tasks created yet. Click "Add Task" to allocate field investigations.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedWs.tasks.map((task) => {
                            const isOverdue = task.status === 'Overdue';
                            const isBlocked = task.status === 'Blocked';
                            return (
                              <div
                                key={task.id}
                                className={`p-3.5 rounded border transition ${
                                  isOverdue
                                    ? 'bg-red-50/50 border-red-200'
                                    : isBlocked
                                    ? 'bg-amber-50/40 border-amber-200'
                                    : task.status === 'Completed'
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-500">
                                        TASK #{task.id}
                                      </span>
                                      <span className="text-xs font-bold text-slate-900">
                                        {task.title}
                                      </span>
                                      <StatusBadge status={task.status} />
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-slate-600">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                                      <span>Bureau: <strong>{task.bureau_code || `Bureau ${task.bureau_id}`}</strong></span>
                                      <span>Assignee: <strong>{task.assigned_to_name || 'Officer'}</strong></span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong>
                                      </span>
                                      <span>Priority: <strong>{task.priority}</strong></span>
                                      {task.depends_on_task_id && (
                                        <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono text-[10px] flex items-center gap-1">
                                          <GitFork className="w-3 h-3" /> Depends on Task #{task.depends_on_task_id}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                                    {task.status !== 'Completed' ? (
                                      <button
                                        onClick={() => handleTaskStatusToggle(task)}
                                        className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800 transition flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Mark Complete</span>
                                      </button>
                                    ) : (
                                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 2: LINKED CASES */}
                  {wsTab === 'cases' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">
                          Associated Institutional Case Files
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Confidential inter-bureau layer (Not public)</span>
                        </div>
                      </div>

                      {(!selectedWs.linked_case_ids || selectedWs.linked_case_ids.length === 0) ? (
                        <div className="bg-slate-50 p-6 rounded text-center text-xs text-slate-500 border border-dashed border-slate-300">
                          No case numbers attached to this workspace.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedWs.linked_case_ids.map((cid) => (
                            <div key={cid} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#092D62]">{cid}</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Synchronized with non-public regulatory case events.
                                </p>
                              </div>
                              <button
                                onClick={() => navigate(`/cases/${cid}`)}
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-white text-slate-700 flex items-center gap-1"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 3: PARTICIPANTS */}
                  {wsTab === 'participants' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">
                          Authorized Bureau Officials
                        </span>
                        <button
                          onClick={() => setIsParticipantModalOpen(true)}
                          className="px-2.5 py-1 bg-[#092D62] text-white rounded text-xs font-medium hover:bg-[#072147] flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Officer</span>
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
                        {selectedWs.participants?.map((p) => {
                          const isOwner = p.officer_id === selectedWs.coordination_owner_id;
                          return (
                            <div key={p.id} className="p-3 bg-white flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {p.officer_name || `Officer #${p.officer_id}`}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded font-semibold">
                                    {p.bureau_code || `Bureau ${p.bureau_id}`}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-medium">
                                    {p.role}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Joined: {new Date(p.joined_at).toLocaleDateString()}
                                </p>
                              </div>

                              {!isOwner && (
                                <button
                                  onClick={() => handleRemoveParticipant(p.officer_id)}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 4: MEETINGS */}
                  {wsTab === 'meetings' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">
                          Chronological Committee Proceedings
                        </span>
                        <button
                          onClick={() => setIsMeetingModalOpen(true)}
                          className="px-2.5 py-1 bg-[#092D62] text-white rounded text-xs font-medium hover:bg-[#072147] flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Record Meeting</span>
                        </button>
                      </div>

                      {(!selectedWs.meeting_records || selectedWs.meeting_records.length === 0) ? (
                        <div className="bg-slate-50 p-6 rounded text-center text-xs text-slate-500 border border-dashed border-slate-300">
                          No joint meetings logged yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedWs.meeting_records.map((m, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-900">
                                  Meeting #{m.meeting_id || idx + 1}: Chaired by {m.chair_name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {new Date(m.meeting_date).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {m.discussion_summary}
                              </p>
                              {m.action_items && m.action_items.length > 0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                                    Agreed Action Items:
                                  </span>
                                  <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5">
                                    {m.action_items.map((act, i) => (
                                      <li key={i}>{act}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 5: CONSENSUS DECISIONS */}
                  {wsTab === 'decisions' && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-slate-700">
                        Official Binding Council Directions
                      </span>

                      {selectedWs.decisions ? (
                        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                            <Scale className="w-4 h-4 text-emerald-700" />
                            <span>Joint Disposal Consensus Formally Recorded</span>
                          </div>
                          <p className="text-xs text-emerald-950 leading-relaxed font-mono whitespace-pre-wrap">
                            {selectedWs.decisions}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded text-center text-xs text-slate-500 border border-dashed border-slate-300">
                          Workspace is currently active. Binding consensus will appear here upon official conclusion.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-12 rounded border border-slate-200 text-center text-xs text-slate-400">
                  Select a coordination workspace from the left panel to review dossiers and allocate tasks.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: OPERATIONS DASHBOARD */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Workspaces</span>
                <p className="text-xl font-bold text-[#061E46] mt-1">{workspaces.length}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Active cross-bureau units</span>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Tasks</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{totalTasks}</p>
                <span className="text-[10px] text-slate-500 font-medium">Across all bureaus</span>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Pending Tasks</span>
                <p className="text-xl font-bold text-blue-600 mt-1">{pendingTasks}</p>
                <span className="text-[10px] text-blue-500 font-medium">Under active inquiry</span>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">DAG Blocked</span>
                <p className="text-xl font-bold text-amber-600 mt-1">{blockedTasks}</p>
                <span className="text-[10px] text-amber-600 font-medium">Awaiting prerequisites</span>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Completed Tasks</span>
                <p className="text-xl font-bold text-emerald-600 mt-1">{completedTasks}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Verified deliverables</span>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Overdue (SLA)</span>
                <p className="text-xl font-bold text-red-600 mt-1">{overdueTasks}</p>
                <span className="text-[10px] text-red-500 font-medium">Action escalated</span>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Task Status Breakdown (Cross-Bureau)
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskStatusData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#092D62" radius={[0, 4, 4, 0]}>
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  SLA Health & Escalations Overview
                </h3>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded text-xs">
                    <span className="font-medium text-red-900">Overdue Milestones Breaching SLA:</span>
                    <strong className="text-red-700 font-mono text-sm">{overdueTasks}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded text-xs">
                    <span className="font-medium text-amber-900">Approaching Deadlines (&lt; 48 Hours):</span>
                    <strong className="text-amber-700 font-mono text-sm">{escalationSummary?.approaching_deadlines || 0}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                    <span className="font-medium text-blue-900">Unresolved Inter-Bureau Conflicts (&gt; 72 Hours):</span>
                    <strong className="text-blue-700 font-mono text-sm">{escalationSummary?.unresolved_conflicts_72h || 0}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                    <span className="font-medium text-slate-800">Stalled Workspaces with Inactivity (&gt; 14 Days):</span>
                    <strong className="text-slate-800 font-mono text-sm">{escalationSummary?.stalled_workspaces_14d || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: KANBAN & DAG DEPENDENCY BOARD */}
        {activeView === 'kanban' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sequential DAG Dependency Board
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tasks automatically progress through stages as prerequisite field inspections are completed.
                </p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#092D62] text-white rounded text-xs font-medium hover:bg-[#072147] flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Task to Board</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Column 1: Blocked by Prerequisite */}
              <div className="bg-amber-50/50 border border-amber-200 rounded p-3 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-amber-200">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Blocked (Prerequisite Pending)</span>
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold font-mono">
                    {workspaces.flatMap((w) => w.tasks || []).filter((t) => t.status === 'Blocked').length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {workspaces
                    .flatMap((w) => w.tasks || [])
                    .filter((t) => t.status === 'Blocked')
                    .map((t) => (
                      <div key={t.id} className="p-2.5 bg-white border border-amber-300 rounded shadow-sm text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{t.title}</span>
                        <span className="text-[11px] text-slate-500 block">Bureau: {t.bureau_code}</span>
                        {t.depends_on_task_id && (
                          <span className="text-[10px] text-amber-800 font-mono bg-amber-50 px-1 py-0.5 rounded block">
                            Locked until Task #{t.depends_on_task_id} completes
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: Pending / Ready */}
              <div className="bg-blue-50/50 border border-blue-200 rounded p-3 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>Pending Execution</span>
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold font-mono">
                    {workspaces.flatMap((w) => w.tasks || []).filter((t) => t.status === 'Pending').length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {workspaces
                    .flatMap((w) => w.tasks || [])
                    .filter((t) => t.status === 'Pending')
                    .map((t) => (
                      <div key={t.id} className="p-2.5 bg-white border border-blue-200 rounded shadow-sm text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{t.title}</span>
                        <span className="text-[11px] text-slate-500 block">Officer: {t.assigned_to_name}</span>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                          <span className="font-semibold text-slate-600">{t.priority}</span>
                          <button
                            onClick={() => handleTaskStatusToggle(t)}
                            className="text-[#092D62] font-semibold hover:underline"
                          >
                            Complete →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 3: Overdue (SLA Breached) */}
              <div className="bg-red-50/50 border border-red-200 rounded p-3 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-red-200">
                  <span className="text-xs font-bold text-red-950 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>Overdue (SLA Breached)</span>
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-bold font-mono">
                    {workspaces.flatMap((w) => w.tasks || []).filter((t) => t.status === 'Overdue').length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {workspaces
                    .flatMap((w) => w.tasks || [])
                    .filter((t) => t.status === 'Overdue')
                    .map((t) => (
                      <div key={t.id} className="p-2.5 bg-white border border-red-300 rounded shadow-sm text-xs space-y-1">
                        <span className="font-bold text-red-900 block">{t.title}</span>
                        <span className="text-[11px] text-slate-500 block">Due: {new Date(t.due_date).toLocaleDateString()}</span>
                        <div className="flex justify-between items-center pt-1 border-t border-red-100 text-[10px]">
                          <span className="text-red-700 font-bold uppercase">Escalated</span>
                          <button
                            onClick={() => handleTaskStatusToggle(t)}
                            className="text-emerald-700 font-semibold hover:underline"
                          >
                            Resolve Now
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 4: Completed */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded p-3 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified Completed</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold font-mono">
                    {workspaces.flatMap((w) => w.tasks || []).filter((t) => t.status === 'Completed').length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {workspaces
                    .flatMap((w) => w.tasks || [])
                    .filter((t) => t.status === 'Completed')
                    .map((t) => (
                      <div key={t.id} className="p-2.5 bg-white border border-emerald-200 rounded shadow-sm text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{t.title}</span>
                        <span className="text-[11px] text-emerald-700 font-medium block">
                          ✓ Deliverable verified
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: SLA ESCALATION CENTER */}
        {activeView === 'escalations' && (
          <div className="bg-white rounded border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>SLA Escalation Center & Bottleneck Triage</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated background escalation sweep identifying overdue field tasks, uncoordinated directives, and inactive workspaces.
                </p>
              </div>
              <button
                onClick={handleTriggerEscalationScan}
                disabled={isScanningEscalations}
                className="px-4 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningEscalations ? 'animate-spin' : ''}`} />
                <span>Run SLA Sweep</span>
              </button>
            </div>

            <div className="space-y-3">
              {overdueTasks === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">No overdue tasks detected.</p>
                  <p className="text-[11px] mt-0.5">All cross-bureau milestones are currently within statutory timelines.</p>
                </div>
              ) : (
                workspaces
                  .flatMap((w) => (w.tasks || []).map((t) => ({ ...t, wsTitle: w.title })))
                  .filter((t) => t.status === 'Overdue')
                  .map((task) => (
                    <div key={task.id} className="p-4 bg-red-50/70 border border-red-200 rounded flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-red-800 font-bold bg-red-100 px-1.5 py-0.2 rounded">
                            OVERDUE SLA
                          </span>
                          <span className="text-xs font-bold text-slate-900">{task.title}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-600 font-medium">{task.wsTitle}</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Accountable Officer: <strong>{task.assigned_to_name}</strong> | Bureau: <strong>{task.bureau_code}</strong> | Due Date: <strong>{new Date(task.due_date).toLocaleDateString()}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleTaskStatusToggle(task as any)}
                        className="px-3.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800"
                      >
                        Resolve Milestone
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* MODALS */}
        <CreateWorkspaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          initialCaseId={urlLinkCases || undefined}
          onCreated={(newWs) => {
            setWorkspaces([newWs, ...workspaces]);
            setSelectedWs(newWs);
          }}
        />

        {selectedWs && (
          <>
            <TaskDependencyModal
              isOpen={isTaskModalOpen}
              onClose={() => setIsTaskModalOpen(false)}
              workspaceId={selectedWs.id}
              existingTasks={selectedWs.tasks || []}
              onTaskCreated={() => handleRefreshWorkspace(selectedWs.id)}
            />

            <WorkspaceResolutionModal
              isOpen={isResolveModalOpen}
              onClose={() => setIsResolveModalOpen(false)}
              workspaceId={selectedWs.id}
              workspaceTitle={selectedWs.title}
              onResolved={() => handleRefreshWorkspace(selectedWs.id)}
            />

            <MeetingMinutesModal
              isOpen={isMeetingModalOpen}
              onClose={() => setIsMeetingModalOpen(false)}
              workspaceId={selectedWs.id}
              workspaceTitle={selectedWs.title}
              onLogged={() => handleRefreshWorkspace(selectedWs.id)}
            />

            <AddParticipantModal
              isOpen={isParticipantModalOpen}
              onClose={() => setIsParticipantModalOpen(false)}
              workspaceId={selectedWs.id}
              onAdded={() => handleRefreshWorkspace(selectedWs.id)}
            />
          </>
        )}
      </div>
    </div>
  );
};
