import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  OfficerComplaintItem, OfficerComplaintMetadata, Institution
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Search, Filter, Clock, Building2, RefreshCw,
  FileCheck, AlertCircle, Calendar, ChevronLeft, ChevronRight,
  Shield, Paperclip, ArrowUpDown, CheckCircle2, XCircle
} from 'lucide-react';

export const OfficerComplaintInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // State
  const [complaints, setComplaints] = useState<OfficerComplaintItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metadata & Lookups
  const [metadata, setMetadata] = useState<OfficerComplaintMetadata | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [institutionIdFilter, setInstitutionIdFilter] = useState<string>(searchParams.get('institution_id') || '');
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState<string>(searchParams.get('date_to') || '');
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(searchParams.get('unassigned_only') === 'true');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort_by') || 'date_received');
  const [sortOrder, setSortOrder] = useState<string>(searchParams.get('order') || 'desc');

  // Load Metadata & Institutions on mount
  useEffect(() => {
    api.getOfficerComplaintMetadata()
      .then(setMetadata)
      .catch((err) => console.warn('Could not load officer complaint metadata:', err));

    api.getInstitutions()
      .then(setInstitutions)
      .catch((err) => console.warn('Could not load institutions list:', err));
  }, []);

  // Synchronize Tab with Filters
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setCurrentPage(1);

    if (tabKey === 'all') {
      setStatusFilter('');
      setUnassignedOnly(false);
    } else if (tabKey === 'submitted') {
      setStatusFilter('Submitted');
      setUnassignedOnly(false);
    } else if (tabKey === 'unassigned') {
      setStatusFilter('Submitted');
      setUnassignedOnly(true);
    } else if (tabKey === 'under_review') {
      setStatusFilter('Under Review');
      setUnassignedOnly(false);
    } else if (tabKey === 'info_required') {
      setStatusFilter('Additional Information Required');
      setUnassignedOnly(false);
    } else if (tabKey === 'in_progress') {
      setStatusFilter('In Progress');
      setUnassignedOnly(false);
    } else if (tabKey === 'rejected') {
      setStatusFilter('Rejected');
      setUnassignedOnly(false);
    }
  };

  // Fetch Complaints
  const fetchComplaints = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getOfficerComplaints({
        q: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        institution_id: institutionIdFilter ? Number(institutionIdFilter) : undefined,
        unassigned_only: unassignedOnly,
        citizen_only: true,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
        order: sortOrder,
        page: currentPage,
        limit: pageSize
      });

      setComplaints(res.items);
      setTotalCount(res.total);
      setTotalPages(res.pages);
    } catch (err: any) {
      console.error('Failed to fetch officer complaints:', err);
      setErrorMessage(err.message || 'Failed to connect to AICTE intake repository. Please verify your officer credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // Sync URL Search Params
    const params: Record<string, string> = {};
    if (activeTab !== 'all') params.tab = activeTab;
    if (searchQuery) params.q = searchQuery;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (institutionIdFilter) params.institution_id = institutionIdFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (unassignedOnly) params.unassigned_only = 'true';
    if (sortBy !== 'date_received') params.sort_by = sortBy;
    if (sortOrder !== 'desc') params.order = sortOrder;
    if (currentPage > 1) params.page = String(currentPage);

    setSearchParams(params, { replace: true });
  }, [
    activeTab,
    statusFilter,
    categoryFilter,
    institutionIdFilter,
    dateFrom,
    dateTo,
    unassignedOnly,
    sortBy,
    sortOrder,
    currentPage,
    pageSize
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setInstitutionIdFilter('');
    setDateFrom('');
    setDateTo('');
    setUnassignedOnly(false);
    setSortBy('date_received');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Status breakdown tabs definition
  const tabs = [
    { key: 'all', label: 'All Complaints' },
    { key: 'submitted', label: 'New Submitted' },
    { key: 'unassigned', label: 'Pending Review (Unassigned)' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'info_required', label: 'Clarification Requested' },
    { key: 'in_progress', label: 'Accepted / In Progress' },
    { key: 'rejected', label: 'Statutorily Rejected' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Official Government Header */}
      <div className="mb-6 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-[#092D62] text-white rounded-xs">
                AICTE Official Portal
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Public Grievance Redressal Cell (PGRC) & Intake Gateway
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#092D62] tracking-tight">
              Officer Complaint Intake & Scrutiny Queue
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Statutory preliminary scrutiny, bureau allocation, and canonical case docket integration for citizen-lodged institutional grievances.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user?.full_name || 'Authorized Officer'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {user?.role?.replace('_', ' ')} • {user?.bureau_code || 'PGRC'}
              </p>
            </div>
            <button
              onClick={() => fetchComplaints()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#092D62] text-white hover:bg-[#123C7B] text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              title="Refresh intake records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Lifecycle Navigation Tabs (Feature 1) */}
        <div className="mt-5 border-t border-slate-200 pt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#092D62] text-[#FFB900] shadow-xs ring-1 ring-[#061E46]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Panel (Feature 2) */}
      <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by complaint reference, title, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] focus:border-transparent outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Institution Filter */}
            <div className="md:col-span-4">
              <select
                value={institutionIdFilter}
                onChange={(e) => {
                  setInstitutionIdFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50 focus:bg-white"
              >
                <option value="">All Technical Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.official_name} ({inst.permanent_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50 focus:bg-white"
              >
                <option value="">All Statutory Categories</option>
                {(metadata?.categories || []).map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters: Date Range, Status & Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
            {/* Status Filter */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50"
              >
                <option value="">All Statuses</option>
                {(metadata?.statuses || [
                  'Submitted', 'Under Review', 'In Progress',
                  'Additional Information Required', 'Resolved', 'Closed', 'Rejected'
                ]).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Date Range: From */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50"
                />
              </div>
            </div>

            {/* Date Range: To */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50"
                />
              </div>
            </div>

            {/* Sort Field & Order */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sort By
              </label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none bg-slate-50"
                >
                  <option value="date_received">Date Received</option>
                  <option value="prescribed_deadline">Deadline</option>
                  <option value="priority">Priority Score</option>
                  <option value="id">Reference ID</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700"
                  title={`Order: ${sortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex items-end gap-1.5">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 bg-[#092D62] text-white hover:bg-[#123C7B] text-xs font-bold rounded cursor-pointer transition-colors shadow-xs"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-1.5 px-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer transition-colors"
                title="Reset all filters"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Feedback Banner (Feature 7) */}
      {errorMessage && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-900">Communication Error</h4>
            <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => fetchComplaints()}
            className="text-xs font-bold text-red-800 underline hover:text-red-950 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Complaint Grievance Table (Feature 1 & 2) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Table Header Meta */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Intake Grievance Registry
            </span>
            <span className="text-[11px] bg-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-full">
              {totalCount} Total
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white outline-none"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mb-3" />
            <p className="text-xs font-semibold">Querying AICTE Complaint Intake Records...</p>
          </div>
        ) : complaints.length === 0 ? (
          /* Empty State (Feature 7) */
          <div className="py-16 text-center px-4">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Complaints Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are currently no citizen complaints matching the selected filter criteria or awaiting review in this docket.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-1.5 text-xs font-bold text-[#092D62] bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Complaints Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Complaint Reference</th>
                  <th className="py-3 px-4">Subject & Category</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Complainant</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Allocation</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {complaints.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Reference */}
                      <td className="py-3 px-4 align-top">
                        <button
                          onClick={() => navigate(`/complaint-intake/${c.id}`)}
                          className="font-mono font-bold text-[#092D62] hover:text-[#FFB900] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>{c.id}</span>
                        </button>
                        {c.documents_count > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1" title={`${c.documents_count} attached document(s)`}>
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            <span>{c.documents_count} doc{c.documents_count > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </td>

                      {/* Subject & Category */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.category}
                        </div>
                        {c.subcategory && (
                          <div className="text-[10px] text-slate-400 italic">
                            Sub: {c.subcategory}
                          </div>
                        )}
                      </td>

                      {/* Institution */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1" title={c.institution_name}>
                          {c.institution_name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.permanent_id}</span>
                          <span>•</span>
                          <span>{c.district}, {c.state}</span>
                        </div>
                      </td>

                      {/* Complainant */}
                      <td className="py-3 px-4 align-top">
                        <div className="text-xs font-semibold text-slate-700">
                          {c.complainant_masked || 'CIT-ANON'}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                          {c.complainant_type || 'Student'}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="text-xs text-slate-800 font-medium">
                          {new Date(c.date_received).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(c.date_received).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <StatusBadge status={c.status} type="status" />
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <StatusBadge status={c.priority} type="priority" />
                      </td>

                      {/* Allocation */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {c.assigned_officer_name ? (
                          <div className="text-xs font-medium text-slate-800">
                            {c.assigned_officer_name}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/complaint-intake/${c.id}`)}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#092D62] hover:bg-[#123C7B] rounded shadow-xs cursor-pointer transition-colors"
                        >
                          Scrutinize
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar (Feature 2) */}
        {!isLoading && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-600">
              Showing page <span className="font-bold">{currentPage}</span> of{' '}
              <span className="font-bold">{totalPages}</span> ({totalCount} total grievances)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum: number;
                if (totalPages <= 5) {
                  pNum = i + 1;
                } else if (currentPage <= 3) {
                  pNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pNum = totalPages - 4 + i;
                } else {
                  pNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 text-xs font-bold rounded cursor-pointer ${
                      currentPage === pNum
                        ? 'bg-[#092D62] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-slate-700"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerComplaintInboxPage;

