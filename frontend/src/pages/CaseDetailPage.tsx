import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CaseItem, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Building, Clock, ShieldAlert, Sparkles, FileText,
  UserCheck, CheckCircle2, AlertTriangle, GitMerge, FileUp,
  History, Calendar, Send, AlertCircle, ExternalLink, Download,
  UserPlus, MessageSquare, Check, X, Shield, Info, ArrowRight, Link2
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Forms
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

  // Phase 5 Intake & Assignment Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState<User[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | ''>('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [isClarifyModalOpen, setIsClarifyModalOpen] = useState(false);
  const [clarifyRemarks, setClarifyRemarks] = useState('');
  const [isClarifying, setIsClarifying] = useState(false);

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveFindings, setResolveFindings] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectStatutoryReason, setRejectStatutoryReason] = useState('Outside AICTE Jurisdiction');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkTargetCaseId, setLinkTargetCaseId] = useState('');
  const [linkRelType, setLinkRelType] = useState('Consolidated Grievance');
  const [linkRemarks, setLinkRemarks] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

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

  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const officers = await api.getAvailableOfficers(caseData?.current_bureau_id);
      setAvailableOfficers(officers);
      if (caseData?.assigned_officer_id) {
        setSelectedOfficerId(caseData.assigned_officer_id);
      } else if (officers.length > 0) {
        setSelectedOfficerId(officers[0].id);
      }
    } catch (err) {
      console.error('Failed to load officers:', err);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficerId) return;
    setIsAssigning(true);
    try {
      await api.assignCase(caseData!.id, Number(selectedOfficerId), assignRemarks);
      setIsAssignModalOpen(false);
      setAssignRemarks('');
      await loadCase();
    } catch (err: any) {
      alert(`Assignment error: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAcceptForReview = async () => {
    try {
      await api.updateCase(caseData!.id, {
        status: 'Under Review',
        last_action: 'Accepted from Intake Queue for Administrative Scrutiny',
        remarks: 'Case accepted into active review docket.'
      });
      await loadCase();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  };

  const handleCommenceInvestigation = async () => {
    try {
      await api.updateCase(caseData!.id, {
        status: 'In Progress',
        last_action: 'Formal Fact-Finding & Investigation Commenced',
        remarks: 'Direct inquiry and evidence verification initiated.'
      });
      await loadCase();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyRemarks.trim()) return;
    setIsClarifying(true);
    try {
      await api.updateCase(caseData!.id, {
        status: 'Additional Information Required',
        last_action: 'Official Clarification & Evidence Requested from Citizen',
        remarks: clarifyRemarks
      });
      setIsClarifyModalOpen(false);
      setClarifyRemarks('');
      await loadCase();
    } catch (err: any) {
      alert(`Request error: ${err.message}`);
    } finally {
      setIsClarifying(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveFindings.trim()) return;
    setIsResolving(true);
    try {
      await api.updateCase(caseData!.id, {
        status: 'Resolved',
        last_action: 'Redressal Directive Issued & Grievance Resolved',
        remarks: resolveFindings
      });
      setIsResolveModalOpen(false);
      setResolveFindings('');
      await loadCase();
    } catch (err: any) {
      alert(`Resolve error: ${err.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      const fullRemarks = `[Statutory Basis: ${rejectStatutoryReason}] ${rejectReason.trim()}`;
      await api.updateCase(caseData!.id, {
        status: 'Rejected',
        last_action: `Grievance Evaluated and Rejected: ${rejectStatutoryReason}`,
        remarks: fullRemarks
      });
      setIsRejectModalOpen(false);
      setRejectReason('');
      await loadCase();
    } catch (err: any) {
      alert(`Reject error: ${err.message}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTargetCaseId.trim()) return;
    setIsLinking(true);
    try {
      await api.linkCase(caseData!.id, linkTargetCaseId.trim(), linkRelType, linkRemarks.trim());
      setIsLinkModalOpen(false);
      setLinkTargetCaseId('');
      setLinkRemarks('');
      await loadCase();
    } catch (err: any) {
      alert(`Link / Consolidation error: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDocDownload = async (docId: number, filename?: string) => {
    setDownloadingDocId(docId);
    try {
      await api.downloadCaseDocument(docId, filename);
    } catch (err: any) {
      alert(`Download error: ${err.message}`);
    } finally {
      setDownloadingDocId(null);
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
              onClick={openAssignModal}
              className="btn-3d-amber px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{caseData.assigned_officer_id ? 'Reassign Officer' : 'Assign Officer'}</span>
            </button>
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="btn-3d-navy px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer"
            >
              Update Status / Action
            </button>
            <button
              onClick={() => setIsEscalateModalOpen(true)}
              className="btn-3d-white text-red-800 border-red-300 px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer"
            >
              Escalate to Bureau Head
            </button>
          </div>
        </div>

        {/* Phase 5: Intake & Lifecycle Action Bar */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[#092D62]">
              <ShieldAlert className="w-5 h-5 text-[#092D62]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lifecycle Stage:</span>
                <StatusBadge status={caseData.status} type="status" />
                {caseData.is_citizen_complaint && (
                  <span className="bg-blue-100 text-[#092D62] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-300">
                    Citizen Portal Submission
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Assigned Officer:{' '}
                <strong className={caseData.officer_name && caseData.officer_name !== 'Unassigned' ? 'text-slate-800' : 'text-amber-800'}>
                  {caseData.officer_name || 'Unassigned (Awaiting Intake Allocation)'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {caseData.status === 'Submitted' && (
              <>
                <button
                  onClick={handleAcceptForReview}
                  className="btn-3d-navy px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accept for Review</span>
                </button>
                <button
                  onClick={openAssignModal}
                  className="btn-3d-amber px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Officer</span>
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="btn-3d-white text-red-700 border-red-300 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}

            {caseData.status === 'Under Review' && (
              <>
                <button
                  onClick={handleCommenceInvestigation}
                  className="btn-3d-navy px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
                  <span>Commence Investigation</span>
                </button>
                <button
                  onClick={() => setIsClarifyModalOpen(true)}
                  className="btn-3d-white text-blue-800 border-blue-300 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request More Info</span>
                </button>
                <button
                  onClick={openAssignModal}
                  className="btn-3d-amber px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{caseData.assigned_officer_id ? 'Reassign' : 'Assign Officer'}</span>
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="btn-3d-white text-red-700 border-red-300 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}

            {caseData.status === 'In Progress' && (
              <>
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="btn-3d-amber px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Resolve Grievance</span>
                </button>
                <button
                  onClick={() => setIsClarifyModalOpen(true)}
                  className="btn-3d-white text-blue-800 border-blue-300 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request More Info</span>
                </button>
                <button
                  onClick={openAssignModal}
                  className="btn-3d-white text-slate-700 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Reassign</span>
                </button>
              </>
            )}

            {caseData.status === 'Additional Information Required' && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Awaiting Citizen Clarification</span>
                </span>
                <button
                  onClick={handleCommenceInvestigation}
                  className="btn-3d-navy px-3 py-1.5 rounded text-xs font-bold cursor-pointer"
                >
                  Proceed with Available Data
                </button>
              </div>
            )}

            {caseData.status === 'Resolved' && (
              <span className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Grievance Formally Resolved</span>
              </span>
            )}
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

          {/* Complainant Profile Card (Visible to authorized officers) */}
          {caseData.complainant_details && (
            <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-200 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#092D62]" />
                  <h4 className="text-xs font-extrabold text-[#061E46] uppercase tracking-wider">
                    Verified Citizen Complainant Profile
                  </h4>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-700" />
                  <span>Identity Verified</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Complainant Name</span>
                  <span className="font-bold text-[#092D62] text-sm">{caseData.complainant_details.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Registered Email</span>
                  <span className="font-mono text-slate-800">{caseData.complainant_details.email}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Mobile Number</span>
                  <span className="font-mono text-slate-800">{caseData.complainant_details.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Complainant Role</span>
                  <span className="font-semibold text-slate-800">{caseData.complainant_details.complainant_type || 'Student'}</span>
                </div>
              </div>
            </div>
          )}
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
                  <div key={doc.id} className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs flex items-center justify-between gap-2">
                    <div className="truncate flex-1">
                      <span className="font-bold text-[#092D62] block truncate" title={doc.original_filename || doc.file_name}>
                        {doc.original_filename || doc.file_name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {doc.category} • {(doc.file_size / 1024).toFixed(0)} KB • By {doc.uploaded_by_name || 'Officer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded uppercase">
                        {doc.access_classification}
                      </span>
                      <button
                        onClick={() => handleDocDownload(doc.id, doc.original_filename || doc.file_name)}
                        disabled={downloadingDocId === doc.id}
                        className="btn-3d-white p-1.5 rounded text-xs text-[#092D62] hover:bg-blue-50 cursor-pointer disabled:opacity-50"
                        title="Download Document Attachment"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Officer Allocation History */}
            {caseData.assignments && caseData.assignments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Officer Allocation History
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {caseData.assignments.map((a) => (
                    <div key={a.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-bold text-[#092D62]">{a.to_officer_name}</span>
                        <span className="font-mono text-[10px]">{new Date(a.assigned_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Assigned by: <strong>{a.assigned_by_name}</strong>
                      </div>
                      {a.remarks && (
                        <p className="text-[10px] text-slate-700 italic mt-0.5">"{a.remarks}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked & Consolidated Matters */}
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Linked & Consolidated Matters
                </span>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="text-[10px] text-[#092D62] font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  Link Case
                </button>
              </div>

              {(!caseData.linked_cases || caseData.linked_cases.length === 0) ? (
                <p className="text-[11px] text-slate-400 italic">No linked complaints or consolidated cases.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {caseData.linked_cases.map((rel) => (
                    <div key={rel.id} className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span
                          className="font-bold text-[#092D62] cursor-pointer hover:underline"
                          onClick={() => navigate(`/cases/${rel.related_case_id}`)}
                        >
                          {rel.related_case_id}
                        </span>
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded uppercase">
                          {rel.relationship_type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mt-0.5" title={rel.title}>
                        {rel.title} • {rel.case_status}
                      </div>
                      {rel.remarks && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">"{rel.remarks}"</p>
                      )}
                    </div>
                  ))}
                </div>
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
                <optgroup label="Modern Complaint Lifecycle">
                  <option value="Submitted">Submitted (Intake)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Additional Information Required">Additional Information Required</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Rejected">Rejected</option>
                </optgroup>
                <optgroup label="Legacy Administrative Statuses">
                  <option value="Pending">Pending</option>
                  <option value="Under Process">Under Process</option>
                  <option value="Disposed">Disposed</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Escalated">Escalated</option>
                </optgroup>
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

        {/* Modal 5: Assign Officer */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Officer to Complaint"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="bg-blue-50 text-[#092D62] p-2.5 rounded border border-blue-200 text-xs">
              <strong>Intake Allocation Directive:</strong> Assigning an officer records an immutable allocation event, transfers review responsibility, advances Submitted complaints to Under Review, and notifies the designated officer.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Designated Officer *</label>
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
                required
              >
                <option value="">-- Choose Active Council Officer --</option>
                {availableOfficers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.full_name} ({off.designation || off.role.replace('_', ' ').toUpperCase()}) - {off.bureau_code || 'Central'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assignment Directive / Scrutiny Remarks</label>
              <textarea
                rows={3}
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                placeholder="Specific instructions for officer inquiry (e.g. Verify fee receipts against approved AICTE capitation norms)..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAssigning || !selectedOfficerId}
                className="btn-3d-amber px-4 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isAssigning ? 'Allocating...' : 'Confirm Officer Allocation'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 6: Request Additional Information from Citizen */}
        <Modal
          isOpen={isClarifyModalOpen}
          onClose={() => setIsClarifyModalOpen(false)}
          title="Request Additional Information / Evidence"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleClarifySubmit} className="space-y-4">
            <div className="bg-amber-50 text-amber-900 p-2.5 rounded border border-amber-200 text-xs">
              <strong>Citizen Query Notification:</strong> This will update the case status to <em>Additional Information Required</em> and dispatch an official query to the citizen complainant.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Information / Documents Required from Complainant *</label>
              <textarea
                rows={4}
                value={clarifyRemarks}
                onChange={(e) => setClarifyRemarks(e.target.value)}
                placeholder="State specifically which documents, dates, fee receipts, or clarifications are needed from the student/citizen..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsClarifyModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isClarifying || !clarifyRemarks.trim()}
                className="btn-3d-navy px-4 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isClarifying ? 'Transmitting...' : 'Dispatch Request to Citizen'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 7: Resolve Grievance */}
        <Modal
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          title="Resolve Complaint & Issue Findings"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="bg-emerald-50 text-emerald-900 p-2.5 rounded border border-emerald-200 text-xs">
              <strong>Final Disposal Finding:</strong> Resolving the grievance issues an official Council directive and informs the citizen of the grievance outcome.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Formal Resolution Findings & Redressal Directives *</label>
              <textarea
                rows={4}
                value={resolveFindings}
                onChange={(e) => setResolveFindings(e.target.value)}
                placeholder="Detail resolution findings, institutional compliance orders, fee refunds directed, or corrective administrative actions enforced..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResolving || !resolveFindings.trim()}
                className="btn-3d-amber px-4 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isResolving ? 'Finalizing...' : 'Confirm Grievance Resolution'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 8: Reject Grievance */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Grievance from Redressal Docket"
          subtitle={`Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="bg-red-50 text-red-900 p-2.5 rounded border border-red-200 text-xs">
              <strong>Statutory Purview Rejection:</strong> State the statutory AICTE regulatory basis for rejecting this complaint (e.g. civil/contractual dispute outside AICTE jurisdiction, anonymous sub judice case, frivolous complaint).
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Statutory Basis for Rejection *</label>
              <select
                value={rejectStatutoryReason}
                onChange={(e) => setRejectStatutoryReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white mb-2"
              >
                <option value="Outside AICTE Jurisdiction">Outside AICTE Jurisdiction</option>
                <option value="RTI / Query (Not Grievance)">RTI / Query (Not Grievance)</option>
                <option value="Sub-Judice / Active Court Case">Sub-Judice / Active Court Case</option>
                <option value="Vexatious / Slanderous">Vexatious / Slanderous</option>
                <option value="Insufficient Substance">Insufficient Substance</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mandatory Rejection Justification *</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State the regulatory grounds for non-admissibility..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting || !rejectReason.trim()}
                className="btn-3d-white text-red-800 border-red-300 px-4 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal 9: Consolidate or Link Grievance */}
        <Modal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          title="Consolidate or Link Grievance"
          subtitle={`Primary Case ID: ${caseData.id}`}
        >
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <div className="bg-blue-50 text-[#092D62] p-2.5 rounded border border-blue-200 text-xs">
              <strong>Multi-Grievance Consolidation:</strong> Link related citizen complaints regarding the same institution or issue into a coordinated inquiry dossier without altering individual complainant ownership.
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Case / Complaint Reference ID *</label>
              <input
                type="text"
                value={linkTargetCaseId}
                onChange={(e) => setLinkTargetCaseId(e.target.value)}
                placeholder="e.g. AICTE-2026-CMP-12345 or AICTE-RB-2024-0101"
                className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Relationship Type *</label>
              <select
                value={linkRelType}
                onChange={(e) => setLinkRelType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="Consolidated Grievance">Consolidated Grievance (Joint Dossier)</option>
                <option value="Related Matter">Related Matter (Cross-Referenced)</option>
                <option value="Shared Institution Issue">Shared Institution Issue (Institutional Pattern)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Consolidation Justification & Scrutiny Notes</label>
              <textarea
                rows={3}
                value={linkRemarks}
                onChange={(e) => setLinkRemarks(e.target.value)}
                placeholder="State the institutional commonality, shared regulatory violation, or joint inquiry direction..."
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="btn-3d-white px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLinking || !linkTargetCaseId.trim()}
                className="btn-3d-navy px-4 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isLinking ? 'Linking...' : 'Confirm Matter Linkage'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
