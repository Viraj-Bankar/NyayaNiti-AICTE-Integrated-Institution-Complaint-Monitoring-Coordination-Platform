import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { CorrectiveActionPlan, Institution } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import { CreateCAPModal } from '../components/compliance/CreateCAPModal';
import { SubmitCAPEvidenceModal } from '../components/compliance/SubmitCAPEvidenceModal';
import { VerifyCAPModal } from '../components/compliance/VerifyCAPModal';
import { ReopenCAPModal } from '../components/compliance/ReopenCAPModal';
import {
  AlertOctagon, PlusCircle, Search, Filter, ShieldCheck,
  Clock, AlertTriangle, RotateCcw, CheckCircle2, FileUp,
  RefreshCw, ChevronRight, Download
} from 'lucide-react';

export const CorrectiveActionPlansPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [selectedCAP, setSelectedCAP] = useState<CorrectiveActionPlan | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [capToSubmitEvidence, setCapToSubmitEvidence] = useState<CorrectiveActionPlan | null>(null);
  const [capToVerify, setCapToVerify] = useState<CorrectiveActionPlan | null>(null);
  const [capToReopen, setCapToReopen] = useState<CorrectiveActionPlan | null>(null);

  const bureaus = [
    { id: 1, code: 'APPROVAL', name: 'Approval Bureau' },
    { id: 2, code: 'POLICY_ACAD', name: 'Policy and Academic Planning Bureau' },
    { id: 3, code: 'ADMIN', name: 'Administration Bureau' },
    { id: 4, code: 'FINANCE', name: 'Finance Bureau' },
    { id: 5, code: 'RIFD', name: 'Research, Institutional & Faculty Development' },
    { id: 6, code: 'LEGAL', name: 'Legal Cell' }
  ];

  useEffect(() => {
    loadCAPs();
  }, [statusFilter, priorityFilter]);

  const loadCAPs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [capsData, instsData] = await Promise.all([
        complianceApi.listCAPs({
          status: statusFilter === 'ALL' ? undefined : statusFilter
        }),
        api.getInstitutions().catch(() => [])
      ]);

      setCaps(capsData);
      setInstitutions(instsData);

      if (id) {
        const found = capsData.find((c: CorrectiveActionPlan) => c.id === parseInt(id, 10));
        if (found) setSelectedCAP(found);
      } else if (capsData.length > 0 && !selectedCAP) {
        setSelectedCAP(capsData[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load Corrective Action Plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanOverdue = async () => {
    setIsScanning(true);
    setScanNotice(null);
    try {
      const res = await complianceApi.scanOverdueCAPs();
      setScanNotice(`Audit scan completed: ${res.scanned_count || 0} CAPs evaluated; ${res.updated_to_overdue || 0} transitioned to OVERDUE.`);
      await loadCAPs();
    } catch (err: any) {
      setScanNotice(`Scan error: ${err?.message || 'Failed to complete overdue scan'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredCAPs = caps.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(q) ||
      (c.institution_name && c.institution_name.toLowerCase().includes(q)) ||
      c.identified_gap.toLowerCase().includes(q);
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // KPI counters
  const totalCount = caps.length;
  const activeCount = caps.filter((c) => !['VERIFIED', 'CLOSED', 'CANCELLED'].includes(c.status)).length;
  const submittedCount = caps.filter((c) => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length;
  const closedCount = caps.filter((c) => ['VERIFIED', 'CLOSED'].includes(c.status)).length;
  const overdueCount = caps.filter((c) => c.is_overdue || c.status === 'OVERDUE').length;

  const getStatusBadge = (c: CorrectiveActionPlan) => {
    if (c.status === 'CLOSED' || c.status === 'VERIFIED') {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">VERIFIED / CLOSED</span>;
    }
    if (c.is_overdue || c.status === 'OVERDUE') {
      return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">OVERDUE</span>;
    }
    if (c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW') {
      return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">PROOF SUBMITTED</span>;
    }
    return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">{c.status}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <ComplianceSubNav />

      <div className="max-w-7xl mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
              <span>National Institutional Governance</span>
              <span>/</span>
              <span className="text-[#092D62] font-semibold">Corrective Action Plan Centre</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-[#FFB900]" />
              Institutional Corrective Action Plan (CAP) Lifecycle Manager
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Enforce statutory remediation mandates, track proof submissions, and conduct independent officer verification.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleScanOverdue}
              disabled={isScanning}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan Overdue CAPs</span>
            </button>

            {hasRole(['super_admin', 'bureau_head', 'monitoring_officer', 'authorized_officer']) && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#FFB900]" />
                <span>Issue New CAP</span>
              </button>
            )}
          </div>
        </div>

        {scanNotice && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded p-2.5 text-xs flex items-center justify-between">
            <span>{scanNotice}</span>
            <button onClick={() => setScanNotice(null)} className="text-amber-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Issued CAPs</div>
            <div className="text-xl font-extrabold text-[#092D62] mt-0.5">{totalCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Active / In Progress</div>
            <div className="text-xl font-extrabold text-amber-600 mt-0.5">{activeCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Proofs Submitted</div>
            <div className="text-xl font-extrabold text-blue-600 mt-0.5">{submittedCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Verified & Closed</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{closedCount}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Overdue Breaches</div>
            <div className="text-xl font-extrabold text-red-600 mt-0.5">{overdueCount}</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, institution, or deficiency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">Issued / In Progress</option>
              <option value="SUBMITTED">Evidence Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified & Closed</option>
              <option value="OVERDUE">Overdue Statutory Directives</option>
              <option value="REOPENED">Reopened</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* CAP List (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Remediation Directives ({filteredCAPs.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Select to manage actions</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading CAPs...</div>
            ) : filteredCAPs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <AlertOctagon className="w-10 h-10 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No Corrective Action Plans match criteria.</p>
                <p className="text-[11px] text-slate-400 mt-1">Issue a new CAP directive to address institutional gaps.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {filteredCAPs.map((c) => {
                  const isSelected = selectedCAP?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCAP(c)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/70 border-l-4 border-[#092D62]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                              CAP #{c.id}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              c.priority === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {c.priority}
                            </span>
                            {getStatusBadge(c)}
                          </div>

                          <div className="text-xs font-bold text-slate-800 mt-1.5">{c.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{c.institution_name}</div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className={`text-[10px] font-bold ${c.is_overdue ? 'text-red-600' : 'text-slate-500'}`}>
                            {c.is_overdue ? 'OVERDUE' : `${c.days_remaining}d remaining`}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Due: {new Date(c.prescribed_deadline).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CAP Detail & Action Workspace (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            {selectedCAP ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                        CAP #{selectedCAP.id}
                      </span>
                      {getStatusBadge(selectedCAP)}
                    </div>
                    <h2 className="text-sm font-bold text-[#092D62] mt-1.5">
                      {selectedCAP.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Target Institution: <strong>{selectedCAP.institution_name}</strong>
                    </p>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Submit Evidence Button (Active / In Progress) */}
                    {selectedCAP.status !== 'CLOSED' && selectedCAP.status !== 'VERIFIED' && (
                      <button
                        onClick={() => setCapToSubmitEvidence(selectedCAP)}
                        className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded text-xs font-semibold shadow-xs cursor-pointer"
                        title="Upload proof of remediation"
                      >
                        <FileUp className="w-3.5 h-3.5 text-blue-600" />
                        <span>Submit Proof</span>
                      </button>
                    )}

                    {/* Verify & Close Button (Authorized Senior Officer) */}
                    {hasRole(['super_admin', 'bureau_head', 'monitoring_officer', 'authorized_officer']) &&
                      selectedCAP.status !== 'CLOSED' &&
                      selectedCAP.status !== 'VERIFIED' && (
                        <button
                          onClick={() => setCapToVerify(selectedCAP)}
                          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify & Close</span>
                        </button>
                      )}

                    {/* Reopen Button (Super Admin / Bureau Head) */}
                    {hasRole(['super_admin', 'bureau_head']) &&
                      (selectedCAP.status === 'CLOSED' || selectedCAP.status === 'VERIFIED') && (
                        <button
                          onClick={() => setCapToReopen(selectedCAP)}
                          className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen CAP</span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Mandate Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Accountable Bureau</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {selectedCAP.responsible_bureau_code || `Bureau #${selectedCAP.responsible_bureau_id}`}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Prescribed Deadline</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {new Date(selectedCAP.prescribed_deadline).toLocaleDateString()} ({selectedCAP.is_overdue ? 'EXPIRED' : `${selectedCAP.days_remaining}d left`})
                    </div>
                  </div>
                </div>

                {/* Deficiency Gap */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Identified Regulatory Deficiency Gap
                  </div>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {selectedCAP.identified_gap}
                  </p>
                </div>

                {/* Remediation Mandate */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Required Corrective Action & Mandate
                  </div>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {selectedCAP.required_action}
                  </p>
                </div>

                {/* Verification & Closure Audit Section */}
                <div className="border-t border-slate-200 pt-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Statutory Verification Audit</span>
                  </div>

                  {selectedCAP.closed_at ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-xs space-y-1">
                      <div className="font-bold text-emerald-900">
                        Remediation Certified & Closed on {new Date(selectedCAP.closed_at).toLocaleDateString()}
                      </div>
                      <div className="text-emerald-800">
                        <strong>Decision:</strong> {selectedCAP.closure_decision}
                      </div>
                      <div className="text-emerald-800">
                        <strong>Inspector Remarks:</strong> {selectedCAP.verification_remarks}
                      </div>
                    </div>
                  ) : selectedCAP.completion_evidence_doc_id ? (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-900">
                      <strong>Remediation Proof Uploaded (Doc #{selectedCAP.completion_evidence_doc_id}):</strong> Awaiting independent officer on-site or documentary verification.
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[11px] text-slate-500 italic">
                      Institutional evidence submission pending. Verification cannot proceed without uploaded proofs.
                    </div>
                  )}

                  {selectedCAP.reopen_reason && (
                    <div className="mt-2 bg-red-50 border border-red-200 p-2.5 rounded text-xs text-red-900">
                      <strong>Reopened Record:</strong> "{selectedCAP.reopen_reason}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <AlertOctagon className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-xs font-medium">Select a CAP directive to manage remediation.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCAPModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        institutions={institutions}
        bureaus={bureaus}
        onSuccess={(created: CorrectiveActionPlan) => {
          setCaps((prev) => [created, ...prev]);
          setSelectedCAP(created);
        }}
      />

      {capToSubmitEvidence && (
        <SubmitCAPEvidenceModal
          isOpen={!!capToSubmitEvidence}
          onClose={() => setCapToSubmitEvidence(null)}
          cap={capToSubmitEvidence}
          onSuccess={(updated: CorrectiveActionPlan) => {
            setCaps((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCAP(updated);
          }}
        />
      )}

      {capToVerify && (
        <VerifyCAPModal
          isOpen={!!capToVerify}
          onClose={() => setCapToVerify(null)}
          cap={capToVerify}
          onSuccess={(updated: CorrectiveActionPlan) => {
            setCaps((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCAP(updated);
          }}
        />
      )}

      {capToReopen && (
        <ReopenCAPModal
          isOpen={!!capToReopen}
          onClose={() => setCapToReopen(null)}
          cap={capToReopen}
          onSuccess={(updated: CorrectiveActionPlan) => {
            setCaps((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCAP(updated);
          }}
        />
      )}
    </div>
  );
};

export default CorrectiveActionPlansPage;
