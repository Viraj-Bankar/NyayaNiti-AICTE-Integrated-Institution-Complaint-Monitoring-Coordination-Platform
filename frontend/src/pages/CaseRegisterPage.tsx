import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { CaseItem, Institution } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  Search, Filter, PlusCircle, ArrowUpDown, Clock, Building,
  ExternalLink, Download, AlertCircle, ShieldAlert, GitMerge
} from 'lucide-react';

export const CaseRegisterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [bureauFilter, setBureauFilter] = useState(searchParams.get('bureau_id') || '');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue_only') === 'true');
  const [sortBy, setSortBy] = useState('date_received');
  const [order, setOrder] = useState('desc');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(searchParams.get('action') === 'new');
  const [newCaseForm, setNewCaseForm] = useState({
    institution_id: 1,
    complainant_type: 'Student',
    complainant_masked: '',
    category: 'Fee Overcharging & Capitation Fee',
    description: '',
    current_bureau_id: 1,
    priority: 'Medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
    api.getInstitutions().then(setInstitutions).catch(console.error);
  }, [statusFilter, priorityFilter, bureauFilter, overdueOnly, sortBy, order]);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCases({
        q: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        bureau_id: bureauFilter ? Number(bureauFilter) : undefined,
        overdue_only: overdueOnly,
        sort_by: sortBy,
        order: order
      });
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setBureauFilter('');
    setOverdueOnly(false);
    setSortBy('date_received');
    setOrder('desc');
    setSearchParams({});
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseForm.description.trim()) {
      setFormError('Please enter a detailed complaint description.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createCase(newCaseForm);
      setIsCreateModalOpen(false);
      setNewCaseForm({
        institution_id: 1,
        complainant_type: 'Student',
        complainant_masked: '',
        category: 'Fee Overcharging & Capitation Fee',
        description: '',
        current_bureau_id: 1,
        priority: 'Medium'
      });
      navigate(`/cases/${created.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Page Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Official Case Register
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {cases.length} Recorded Complaints
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1">
              Centralized Complaint & Grievance Directory
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Comprehensive repository of institution-related cases across Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-3d-amber px-4 py-2 rounded text-xs tracking-wide flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Complaint</span>
            </button>

            <a
              href={api.getExportCsvUrl()}
              className="btn-3d-white px-3.5 py-2 rounded text-xs tracking-wide font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Case ID (AICTE-RB-2024-XXXX), Institution Name, Permanent ID, or Keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#092D62] text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="btn-3d-navy px-4 py-2 rounded text-xs font-semibold cursor-pointer"
            >
              Search Records
            </button>
          </form>

          {/* Secondary Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Bureau Filter */}
              <select
                value={bureauFilter}
                onChange={(e) => setBureauFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#092D62]"
              >
                <option value="">All Bureaus</option>
                <option value="1">Regulation Bureau (RB)</option>
                <option value="2">Public Grievance Cell (PGRC)</option>
                <option value="3">Approval Bureau</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#092D62]"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Under Process">Under Process</option>
                <option value="Disposed">Disposed</option>
                <option value="Transferred">Transferred</option>
                <option value="Escalated">Escalated</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#092D62]"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Overdue Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                <span>Overdue Only</span>
              </label>
            </div>

            <button
              onClick={handleResetFilters}
              className="text-slate-500 hover:text-[#092D62] text-xs underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Case Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-[#092D62] text-white">
                <tr>
                  <th className="py-3 px-3 font-semibold">Case ID</th>
                  <th className="py-3 px-3 font-semibold">Institution / AICTE Permanent ID</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Bureau</th>
                  <th className="py-3 px-3 font-semibold">Assigned Officer</th>
                  <th className="py-3 px-3 font-semibold">Priority</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Prescribed SLA</th>
                  <th className="py-3 px-3 font-semibold text-center">Inter-Bureau Flags</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      Loading official cases from central database...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No complaints found matching the criteria.</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-[#1E5AA8] underline mt-1 text-xs"
                      >
                        Clear search filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const deadlineDate = new Date(c.prescribed_deadline);
                    const now = new Date();
                    const isOverdue = deadlineDate < now && c.status !== 'Disposed';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Case ID */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            onClick={() => navigate(`/cases/${c.id}`)}
                            className="font-bold text-[#092D62] hover:underline cursor-pointer block"
                          >
                            {c.id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(c.date_received).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Institution Name & ID */}
                        <td className="py-3 px-3 max-w-xs">
                          <span
                            onClick={() => navigate(`/institutions/${c.institution_id}`)}
                            className="font-semibold text-slate-900 hover:text-[#1E5AA8] hover:underline cursor-pointer block truncate"
                            title={c.institution_name}
                          >
                            {c.institution_name}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono border border-slate-200">
                            ID: {c.permanent_id}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 text-slate-700 max-w-[180px] truncate" title={c.category}>
                          <span className="font-medium">{c.category}</span>
                          {c.subcategory && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              {c.subcategory}
                            </span>
                          )}
                        </td>

                        {/* Bureau */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="bg-[#092D62] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {c.bureau_code}
                          </span>
                        </td>

                        {/* Assigned Officer */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                          {c.officer_name || 'Unassigned'}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={c.priority} type="priority" />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={c.status} type="status" />
                        </td>

                        {/* Deadline & Overdue */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className={isOverdue ? 'text-red-700 font-bold' : 'text-slate-700'}>
                            {deadlineDate.toLocaleDateString()}
                          </div>
                          {isOverdue && (
                            <span className="text-[9px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold uppercase inline-block">
                              Overdue
                            </span>
                          )}
                        </td>

                        {/* Inter-Bureau Flags */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {c.overlap_review_status && c.overlap_review_status !== 'None' && (
                              <span
                                onClick={() => navigate('/overlaps')}
                                className="cursor-pointer"
                                title={`Overlap status: ${c.overlap_review_status}`}
                              >
                                <StatusBadge status={c.overlap_review_status} type="overlap" />
                              </span>
                            )}
                            {c.action_conflict_status && c.action_conflict_status !== 'None' && (
                              <span
                                onClick={() => navigate('/action-conflicts')}
                                className="cursor-pointer"
                                title={`Action Conflict: ${c.action_conflict_status}`}
                              >
                                <StatusBadge status={c.action_conflict_status} type="conflict" />
                              </span>
                            )}
                            {c.overlap_review_status === 'None' && c.action_conflict_status === 'None' && (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </div>
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/cases/${c.id}`)}
                            className="bg-[#092D62] text-white hover:bg-[#123C7B] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                          >
                            View Case
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Register New Institutional Grievance */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Register New Institutional Complaint"
          subtitle="All India Council for Technical Education — Central Grievance Ingestion"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCreateCase} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-800 p-2.5 rounded border border-red-200 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Institution *</label>
                <select
                  value={newCaseForm.institution_id}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, institution_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                  required
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name} ({inst.permanent_id}) - {inst.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Bureau / Cell *</label>
                <select
                  value={newCaseForm.current_bureau_id}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, current_bureau_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                  required
                >
                  <option value={1}>Regulation Bureau (RB)</option>
                  <option value={2}>Public Grievance Redressal Cell (PGRC)</option>
                  <option value={3}>Approval Process Bureau</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Complainant Category *</label>
                <select
                  value={newCaseForm.complainant_type}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, complainant_type: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Student">Student / Enrolled Scholar</option>
                  <option value="Parent">Parent / Guardian</option>
                  <option value="Faculty">Faculty / Staff Member</option>
                  <option value="Anonymous">Anonymous / Whistleblower</option>
                  <option value="Public">General Citizen / Public</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Grievance Subject / Category *</label>
                <select
                  value={newCaseForm.category}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, category: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Fee Overcharging & Capitation Fee">Fee Overcharging & Capitation Fee</option>
                  <option value="Faculty Salary Non-Payment">Faculty Salary Non-Payment & 7th CPC Violation</option>
                  <option value="Anti-Ragging Compliance Failure">Anti-Ragging Compliance Failure</option>
                  <option value="Unapproved Course & False Affiliation">Unapproved Course & False Affiliation</option>
                  <option value="Library & Infrastructure Deficiency">Library & Infrastructure Deficiency</option>
                  <option value="Admission Irregularity">Admission Irregularity & Quota Violation</option>
                  <option value="General Regulatory Non-Compliance">General Regulatory Non-Compliance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Detailed Complaint Description *</label>
              <textarea
                rows={4}
                value={newCaseForm.description}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                placeholder="Provide comprehensive details of allegations, dates, affected courses, and amounts. SBERT AI engine will automatically scan against historical bureau cases upon registration..."
                className="w-full p-2.5 border border-slate-300 rounded text-xs"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Notice: Automatic SBERT semantic matching and action-conflict checks will be executed synchronously.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn-3d-white px-4 py-2 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-3d-amber px-5 py-2 rounded text-xs font-bold disabled:opacity-60"
              >
                {isSubmitting ? 'Registering & Scanning AI Overlaps...' : 'Submit & Register Case'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
