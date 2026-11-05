import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  OfficerComplaintDetail, OfficerComplaintMetadata, User
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { AIDuplicatePanel } from '../components/ai/AIDuplicatePanel';
import { CreateWorkspaceModal } from '../components/coordination/CreateWorkspaceModal';
import {
  ArrowLeft, Building2, Calendar, Clock, Download, FileText,
  User as UserIcon, Shield, AlertTriangle, CheckCircle2,
  XCircle, HelpCircle, UserPlus, GitMerge, Paperclip,
  ExternalLink, Lock, RefreshCw, Eye, MessageSquare, AlertCircle, Layers
} from 'lucide-react';

export const OfficerComplaintReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // State
  const [complaint, setComplaint] = useState<OfficerComplaintDetail | null>(null);
  const [metadata, setMetadata] = useState<OfficerComplaintMetadata | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

  // User feedback states (Feature 7)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals (Feature 4, 5, 6)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCoordinationModalOpen, setIsCoordinationModalOpen] = useState(false);

  // Form states
  const [acceptForm, setAcceptForm] = useState({
    remarks: 'Complaint formally admitted for official inquiry into institutional compliance.',
    priority: 'Medium',
    target_bureau_id: undefined as number | undefined
  });

  const [rejectForm, setRejectForm] = useState({
    statutory_reason: 'Grievance does not fall under AICTE Mandate / Jurisdiction',
    remarks: ''
  });

  const [requestInfoForm, setRequestInfoForm] = useState({
    query_details: '',
    required_documents: '',
    deadline_days: 14
  });

  const [assignForm, setAssignForm] = useState({
    to_officer_id: 0,
    bureau_id: undefined as number | undefined,
    remarks: ''
  });

  const [linkForm, setLinkForm] = useState({
    target_case_id: '',
    relationship_type: 'Consolidated Grievance',
    remarks: 'Clustered under joint institutional inquiry'
  });

  const [resolveForm, setResolveForm] = useState({
    resolution_findings: '',
    action_taken: 'Institutional compliance directive issued',
    remarks: ''
  });

  const [closeForm, setCloseForm] = useState({
    closure_remarks: 'Grievance matter formally completed and disposed with finality.'
  });

  // Load Data
  const loadComplaint = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getOfficerComplaintDetail(id);
      setComplaint(data);
      // Pre-fill target bureau and priority
      setAcceptForm((prev) => ({
        ...prev,
        priority: data.priority || 'Medium',
        target_bureau_id: data.current_bureau.id
      }));
    } catch (err: any) {
      console.error('Failed to load complaint details:', err);
      setErrorMessage(err.message || 'Unable to load complaint dossier. Please verify your officer credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();

    api.getOfficerComplaintMetadata()
      .then((m) => {
        setMetadata(m);
        if (m.statutory_rejection_reasons.length > 0) {
          setRejectForm((prev) => ({ ...prev, statutory_reason: m.statutory_rejection_reasons[0] }));
        }
      })
      .catch((err) => console.warn('Could not load metadata:', err));

    api.getAvailableOfficers()
      .then((officers) => {
        setAvailableOfficers(officers);
        if (officers.length > 0) {
          setAssignForm((prev) => ({ ...prev, to_officer_id: officers[0].id }));
        }
      })
      .catch((err) => console.warn('Could not load officers:', err));
  }, [id]);

  // Handle Document Download (Feature 7)
  const handleDownloadDocument = async (docId: number, originalFilename: string) => {
    if (!id) return;
    setDownloadingDocId(docId);
    setErrorMessage(null);
    try {
      await api.downloadOfficerComplaintDocument(id, docId, originalFilename);
    } catch (err: any) {
      console.error('Document download error:', err);
      setErrorMessage(err.message || 'Failed to download evidence document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Actions (Feature 4, 5, 6)
  const handleStartReview = async () => {
    if (!id) return;
    if (!window.confirm('Commence formal preliminary scrutiny on this complaint? Citizen timeline will update to "Under Review".')) {
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.startComplaintReview(id);
      setSuccessMessage(res.message || 'Preliminary scrutiny commenced successfully.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.acceptComplaint(id, {
        remarks: acceptForm.remarks.trim() || undefined,
        priority: acceptForm.priority,
        target_bureau_id: acceptForm.target_bureau_id ? Number(acceptForm.target_bureau_id) : undefined
      });
      setIsAcceptModalOpen(false);
      setSuccessMessage(res.message || 'Complaint officially accepted into active inquiry docket.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!rejectForm.remarks.trim() || rejectForm.remarks.trim().length < 10) {
      setErrorMessage('Detailed statutory justification is mandatory (minimum 10 characters).');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.rejectComplaint(id, {
        statutory_reason: rejectForm.statutory_reason,
        remarks: rejectForm.remarks.trim()
      });
      setIsRejectModalOpen(false);
      setSuccessMessage(res.message || 'Complaint rejected with statutory non-admissibility order.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!requestInfoForm.query_details.trim()) {
      setErrorMessage('Please specify the exact clarification required from the complainant.');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.requestComplaintInfo(id, {
        query_details: requestInfoForm.query_details.trim(),
        required_documents: requestInfoForm.required_documents.trim() || undefined,
        deadline_days: Number(requestInfoForm.deadline_days) || 14
      });
      setIsRequestInfoModalOpen(false);
      setSuccessMessage(res.message || 'Clarification request issued to complainant.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request additional information.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !assignForm.to_officer_id) {
      setErrorMessage('Please select a valid active officer for assignment.');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.assignComplaintOfficer(id, {
        to_officer_id: Number(assignForm.to_officer_id),
        bureau_id: assignForm.bureau_id ? Number(assignForm.bureau_id) : undefined,
        remarks: assignForm.remarks.trim() || undefined
      });
      setIsAssignModalOpen(false);
      setSuccessMessage(res.message || 'Officer assigned successfully.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to assign officer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !linkForm.target_case_id.trim()) {
      setErrorMessage('Please enter a valid target case reference ID.');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.linkComplaintCase(id, {
        target_case_id: linkForm.target_case_id.trim(),
        relationship_type: linkForm.relationship_type,
        remarks: linkForm.remarks.trim() || undefined
      });
      setIsLinkModalOpen(false);
      setSuccessMessage(`Matter successfully linked with case ${linkForm.target_case_id.trim()}.`);
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to link case.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!resolveForm.resolution_findings.trim()) {
      setErrorMessage('Resolution findings and statutory compliance determination are mandatory.');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.resolveOfficerComplaint(id, {
        resolution_findings: resolveForm.resolution_findings.trim(),
        action_taken: resolveForm.action_taken.trim() || undefined,
        remarks: resolveForm.remarks.trim() || undefined
      });
      setIsResolveModalOpen(false);
      setSuccessMessage(res.message || 'Grievance matter resolved and recorded.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resolve grievance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.closeOfficerComplaint(id, {
        closure_remarks: closeForm.closure_remarks.trim() || undefined
      });
      setIsCloseModalOpen(false);
      setSuccessMessage(res.message || 'Grievance matter formally closed.');
      await loadComplaint();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to close grievance matter.');
    } finally {
      setActionLoading(false);
    }
  };

  // Permission Checks
  const canPerformScrutiny = hasRole(['super_admin', 'bureau_head', 'authorized_officer']);
  const canAssignOrReject = hasRole(['super_admin', 'bureau_head']);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#092D62] mb-4" />
        <p className="text-sm font-bold text-slate-700">Loading AICTE Complaint Dossier...</p>
        <p className="text-xs text-slate-500 mt-1">Verifying officer permissions and assembling evidence records.</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Complaint Record Not Found</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
          The requested complaint identifier does not exist or you do not have permission to view this bureau's docket.
        </p>
        <button
          onClick={() => navigate('/complaint-intake')}
          className="mt-4 px-4 py-2 bg-[#092D62] text-white text-xs font-bold rounded cursor-pointer"
        >
          Return to Complaint Intake
        </button>
      </div>
    );
  }

  const isTerminalStatus = ['Closed', 'Rejected'].includes(complaint.status);
  const isAdmittedStatus = ['In Progress', 'Resolved', 'Closed'].includes(complaint.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/complaint-intake')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#092D62] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaint Intake</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            Intake Docket Reference:
          </span>
          <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
            {complaint.id}
          </span>
        </div>
      </div>

      {/* Feedback Messages (Feature 7) */}
      {successMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Cross-Bureau Coordination Workspace Alert (Phase 7) */}
      {complaint.coordination_workspaces && complaint.coordination_workspaces.length > 0 && (
        <div className="mb-4 bg-blue-50 border-2 border-[#092D62] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#092D62] text-white rounded">
              <Layers className="w-4 h-4 text-[#FFB900]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#092D62] uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded">
                Active Joint Coordination Workspace
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1">
                Workspace #{complaint.coordination_workspaces[0].workspace_id}: {complaint.coordination_workspaces[0].title}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Status: <strong className="text-[#092D62]">{complaint.coordination_workspaces[0].status}</strong> • Lead Bureau: <strong>{complaint.coordination_workspaces[0].primary_bureau_code}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/coordination?workspaceId=${complaint.coordination_workspaces![0].workspace_id}`)}
            className="px-3.5 py-1.5 bg-[#092D62] text-white hover:bg-[#072147] text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
          >
            <span>Open Joint Workspace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Official Government Header Card (Feature 3) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-sm font-black text-[#092D62] bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                {complaint.id}
              </span>
              <StatusBadge status={complaint.status} type="status" />
              <StatusBadge status={complaint.priority} type="priority" />
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Bureau: {complaint.current_bureau.name} ({complaint.current_bureau.code})
              </span>
            </div>

            <h1 className="text-lg md:text-xl font-bold text-slate-900 mt-1">
              {complaint.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Submitted: {new Date(complaint.date_received).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Statutory Deadline: {new Date(complaint.prescribed_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              {complaint.assigned_officer ? (
                <div className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Investigating Officer: <strong className="text-slate-700">{complaint.assigned_officer.full_name}</strong></span>
                </div>
              ) : (
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                  Unassigned Intake
                </span>
              )}
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadComplaint}
            disabled={actionLoading}
            className="self-start lg:self-auto p-2 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Refresh Dossier"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Bar (Feature 4, 5, 6) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Statutory Actions:
            </span>
            {isTerminalStatus && (
              <span className="text-[11px] text-slate-500 italic">
                Matter is disposed/closed. Further preliminary actions restricted.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Start Review Button */}
            {canPerformScrutiny && complaint.status === 'Submitted' && (
              <button
                onClick={handleStartReview}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-[#092D62] text-white hover:bg-[#123C7B] text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Start Review</span>
              </button>
            )}

            {/* Accept Complaint Button */}
            {canPerformScrutiny && ['Submitted', 'Under Review', 'Additional Information Required'].includes(complaint.status) && (
              <button
                onClick={() => setIsAcceptModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept Complaint</span>
              </button>
            )}

            {/* Request Additional Information Button */}
            {canPerformScrutiny && ['Submitted', 'Under Review'].includes(complaint.status) && (
              <button
                onClick={() => setIsRequestInfoModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Request Info</span>
              </button>
            )}

            {/* Reject Complaint Button */}
            {canAssignOrReject && ['Submitted', 'Under Review', 'Additional Information Required'].includes(complaint.status) && (
              <button
                onClick={() => setIsRejectModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-700 text-white hover:bg-rose-800 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Statutory Rejection</span>
              </button>
            )}

            {/* Assign Officer Button */}
            {canAssignOrReject && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-[#FFB900] text-[#061E46] hover:bg-amber-400 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{complaint.assigned_officer ? 'Reassign Officer' : 'Assign Officer'}</span>
              </button>
            )}

            {/* Link Case Button */}
            {canPerformScrutiny && (
              <button
                onClick={() => setIsLinkModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Link Case</span>
              </button>
            )}

            {/* Initiate Coordination Button (Phase 7) */}
            {canPerformScrutiny && !isTerminalStatus && (
              <button
                onClick={() => setIsCoordinationModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-[#092D62] text-white hover:bg-[#072147] text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Convene Multi-Bureau Joint Coordination Workspace"
              >
                <Layers className="w-3.5 h-3.5 text-[#FFB900]" />
                <span>Initiate Coordination</span>
              </button>
            )}

            {/* Resolve Grievance Button */}
            {canPerformScrutiny && complaint.status === 'In Progress' && (
              <button
                onClick={() => setIsResolveModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve Grievance</span>
              </button>
            )}

            {/* Close Grievance Button */}
            {canAssignOrReject && complaint.status === 'Resolved' && (
              <button
                onClick={() => setIsCloseModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-700 text-white hover:bg-slate-800 text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Matter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: 2/3 Content + 1/3 Sidebar (Feature 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Grievance Dossier, Integration, and Timelines */}
        <div className="lg:col-span-8 space-y-6">
          {/* Canonical Case Integration Banner (Feature 6) */}
          <div className="bg-white border-2 border-indigo-100 rounded-lg p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-indigo-900 text-white rounded-xs">
                    Canonical Matter Architecture
                  </span>
                  <span className="text-xs font-bold text-indigo-950">
                    Unified AICTE Case Docket
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  In compliance with Council Data Integrity Standards, this grievance is tracked canonically under Case Reference{' '}
                  <strong className="font-mono text-slate-900">{complaint.id}</strong>. No redundant secondary docket exists.
                </p>
              </div>

              {isAdmittedStatus && (
                <Link
                  to={`/cases/${complaint.id}`}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded border border-indigo-300 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>Open Full Case</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Linked / Consolidated Cases Section */}
            {complaint.linked_cases && complaint.linked_cases.length > 0 && (
              <div className="mt-4 pt-3 border-t border-indigo-100">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Consolidated & Linked Grievances ({complaint.linked_cases.length})</span>
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded">
                  {complaint.linked_cases.map((rel) => (
                    <div key={rel.id} className="p-2.5 flex items-center justify-between text-xs bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/complaint-intake/${rel.related_case_id}`}
                            className="font-mono font-bold text-[#092D62] hover:underline"
                          >
                            {rel.related_case_id}
                          </Link>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded">
                            {rel.relationship_type}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Status: {rel.case_status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {rel.institution_name} • {rel.title}
                        </p>
                        {rel.remarks && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">Note: {rel.remarks}</p>
                        )}
                      </div>
                      <Link
                        to={`/cases/${rel.related_case_id}`}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
                        title="View Linked Case"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grievance Substance Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#092D62] uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FFB900]" />
              <span>Grievance Particulars & Substance</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Category & Subcategory
                </label>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-slate-800">{complaint.category}</span>
                  {complaint.subcategory && (
                    <span className="text-xs text-slate-500 italic">
                      • {complaint.subcategory}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Detailed Complaint Description
                </label>
                <div className="mt-1.5 p-4 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {complaint.description}
                </div>
              </div>
            </div>
          </div>

          {/* AI Duplicate & Overlap Intelligence Panel (Phase 6) */}
          <AIDuplicatePanel
            complaint={complaint}
            onVerificationSuccess={loadComplaint}
          />

          {/* Status History & Scrutiny Timeline (Feature 3) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#092D62] uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFB900]" />
              <span>Dossier Milestones & Audit Trail</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Timeline */}
              <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Public Citizen Timeline</span>
                </h4>
                {complaint.public_history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No public milestones recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {complaint.public_history.map((ev) => (
                      <div key={ev.id} className="text-xs border-l-2 border-blue-500 pl-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{ev.new_value || ev.event_type}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        {ev.remarks && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{ev.remarks}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">By: {ev.actor_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Scrutiny Notes */}
              <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Internal Council Scrutiny & Notes</span>
                </h4>
                {complaint.internal_notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No confidential officer notes recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {complaint.internal_notes.map((note) => (
                      <div key={note.id} className="text-xs border-l-2 border-amber-500 pl-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{note.event_type}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(note.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-0.5">{note.remarks}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Officer: {note.actor_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Officer Assignment Chain of Custody */}
            {complaint.assignments && complaint.assignments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Officer Chain of Custody</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-2">Assigned Officer</th>
                        <th className="p-2">Allocated By</th>
                        <th className="p-2">Bureau</th>
                        <th className="p-2">Directive / Remarks</th>
                        <th className="p-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {complaint.assignments.map((asg) => (
                        <tr key={asg.id}>
                          <td className="p-2 font-bold text-slate-800">{asg.to_officer_name}</td>
                          <td className="p-2 text-slate-600">{asg.assigned_by_name}</td>
                          <td className="p-2 font-mono">{asg.bureau_code}</td>
                          <td className="p-2 text-slate-600">{asg.remarks || 'Standard intake allocation'}</td>
                          <td className="p-2 text-slate-400 whitespace-nowrap">
                            {new Date(asg.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Complainant, Institution, Evidence Vault */}
        <div className="lg:col-span-4 space-y-6">
          {/* Complainant Profile Card (Feature 3 - Privacy Scoped) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#092D62] uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#FFB900]" />
              <span>Complainant Profile</span>
            </h3>

            {complaint.complainant && !complaint.complainant.pii_redacted ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Full Legal Name</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{complaint.complainant.full_name}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Email Address</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-800">{complaint.complainant.email}</span>
                    {complaint.complainant.is_email_verified && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">Verified</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Mobile Number</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-800">{complaint.complainant.mobile}</span>
                    {complaint.complainant.is_mobile_verified && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">Verified</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Stakeholder Category</span>
                  <p className="text-slate-800 font-semibold mt-0.5">{complaint.complainant.complainant_type || 'Student'}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>PII Redacted for Privacy</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Citizen identifier is masked as <strong className="font-mono text-slate-700">{complaint.complainant?.masked_identifier || 'CIT-ANON'}</strong>.
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5 italic">
                  Full complainant contact information is restricted to Bureau Heads, Super Admins, and the specifically assigned officer.
                </p>
              </div>
            )}
          </div>

          {/* Technical Institution Profile Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#092D62] uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FFB900]" />
                <span>Respondent Institution</span>
              </span>
              {complaint.institution.id && (
                <Link
                  to={`/institutions/${complaint.institution.id}`}
                  className="text-[10px] text-[#092D62] hover:underline flex items-center gap-0.5"
                >
                  <span>Dossier</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              )}
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <p className="font-bold text-slate-900 leading-snug">{complaint.institution.official_name}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">AICTE PID: {complaint.institution.permanent_id}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <p>District: <strong>{complaint.institution.district}</strong></p>
                <p>State: <strong>{complaint.institution.state}</strong></p>
                <p>Region: <strong>{complaint.institution.region}</strong></p>
              </div>
            </div>
          </div>

          {/* Supporting Evidence Vault (Feature 3 & 7) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-[#092D62] uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#FFB900]" />
                <span>Supporting Evidence Vault ({complaint.documents.length})</span>
              </h3>
            </div>

            {complaint.documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No supporting documents uploaded by complainant.</p>
            ) : (
              <div className="space-y-2">
                {complaint.documents.map((doc) => {
                  const isConfidential = doc.access_classification.includes('Bureau Head Only');
                  const isDownloading = downloadingDocId === doc.id;
                  const kbSize = Math.round(doc.file_size / 1024);

                  return (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-col gap-2 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate" title={doc.original_filename}>
                            {doc.original_filename}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{kbSize} KB</span>
                            <span>•</span>
                            <span className="uppercase">{doc.file_type.split('/')[1] || 'DOC'}</span>
                          </div>
                        </div>

                        {isConfidential && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                            Confidential
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.original_filename)}
                        disabled={isDownloading}
                        className="w-full mt-1 py-1 px-2.5 bg-white border border-slate-300 hover:border-[#092D62] text-[#092D62] text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                        <span>{isDownloading ? 'Streaming Document...' : 'Secure Download'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ACCEPT COMPLAINT (Feature 4 & 6) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        title="Statutory Admission & Case Docket Acceptance"
        subtitle={`Complaint Reference: ${complaint.id} • AICTE PGRC`}
      >
        <form onSubmit={handleAcceptSubmit} className="space-y-4 p-5">
          <p className="text-xs text-slate-600">
            Admitting this complaint marks preliminary scrutiny as complete and transitions the matter to{' '}
            <strong className="text-slate-900">In Progress</strong>. The grievance will be admitted directly into the Council inquiry docket.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Inquiry Priority Level
            </label>
            <select
              value={acceptForm.priority}
              onChange={(e) => setAcceptForm({ ...acceptForm, priority: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
            >
              <option value="Critical">Critical (Immediate High-Risk / Safety / Sexual Harassment)</option>
              <option value="High">High (Substantial Capitation / Anti-Ragging / Denial of Records)</option>
              <option value="Medium">Medium (Regulatory & Curricular Compliance)</option>
              <option value="Low">Low (General Administrative Clarification)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Designated Bureau Jurisdiction
            </label>
            <select
              value={acceptForm.target_bureau_id || ''}
              onChange={(e) => setAcceptForm({ ...acceptForm, target_bureau_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
            >
              {(metadata?.bureaus || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Admission Order Remarks (Public Citizen Milestone)
            </label>
            <textarea
              rows={3}
              value={acceptForm.remarks}
              onChange={(e) => setAcceptForm({ ...acceptForm, remarks: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
              placeholder="Provide admission directives..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAcceptModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Admitting Complaint...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: STATUTORY REJECTION (Feature 4) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Statutory Non-Admissibility & Rejection Order"
        subtitle={`Complaint Reference: ${complaint.id} • Mandatory Legal Grounds`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4 p-5">
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900">
            <p className="font-bold">Formal Non-Admissibility Notice</p>
            <p className="text-[11px] mt-0.5 text-red-800">
              Under AICTE Regulations, rejection of a grievance requires valid statutory basis and detailed written justification.
              This decision will be communicated to the citizen with statutory finality.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statutory Rejection Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={rejectForm.statutory_reason}
              onChange={(e) => setRejectForm({ ...rejectForm, statutory_reason: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-red-600 outline-none"
              required
            >
              {(metadata?.statutory_rejection_reasons || [
                'Sub-judice Matter (Pending before Court of Law)',
                'Grievance does not fall under AICTE Mandate / Jurisdiction',
                'Commercial / Service Contract Dispute',
                'Anonymous / Vexatious Complaint devoid of substantiation',
                'Matter already disposed of with finality',
                'Other Statutory Ground'
              ]).map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Legal & Regulatory Justification <span className="text-red-600">* (Min 10 characters)</span>
            </label>
            <textarea
              rows={4}
              value={rejectForm.remarks}
              onChange={(e) => setRejectForm({ ...rejectForm, remarks: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="State the legal, statutory, or factual reasons why this grievance cannot be entertained under AICTE regulations..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-rose-700 text-white hover:bg-rose-800 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Issuing Order...' : 'Issue Rejection Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: REQUEST ADDITIONAL INFORMATION (Feature 4) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRequestInfoModalOpen}
        onClose={() => setIsRequestInfoModalOpen(false)}
        title="Request Additional Information / Documentary Proof"
        subtitle={`Complaint Reference: ${complaint.id} • Citizen Clarification Workflow`}
      >
        <form onSubmit={handleRequestInfoSubmit} className="space-y-4 p-5">
          <p className="text-xs text-slate-600">
            Issue a formal directive to the complainant requesting specific clarifications or missing evidentiary documents.
            The complaint status will change to <strong className="text-slate-900">Additional Information Required</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Council Clarification Query <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={requestInfoForm.query_details}
              onChange={(e) => setRequestInfoForm({ ...requestInfoForm, query_details: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Specify the exact questions or clarifications required..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Required Documentary Proof (Optional)
            </label>
            <input
              type="text"
              value={requestInfoForm.required_documents}
              onChange={(e) => setRequestInfoForm({ ...requestInfoForm, required_documents: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="e.g. Fee payment receipts, official communication letter..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Complainant Response Window (Days)
            </label>
            <input
              type="number"
              min={3}
              max={60}
              value={requestInfoForm.deadline_days}
              onChange={(e) => setRequestInfoForm({ ...requestInfoForm, deadline_days: Number(e.target.value) })}
              className="w-32 p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRequestInfoModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Dispatching...' : 'Dispatch Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 4: ASSIGN OFFICER (Feature 4 & 5) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Investigating Officer Allocation & Bureau Routing"
        subtitle={`Complaint Reference: ${complaint.id} • Chain of Custody`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 p-5">
          <p className="text-xs text-slate-600">
            Allocate an active authorized officer to take charge of this grievance.
            An immutable audit record will be logged in the Council Chain of Custody.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Investigating Officer <span className="text-red-600">*</span>
            </label>
            <select
              value={assignForm.to_officer_id}
              onChange={(e) => setAssignForm({ ...assignForm, to_officer_id: Number(e.target.value) })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
              required
            >
              <option value="0">-- Select Active Authorized Officer --</option>
              {availableOfficers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.full_name} ({off.role.replace('_', ' ')}) • {off.bureau_code || 'General'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bureau Re-routing (Optional)
            </label>
            <select
              value={assignForm.bureau_id || ''}
              onChange={(e) => setAssignForm({ ...assignForm, bureau_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
            >
              <option value="">Keep Current Bureau ({complaint.current_bureau.name})</option>
              {(metadata?.bureaus || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Allocation Directives & Instructions (Internal)
            </label>
            <textarea
              rows={3}
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#092D62] outline-none"
              placeholder="e.g. Conduct preliminary inspection within 14 days and submit status report..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-[#092D62] text-white hover:bg-[#123C7B] text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 5: LINK CASE / CONSOLIDATE (Feature 4 & 6) */}
      {/* ============================================================ */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Consolidate / Link with Existing AICTE Case"
        subtitle={`Primary Complaint: ${complaint.id} • Multi-Grievance Dossier`}
      >
        <form onSubmit={handleLinkSubmit} className="space-y-4 p-5">
          <p className="text-xs text-slate-600">
            Consolidate this complaint with an existing case record.
            Both matters retain independent citizen ownership and notification tracking while sharing operational investigation findings.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Case Reference ID <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={linkForm.target_case_id}
              onChange={(e) => setLinkForm({ ...linkForm, target_case_id: e.target.value })}
              className="w-full p-2 font-mono text-xs border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 outline-none"
              placeholder="e.g. AICTE-CASE-2025-001"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Relationship Type
            </label>
            <select
              value={linkForm.relationship_type}
              onChange={(e) => setLinkForm({ ...linkForm, relationship_type: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 outline-none"
            >
              <option value="Consolidated Grievance">Consolidated Grievance (Multiple complaints against same violation)</option>
              <option value="Institutional Recidivism">Institutional Recidivism (Repeated institutional violations)</option>
              <option value="Related Incident">Related Incident (Connected institutional events)</option>
              <option value="Duplicate Lodging">Duplicate Lodging (Identical matter by same/related party)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Consolidation Remarks
            </label>
            <textarea
              rows={3}
              value={linkForm.remarks}
              onChange={(e) => setLinkForm({ ...linkForm, remarks: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 outline-none"
              placeholder="State reason for consolidation..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Linking...' : 'Confirm Consolidation'}
            </button>
          </div>
        </form>
      </Modal>
      {/* ============================================================ */}
      {/* MODAL 6: RESOLVE GRIEVANCE */}
      {/* ============================================================ */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Record Formal Grievance Resolution"
        subtitle={`Complaint Reference: ${complaint.id} • AICTE Inquiry Adjudication`}
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4 p-5">
          <p className="text-xs text-slate-600">
            Record the official resolution determination for this grievance. The complainant will receive a formal notification, and the public timeline will record this statutory milestone.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Resolution Findings & Determination <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={4}
              value={resolveForm.resolution_findings}
              onChange={(e) => setResolveForm({ ...resolveForm, resolution_findings: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-600 outline-none"
              placeholder="Detail the investigation outcome, institutional compliance verification, and directives issued..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statutory Action Taken
            </label>
            <input
              type="text"
              value={resolveForm.action_taken}
              onChange={(e) => setResolveForm({ ...resolveForm, action_taken: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-600 outline-none"
              placeholder="e.g. Compliance directive issued, Refund ordered, Inspection completed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Additional Public / Timeline Remarks (Optional)
            </label>
            <input
              type="text"
              value={resolveForm.remarks}
              onChange={(e) => setResolveForm({ ...resolveForm, remarks: e.target.value })}
              className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-600 outline-none"
              placeholder="Optional remarks visible in public status history"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Recording Resolution...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 7: CLOSE MATTER */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Formally Close Grievance Matter"
        subtitle={`Complaint Reference: ${complaint.id} • Final Statutory Disposal`}
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4 p-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
            <p className="font-bold mb-1">Final Statutory Action</p>
            <p>
              Closing this matter marks the case docket as permanently disposed in Council records.
              The citizen complainant will be notified of formal matter closure.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final Closure Remarks
            </label>
            <textarea
              rows={3}
              value={closeForm.closure_remarks}
              onChange={(e) => setCloseForm({ ...closeForm, closure_remarks: e.target.value })}
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-slate-700 outline-none"
              placeholder="State final docket disposal summary..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Closing Docket...' : 'Formally Close Matter'}
            </button>
          </div>
        </form>
      </Modal>
      {/* ============================================================ */}
      {/* MODAL 7: INITIATE CROSS-BUREAU COORDINATION (Phase 7) */}
      {/* ============================================================ */}
      <CreateWorkspaceModal
        isOpen={isCoordinationModalOpen}
        onClose={() => setIsCoordinationModalOpen(false)}
        onCreated={(ws) => {
          navigate('/coordination?workspaceId=' + ws.id);
        }}
        initialCaseId={complaint.id}
      />
    </div>
  );
};

export default OfficerComplaintReviewPage;

