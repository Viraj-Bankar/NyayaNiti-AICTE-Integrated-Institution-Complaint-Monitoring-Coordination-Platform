import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import { GrievanceReceiptModal } from '../components/complainant/GrievanceReceiptModal';
import { api } from '../services/api';
import {
  ComplainantCaseItem,
  ComplainantCategoryItem,
  ComplainantReceipt
} from '../types';
import {
  FileText, PlusCircle, Search, Filter, Calendar, Clock,
  Building2, Eye, Printer, ChevronLeft, ChevronRight,
  RefreshCw, AlertTriangle, CheckCircle2, ArrowUpRight
} from 'lucide-react';

export const ComplaintHistoryPage: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplainantCaseItem[]>([]);
  const [categories, setCategories] = useState<ComplainantCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Receipt Modal state
  const [activeReceipt, setActiveReceipt] = useState<ComplainantReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [casesRes, catsRes] = await Promise.all([
        api.getComplainantComplaints({ sort_order: sortOrder }),
        api.getComplainantCategories()
      ]);
      setComplaints(casesRes || []);
      setCategories(catsRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve complaint history from AICTE registry.');
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Client-side filtering across fields
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // 1. Search query across reference number, title, institution, description
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = c.id.toLowerCase().includes(q);
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchInst = c.institution_name.toLowerCase().includes(q) || c.permanent_id.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        if (!matchRef && !matchTitle && !matchInst && !matchDesc) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        const s = (c.status || '').toLowerCase();
        if (statusFilter === 'Submitted' && s !== 'submitted') return false;
        if (statusFilter === 'Under Review' && !s.includes('under review') && !s.includes('pending') && !s.includes('scrutiny')) return false;
        if (statusFilter === 'In Progress' && !s.includes('in progress') && !s.includes('under process') && !s.includes('hearing')) return false;
        if (statusFilter === 'Additional Info Required' && !s.includes('additional') && !s.includes('clarification')) return false;
        if (statusFilter === 'Resolved' && !s.includes('resolved') && !s.includes('disposed') && !s.includes('closed')) return false;
        if (statusFilter === 'Rejected' && !s.includes('rejected')) return false;
      }

      // 3. Category filter
      if (categoryFilter !== 'ALL') {
        if (c.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(startIndex, startIndex + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  const handleOpenReceipt = async (caseId: string) => {
    setIsLoadingReceipt(true);
    try {
      const receipt = await api.getComplainantReceipt(caseId);
      setActiveReceipt(receipt);
    } catch (err: any) {
      alert(`Unable to generate acknowledgment slip: ${err.message}`);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('additional') || s.includes('clarification') || s.includes('info required')) {
      return (
        <span className="bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
          Info Required
        </span>
      );
    }
    if (s.includes('disposed') || s.includes('resolved') || s.includes('closed')) {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Resolved
        </span>
      );
    }
    if (s.includes('in progress') || s.includes('hearing') || s.includes('under process')) {
      return (
        <span className="bg-blue-100 text-[#092D62] border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          In Progress
        </span>
      );
    }
    if (s.includes('under review') || s.includes('scrutiny') || s.includes('allocated')) {
      return (
        <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-purple-600" />
          Under Review
        </span>
      );
    }
    if (s.includes('rejected')) {
      return (
        <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
        <Clock className="w-3 h-3 text-amber-600" />
        Submitted
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      <ComplainantHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* Banner with Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#061E46]">
              Complaint History & Tracking Registry
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Search, filter, and review milestone determinations for all grievances lodged under your account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/complainant/submit"
              className="btn-3d-amber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Complaint</span>
            </Link>

            <button
              onClick={loadComplaints}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar: Search & Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search reference number (AICTE-PGRC-...), institution, keyword..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#092D62]"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#092D62]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Additional Info Required">Additional Info Required</option>
                <option value="Resolved">Resolved / Disposed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#092D62] truncate"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c, i) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing {filteredComplaints.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredComplaints.length)} of {filteredComplaints.length} records
            </span>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-600">Sort by Date:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="text-xs p-1 rounded border border-slate-300 bg-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCategoryFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-[#1E5AA8] hover:underline font-bold ml-2 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mx-auto" />
              <p className="text-xs text-slate-500">Retrieving complaint history...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">No Matching Complaints Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {complaints.length === 0
                  ? 'You have not submitted any complaints yet. Click "Submit New Complaint" to file a formal petition.'
                  : 'Try modifying your search keywords or adjusting the status/category filters above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Reference No.</th>
                    <th className="py-3 px-4">Subject & Category</th>
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#092D62] whitespace-nowrap">
                        <Link
                          to={`/complainant/complaints/${c.id}`}
                          className="hover:underline flex items-center gap-1 group"
                        >
                          <span>{c.id}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#092D62]" />
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#061E46] block truncate">
                            {c.title || c.category}
                          </span>
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200 inline-block">
                            {c.category}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-800 flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {c.institution_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {c.permanent_id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(c.date_received).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenReceipt(c.id)}
                            disabled={isLoadingReceipt}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 transition-colors"
                            title="Print Statutory Acknowledgment Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/complainant/complaints/${c.id}`}
                            className="btn-3d-white px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3 h-3 text-[#1E5AA8]" />
                            <span>View Details</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredComplaints.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="p-1 rounded border border-slate-300 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Printable Statutory Acknowledgment Slip Modal */}
        <GrievanceReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      </main>
    </div>
  );
};

export default ComplaintHistoryPage;
