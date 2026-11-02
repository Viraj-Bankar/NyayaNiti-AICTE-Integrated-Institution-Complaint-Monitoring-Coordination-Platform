import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import { GrievanceReceiptModal } from '../components/complainant/GrievanceReceiptModal';
import { api } from '../services/api';
import { ComplainantCaseItem, ComplainantReceipt } from '../types';
import {
  FileText, PlusCircle, CheckCircle2, Clock, AlertTriangle, Building2,
  Calendar, RefreshCw, ArrowRight, Eye, Printer, Shield, ArrowUpRight
} from 'lucide-react';

export const ComplainantDashboardPage: React.FC = () => {
  const { complainant } = useComplainantAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<ComplainantCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal state
  const [activeReceipt, setActiveReceipt] = useState<ComplainantReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getComplainantComplaints();
      setCases(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve your grievance records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
          Info Required
        </span>
      );
    }
    if (s.includes('disposed') || s.includes('resolved') || s.includes('closed')) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Resolved / Disposed
        </span>
      );
    }
    if (s.includes('in progress') || s.includes('hearing') || s.includes('under process')) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-[#092D62] border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          In Progress
        </span>
      );
    }
    if (s.includes('under review') || s.includes('scrutiny') || s.includes('allocated')) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <Clock className="w-3 h-3 text-purple-600" />
          Under Review
        </span>
      );
    }
    if (s.includes('rejected')) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
        <Clock className="w-3 h-3 text-amber-600" />
        Submitted
      </span>
    );
  };

  // Exact 5 Required Statistics (computed dynamically from real backend cases)
  const totalSubmitted = cases.length;
  const submittedCount = cases.filter(c => c.status === 'Submitted').length;
  const underReviewCount = cases.filter(c => {
    const s = (c.status || '').toLowerCase();
    return s.includes('under review') || s.includes('pending') || s.includes('scrutiny');
  }).length;
  const inProgressCount = cases.filter(c => {
    const s = (c.status || '').toLowerCase();
    return s.includes('in progress') || s.includes('under process') || s.includes('hearing');
  }).length;
  const resolvedCount = cases.filter(c => {
    const s = (c.status || '').toLowerCase();
    return s.includes('resolved') || s.includes('disposed') || s.includes('closed');
  }).length;

  // Recent complaints (latest 5)
  const recentComplaints = cases.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      <ComplainantHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* 1. Welcome Section with Complainant Name & Action CTAs */}
        <div className="bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#0D3875] text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-4 border-[#FFB900]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-semibold text-[#FFB900]">
              <Shield className="w-3.5 h-3.5" />
              <span>Public Grievance Redressal Portal • AICTE PGRC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {complainant?.full_name || 'Citizen'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              Track the statutory redressal progression of your institutional complaints, submit new grievances, and access official AICTE determinations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              to="/complainant/submit"
              className="btn-3d-amber px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Complaint</span>
            </Link>

            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors border border-white/10"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-300 text-xs flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2 - 6. Exact 5 Statistical Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card 1: Total complaints submitted */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Complaints
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#061E46]">
              {totalSubmitted}
            </div>
            <p className="text-[10px] text-slate-400">Total institutional petitions filed</p>
          </div>

          {/* Card 2: Submitted complaints count */}
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-1 bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Submitted
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {submittedCount}
            </div>
            <p className="text-[10px] text-slate-400">Awaiting bureau intake verification</p>
          </div>

          {/* Card 3: Under Review count */}
          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs space-y-1 bg-purple-50/20">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Under Review
            </span>
            <div className="text-2xl sm:text-3xl font-black text-purple-600">
              {underReviewCount}
            </div>
            <p className="text-[10px] text-slate-400">Preliminary scrutiny in progress</p>
          </div>

          {/* Card 4: In Progress count */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1 bg-blue-50/20">
            <span className="text-[11px] font-bold text-[#1E5AA8] uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#092D62]">
              {inProgressCount}
            </div>
            <p className="text-[10px] text-slate-400">Under active bureau inquiry & notice</p>
          </div>

          {/* Card 5: Resolved count */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1 bg-emerald-50/20 col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Resolved / Disposed
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {resolvedCount}
            </div>
            <p className="text-[10px] text-slate-400">Final determinations communicated</p>
          </div>
        </div>

        {/* 7 - 12. Recent Complaints Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E5AA8]" />
              <h2 className="text-sm font-bold text-[#061E46]">Recent Institutional Complaints</h2>
              <span className="text-xs text-slate-400 font-mono ml-2">
                (Latest {recentComplaints.length} of {totalSubmitted})
              </span>
            </div>

            <Link
              to="/complainant/complaints"
              className="text-xs font-bold text-[#1E5AA8] hover:text-[#092D62] flex items-center gap-1 transition-colors"
            >
              <span>View All Complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mx-auto" />
              <p className="text-xs text-slate-500">Retrieving grievance records from AICTE registry...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-[#092D62] flex items-center justify-center mx-auto border border-blue-100">
                <FileText className="w-7 h-7 text-[#1E5AA8]" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-[#061E46]">No Grievances Submitted Yet</h3>
                <p className="text-xs text-slate-500">
                  You have not registered any institutional petitions. Click below to file a formal complaint with AICTE.
                </p>
              </div>
              <Link
                to="/complainant/submit"
                className="btn-3d-amber px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Your First Grievance</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Reference No.</th>
                    <th className="py-3 px-4">Category & Subject</th>
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 8. Complaint reference number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#092D62] whitespace-nowrap">
                        <Link
                          to={`/complainant/complaints/${c.id}`}
                          className="hover:underline flex items-center gap-1 group"
                        >
                          <span>{c.id}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#092D62]" />
                        </Link>
                      </td>

                      {/* 9. Complaint category & title */}
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

                      {/* 10. Institution name */}
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

                      {/* 11. Submission date */}
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

                      {/* 12. Current status indicator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenReceipt(c.id)}
                            disabled={isLoadingReceipt}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 transition-colors"
                            title="Print Acknowledgment Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/complainant/complaints/${c.id}`}
                            className="btn-3d-white px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3 h-3 text-[#1E5AA8]" />
                            <span>Track</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default ComplainantDashboardPage;