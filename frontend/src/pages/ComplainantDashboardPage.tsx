import React, { useState, useEffect, useCallback } from 'react';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import { api } from '../services/api';
import { ComplainantCaseItem, ComplainantCaseDetail } from '../types';
import {
  FileText, PlusCircle, CheckCircle2, Clock, AlertTriangle, Building2,
  Calendar, ChevronDown, ChevronUp, Send, X, RefreshCw
} from 'lucide-react';

export const ComplainantDashboardPage: React.FC = () => {
  const { complainant } = useComplainantAuth();

  const [cases, setCases] = useState<ComplainantCaseItem[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Milestone detail expansion state
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<ComplainantCaseDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // New Grievance Form State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<number | ''>('');
  const [category, setCategory] = useState('Fee Overcharging & Refund Denial');
  const [description, setDescription] = useState('');
  const [isFiling, setIsFiling] = useState(false);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [casesRes, instRes] = await Promise.all([
        api.getComplainantCases(),
        api.getInstitutions()
      ]);
      setCases(casesRes || []);
      setInstitutions(instRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve grievances from citizen registry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpandMilestones = async (caseId: string) => {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      setCaseDetail(null);
      return;
    }

    setExpandedCaseId(caseId);
    setIsLoadingDetail(true);
    try {
      const detail = await api.getComplainantCaseDetail(caseId);
      setCaseDetail(detail);
    } catch (err: any) {
      console.error('Milestone fetch failed', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleFileGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId || !description.trim()) {
      return;
    }

    setIsFiling(true);
    try {
      const res = await api.fileComplainantCase({
        institution_id: Number(selectedInstId),
        category,
        description: description.trim()
      });
      setFileSuccess(`Grievance successfully submitted! Case ID: ${res.id}`);
      setDescription('');
      setSelectedInstId('');
      setShowFileModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsFiling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disposed':
      case 'Resolved':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">Disposed</span>;
      case 'Under Process':
        return <span className="bg-blue-100 text-[#092D62] border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">Under Process</span>;
      case 'Escalated':
        return <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2 py-0.5 rounded">Escalated</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">Pending Scrutiny</span>;
    }
  };

  const pendingCount = cases.filter(c => c.status === 'Pending').length;
  const inProgressCount = cases.filter(c => c.status === 'Under Process').length;
  const resolvedCount = cases.filter(c => c.status === 'Disposed' || c.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      {/* Citizen Header */}
      <ComplainantHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* Banner with Welcome & Actions */}
        <div className="bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#0D3875] text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#FFB900] uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded">
              Citizen Tracking Console
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Welcome, {complainant?.full_name || 'Citizen'}
            </h1>
            <p className="text-xs text-slate-200">
              Track active inquiries, official milestone determinations, and submit new grievances to AICTE bureaus.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFileModal(true)}
              className="btn-3d-amber px-4 py-2.5 rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>File New Grievance</span>
            </button>

            <button
              onClick={loadData}
              className="p-2.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {fileSuccess && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-300 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{fileSuccess}</span>
            </div>
            <button
              onClick={() => setFileSuccess(null)}
              className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Complaints</span>
            <div className="text-2xl font-black text-[#061E46]">{cases.length}</div>
            <p className="text-[10px] text-slate-400">Total filed under this account</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Scrutiny</span>
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
            <p className="text-[10px] text-slate-400">Awaiting bureau allocation</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">In Process</span>
            <div className="text-2xl font-black text-[#092D62]">{inProgressCount}</div>
            <p className="text-[10px] text-slate-400">Under active bureau inquiry</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Resolved / Disposed</span>
            <div className="text-2xl font-black text-emerald-600">{resolvedCount}</div>
            <p className="text-[10px] text-slate-400">Final determinations issued</p>
          </div>
        </div>

        {/* Complaints Listing */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#061E46] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E5AA8]" />
              <span>My Grievance Tracking Records</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Showing {cases.length} records
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mx-auto" />
              <p className="text-xs text-slate-500">Loading grievance records...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#092D62] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-[#1E5AA8]" />
              </div>
              <h3 className="text-sm font-bold text-[#061E46]">No Grievances Filed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not registered any complaints yet. Click &quot;File New Grievance&quot; above to submit an institutional petition to AICTE.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cases.map((c) => {
                const isExpanded = expandedCaseId === c.id;

                return (
                  <div key={c.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#092D62] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {c.id}
                          </span>
                          {getStatusBadge(c.status)}
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Assigned: {c.bureau_code} Bureau
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#061E46] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.institution_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            ({c.permanent_id})
                          </span>
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          <strong className="text-slate-700">{c.category}:</strong> {c.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Filed: {new Date(c.date_received).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            SLA Target: {new Date(c.prescribed_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {c.last_action && (
                            <span className="text-slate-600">
                              Latest: <em>{c.last_action}</em>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => toggleExpandMilestones(c.id)}
                          className="btn-3d-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span>{isExpanded ? 'Hide Milestones' : 'Track Milestones'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Milestone Timeline Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 bg-[#F4F6F9] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 space-y-3">
                        <h4 className="text-xs font-bold text-[#061E46] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#1E5AA8]" />
                          <span>Official Redressal Milestones</span>
                        </h4>

                        {isLoadingDetail ? (
                          <div className="py-4 text-center text-xs text-slate-500">
                            Loading official timeline...
                          </div>
                        ) : caseDetail && caseDetail.events && caseDetail.events.length > 0 ? (
                          <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-300 pl-7">
                            {caseDetail.events.map((ev, i) => (
                              <div key={i} className="relative space-y-0.5">
                                <div className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-[#092D62] border-2 border-white shadow-xs" />
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-[#061E46]">{ev.event_type}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(ev.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{ev.remarks}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No additional milestones recorded yet. Bureau review in progress.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: File New Grievance */}
        {showFileModal && (
          <div className="fixed inset-0 z-50 bg-[#061E46]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#FFB900]" />
                  <h3 className="text-base font-bold text-[#061E46]">Submit New Institutional Grievance</h3>
                </div>
                <button
                  onClick={() => setShowFileModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFileGrievance} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#061E46] mb-1">
                    Select AICTE Approved Institution <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  >
                    <option value="">-- Choose Institution --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.official_name} ({inst.permanent_id}) — {inst.city}, {inst.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#061E46] mb-1">
                    Grievance Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  >
                    <option value="Fee Overcharging & Refund Denial">Fee Overcharging & Refund Denial</option>
                    <option value="Anti-Ragging Non-Compliance">Anti-Ragging Non-Compliance</option>
                    <option value="Faculty Irregularity & Biometric Deficit">Faculty Irregularity & Biometric Deficit</option>
                    <option value="Certificate & Document Withholding">Certificate & Document Withholding</option>
                    <option value="Infrastructure Deficit & Lab Equipment Shortage">Infrastructure Deficit & Lab Equipment Shortage</option>
                    <option value="Admission Irregularity & Capitation Fee">Admission Irregularity & Capitation Fee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#061E46] mb-1">
                    Factual Description & Allegation Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={20}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide detailed factual narrative including dates, program name, and specific violations..."
                    className="w-full text-xs p-3 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                  <span className="text-[10px] text-slate-400 block text-right">
                    Minimum 20 characters required. Factual evidence will be requested during inquiry.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFileModal(false)}
                    className="px-4 py-2 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isFiling}
                    className="btn-3d-amber px-5 py-2.5 rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isFiling ? 'Registering Grievance...' : 'Submit to AICTE'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ComplainantDashboardPage;
