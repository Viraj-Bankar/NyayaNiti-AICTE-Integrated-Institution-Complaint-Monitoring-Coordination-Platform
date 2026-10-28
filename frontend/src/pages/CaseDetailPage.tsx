import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CaseItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Building, Clock, ShieldAlert, Sparkles, FileText,
  UserCheck, CheckCircle2, AlertTriangle, GitMerge, FileUp,
  History, Calendar, Send, AlertCircle, ExternalLink
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overridePriority, setOverridePriority] = useState('Critical');
  const [overrideReason, setOverrideReason] = useState('');

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('Under Process');
  const [updateAction, setUpdateAction] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Official Notice');
  const [docClassification, setDocClassification] = useState('Official Internal');

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  const loadCase = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCaseDetail(id!);
      setCaseData(data);
      setUpdateStatus(data.status);
      setUpdateAction(data.last_action || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load case');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriorityOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    try {
      await api.overridePriority(caseData!.id, overridePriority, overrideReason);
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      await loadCase();
    } catch (err: any) {
      alert(`Override error: ${err.message}`);
    }
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateCase(caseData!.id, {
        status: updateStatus,
        last_action: updateAction,
        remarks: updateRemarks
      });
      setIsUpdateModalOpen(false);
      setUpdateRemarks('');
      await loadCase();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;
    try {
      await api.escalateCase(caseData!.id, escalateReason);
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      await loadCase();
    } catch (err: any) {
      alert(`Escalation error: ${err.message}`);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    const formData = new FormData();
    formData.append('file_name', docName);
    formData.append('category', docCategory);
    formData.append('access_classification', docClassification);
    formData.append('file_size', '153600');
    try {
      await api.uploadCaseDocument(caseData!.id, formData);
      setIsDocModalOpen(false);
      setDocName('');
      await loadCase();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-xs text-slate-500">
        Loading complete case dossier...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">Case Dossier Unavailable</h3>
        <p className="text-xs text-slate-600 mt-1">{error || 'Case not found'}</p>
        <button onClick={() => navigate('/cases')} className="btn-3d-navy mt-4 px-4 py-2 rounded text-xs">
          Return to Case Register
        </button>
      </div>
    );
  }

  const deadlineDate = new Date(caseData.prescribed_deadline);
  const now = new Date();
  const isOverdue = deadlineDate < now && caseData.status !== 'Disposed';
  const daysDiff = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#092D62] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Case Register</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="btn-3d-navy px-3.5 py-1.5 rounded text-xs font-semibold"
            >
              Update Status / Action
            </button>
            <button
              onClick={() => setIsEscalateModalOpen(true)}
              className="btn-3d-white text-red-800 border-red-300 px-3.5 py-1.5 rounded text-xs font-semibold"
            >
              Escalate to Bureau Head
            </button>
          </div>
        </div>

        {/* Case Dossier Banner */}
        <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold font-mono text-[#092D62] bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {caseData.id}
                </span>
                <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                  Bureau: {caseData.bureau_code}
                </span>
                <StatusBadge status={caseData.priority} type="priority" />
                <StatusBadge status={caseData.status} type="status" />
              </div>
              <h2 className="text-lg font-extrabold text-[#061E46] mt-2">
                {caseData.category}
              </h2>
              {caseData.subcategory && (
                <p className="text-xs text-slate-500 font-medium">Sub-Category: {caseData.subcategory}</p>
              )}
            </div>

            {/* SLA Clock Box */}
            <div className={`p-3 rounded border text-right ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Prescribed SLA Deadline</span>
              <span className={`text-sm font-extrabold block ${isOverdue ? 'text-red-700' : 'text-[#092D62]'}`}>
                {deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className={`text-[10px] font-semibold block ${isOverdue ? 'text-red-800' : 'text-slate-600'}`}>
                {isOverdue ? `Overdue by ${Math.abs(daysDiff)} days` : `${daysDiff} days remaining`}
              </span>
            </div>
          </div>

          {/* Institution Link Bar */}
          <div className="bg-[#F4F6F9] rounded-lg p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-[#092D62] flex-shrink-0" />
              <div>
                <span className="font-bold text-[#061E46] text-sm block">{caseData.institution_name}</span>
                <span className="text-slate-500 font-mono text-[11px]">AICTE Permanent ID: {caseData.permanent_id}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/institutions/${caseData.institution_id}`)}
              className="btn-3d-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View Institution 360° Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#1E5AA8]" />
            </button>
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Official Grievance Statement</h4>
            <div className="bg-white p-3.5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed">
              {caseData.description}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span>Complainant Type: <strong className="text-slate-700">{caseData.complainant_type}</strong></span>
              <span>•</span>
              <span>Complainant Mask: <strong className="text-slate-700 font-mono">{caseData.complainant_masked}</strong></span>
              <span>•</span>
              <span>Logged Date: <strong className="text-slate-700">{new Date(caseData.date_received).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Middle Two-Column Grid: Priority Factors & Inter-Bureau Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Smart Priority Engine Breakdown (Feature 13) */}
          <div className="lg:col-span-6 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFB900]" />
                <h4 className="text-xs font-bold text-[#061E46]">Smart Complaint Priority Engine</h4>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="text-[11px] font-bold text-[#1E5AA8] hover:underline"
              >
                Override Priority
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Calculated Severity Score</span>
                <div className="text-2xl font-black text-[#092D62] mt-0.5">
                  {caseData.priority_score ?? 75.0} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Tier</span>
                <StatusBadge status={caseData.priority} type="priority" />
              </div>
            </div>

            {/* Contributing Factor Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">Contributing Regulatory Factors:</span>
              <div className="space-y-1.5">
                {(caseData.priority_factors?.factor_breakdown || [
                  { factor: 'Statutory Subject Urgency', detail: caseData.category, points: 30 },
                  { factor: 'Prescribed SLA Timing', detail: `${daysDiff} calendar days remaining`, points: isOverdue ? 35 : 15 },
                  { factor: 'Bureau Queue Status', detail: caseData.status, points: 10 }
                ]).map((fb: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-[#092D62] block">{fb.factor}</span>
                      <span className="text-[10px] text-slate-500">{fb.detail}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                      +{fb.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {caseData.priority_override_reason && (
              <div className="bg-amber-50 border border-amber-300 p-2.5 rounded text-xs text-amber-900">
                <strong>Administrative Override Justification:</strong> {caseData.priority_override_reason}
              </div>
            )}
          </div>

          {/* Current Actions & Inter-Bureau Alerts */}
          <div className="lg:col-span-6 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#061E46] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#092D62]" />
                Recorded Actions & Coordination State
              </h4>
              <span className="text-[10px] font-mono text-slate-500">Bureau Flow</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Recorded Action</span>
                <p className="text-xs font-bold text-[#061E46] mt-0.5">
                  {caseData.last_action || 'Initial grievance registration and preliminary scrutiny'}
                </p>
                {caseData.last_action_date && (
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Recorded: {new Date(caseData.last_action_date).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="p-3 rounded bg-blue-50/60 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-[#1E5AA8] block">Next Prescribed Action</span>
                <p className="text-xs font-bold text-[#061E46] mt-0.5">
                  {caseData.next_action || 'Standing Scrutiny Committee Examination'}
                </p>
              </div>

              {/* Inter-Bureau Signals */}
              <div className="p-3 rounded border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Cross-Bureau Linkages:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Overlap Status:</span>
                    <StatusBadge status={caseData.overlap_review_status} type="overlap" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Conflict Status:</span>
                    <StatusBadge status={caseData.action_conflict_status} type="conflict" />
                  </div>
                </div>

                {caseData.overlap_review_status !== 'None' && (
                  <button
                    onClick={() => navigate('/overlaps')}
                    className="text-[11px] text-[#1E5AA8] hover:underline font-bold flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Open Overlap Detection Centre</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Two-Column: Chronological Timeline (Feature 17) & Documents (Feature 23) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Append-Only Case Action Timeline */}
          <div className="lg:col-span-8 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#061E46] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#092D62]" />
                Chronological Case Action Timeline (Append-Only Audit History)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">{caseData.events?.length || 0} Events</span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(caseData.events || []).map((ev) => (
                <div key={ev.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#092D62] border-2 border-white shadow-xs"></div>
                  
                  <div className="bg-slate-50 rounded p-3 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#092D62] uppercase tracking-wide text-[11px]">
                        {ev.event_type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 mt-1">
                      Actor: <strong>{ev.actor_name}</strong>
                    </div>

                    {ev.remarks && (
                      <p className="text-xs text-slate-800 mt-1.5 font-medium bg-white p-2 rounded border border-slate-200">
                        {ev.remarks}
                      </p>
                    )}

                    {ev.previous_value && ev.new_value && (
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        Changed from <span className="text-red-700 line-through">{ev.previous_value}</span> to <span className="text-emerald-700 font-bold">{ev.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting Documents & Metadata */}
          <div className="lg:col-span-4 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#061E46] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#092D62]" />
                Supporting Documents & Notices
              </h4>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="text-[11px] font-bold text-[#1E5AA8] hover:underline"
              >
                + Attach
              </button>
            </div>

            <div className="space-y-2.5">
              {(caseData.documents || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No supporting documents attached yet.</p>
              ) : (
                caseData.documents!.map((doc) => (
                  <div key={doc.id} className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#092D62] block truncate max-w-[160px]">{doc.file_name}</span>
                      <span className="text-[10px] text-slate-500">{doc.category} • {(doc.file_size / 1024).toFixed(0)} KB</span>
                    </div>
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded uppercase">
                      {doc.access_classification}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal 1: Priority Override */}
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          title="Administrative Priority Override"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handlePriorityOverride} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Priority Level *</label>
              <select
                value={overridePriority}
                onChange={(e) => setOverridePriority(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mandatory Override Justification *</label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="State statutory reason, higher authority direction, or verified risk indicators justifying priority override..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">This override will be permanently logged in the Council audit trail.</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setIsOverrideModalOpen(false)} className="btn-3d-white px-3 py-1.5 rounded text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-3d-amber px-4 py-1.5 rounded text-xs font-bold">
                Confirm Priority Override
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: Update Status & Action */}
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title="Update Case Status & Official Action"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleUpdateCase} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Transition Status *</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="Pending">Pending</option>
                <option value="Under Process">Under Process</option>
                <option value="Disposed">Disposed</option>
                <option value="Transferred">Transferred</option>
                <option value="Escalated">Escalated</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Official Action Taken</label>
              <input
                type="text"
                value={updateAction}
                onChange={(e) => setUpdateAction(e.target.value)}
                placeholder="e.g. Hearing conducted / Explanation called / Show Cause Notice issued"
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Remarks / Case Notes</label>
              <textarea
                rows={3}
                value={updateRemarks}
                onChange={(e) => setUpdateRemarks(e.target.value)}
                placeholder="Record regulatory findings or committee directives..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="btn-3d-white px-3 py-1.5 rounded text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-3d-navy px-4 py-1.5 rounded text-xs font-bold">
                Save & Record Event
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 3: Escalate to Bureau Head */}
        <Modal
          isOpen={isEscalateModalOpen}
          onClose={() => setIsEscalateModalOpen(false)}
          title="Escalate Case to Bureau Head"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleEscalate} className="space-y-4">
            <div className="bg-red-50 text-red-900 p-2.5 rounded border border-red-200 text-xs">
              <strong>Escalation Warning:</strong> Escalation transitions this complaint directly to the Adviser / Bureau Head and sets Priority to Critical.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Escalation Justification *</label>
              <textarea
                rows={4}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Detail reason for immediate executive intervention (e.g. repeated failure to comply, imminent statutory deadline breach, gross institutional defiance)..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setIsEscalateModalOpen(false)} className="btn-3d-white px-3 py-1.5 rounded text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-3d-amber px-4 py-1.5 rounded text-xs font-bold">
                Submit Escalation Notice
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 4: Attach Supporting Document */}
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title="Attach Supporting Document"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleUploadDoc} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Document File Name *</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Inquiry_Report_2024.pdf"
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Official Notice">Official Notice</option>
                  <option value="Inspection Report">Inspection Report</option>
                  <option value="Affidavit">Affidavit</option>
                  <option value="Action Evidence">Action Evidence</option>
                  <option value="Correspondence">Correspondence</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Access Classification</label>
                <select
                  value={docClassification}
                  onChange={(e) => setDocClassification(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Official Internal">Official Internal</option>
                  <option value="Confidential - Bureau Head Only">Confidential - Bureau Head Only</option>
                  <option value="Public">Public</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setIsDocModalOpen(false)} className="btn-3d-white px-3 py-1.5 rounded text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-3d-navy px-4 py-1.5 rounded text-xs font-bold">
                Attach Document Record
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
