import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import { GrievanceRedressalStepper } from '../components/complainant/GrievanceRedressalStepper';
import { GrievanceReceiptModal } from '../components/complainant/GrievanceReceiptModal';
import { api } from '../services/api';
import {
  ComplainantCaseDetail,
  ComplainantReceipt
} from '../types';
import {
  FileText, Clock, Building2, Calendar, CheckCircle2,
  AlertTriangle, Printer, Paperclip, Upload, ArrowLeft,
  Download, FileCheck, Shield, ChevronRight
} from 'lucide-react';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<ComplainantCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supplementary document upload state
  const [suppFile, setSuppFile] = useState<File | null>(null);
  const [suppDocType, setSuppDocType] = useState('Additional Evidentiary Record');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clarification state
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationFile, setClarificationFile] = useState<File | null>(null);
  const [clarificationCategory, setClarificationCategory] = useState('Clarification Evidence');
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationMsg, setClarificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Receipt modal state
  const [receiptData, setReceiptData] = useState<ComplainantReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const loadComplaintDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getComplainantComplaintDetail(id);
      setDetail(data);
    } catch (err: any) {
      setError(err.message || 'Complaint record not found or access unauthorized.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadComplaintDetail();
  }, [loadComplaintDetail]);

  const handleOpenReceipt = async () => {
    if (!id) return;
    setIsLoadingReceipt(true);
    try {
      const receipt = await api.getComplainantReceipt(id);
      setReceiptData(receipt);
    } catch (err: any) {
      alert(`Unable to generate acknowledgment slip: ${err.message}`);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleUploadSupplementaryDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !suppFile) return;

    if (suppFile.size > 3 * 1024 * 1024) {
      setUploadMsg({ type: 'error', text: 'Document exceeds maximum permitted limit of 3 MB.' });
      return;
    }

    setIsUploading(true);
    setUploadMsg(null);
    try {
      await api.uploadComplainantDocument(id, suppFile, suppDocType);
      setUploadMsg({ type: 'success', text: `Document "${suppFile.name}" attached successfully.` });
      setSuppFile(null);
      await loadComplaintDetail();
    } catch (err: any) {
      setUploadMsg({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (clarificationText.trim().length < 5) {
      setClarificationMsg({ type: 'error', text: 'Please provide a detailed response narrative (at least 5 characters).' });
      return;
    }

    setIsSubmittingClarification(true);
    setClarificationMsg(null);
    try {
      let uploadedDocId: number | undefined;
      if (clarificationFile) {
        if (clarificationFile.size > 3 * 1024 * 1024) {
          throw new Error('Supporting document exceeds maximum permitted limit of 3 MB.');
        }
        const doc = await api.uploadComplainantDocument(id, clarificationFile, clarificationCategory);
        uploadedDocId = doc.id;
      }

      await api.submitComplaintClarification(id, {
        response_text: clarificationText.trim(),
        document_id: uploadedDocId
      });

      setClarificationMsg({
        type: 'success',
        text: 'Clarification transmitted successfully to AICTE PGRC. Your complaint status has returned to Under Review.'
      });
      setClarificationText('');
      setClarificationFile(null);
      await loadComplaintDetail();
    } catch (err: any) {
      setClarificationMsg({ type: 'error', text: err.message || 'Failed to submit clarification.' });
    } finally {
      setIsSubmittingClarification(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('additional') || s.includes('clarification') || s.includes('info required')) {
      return (
        <span className="bg-amber-100 text-amber-900 border border-amber-400 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          Additional Info Required
        </span>
      );
    }
    if (s.includes('disposed') || s.includes('resolved') || s.includes('closed')) {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Resolved / Disposed
        </span>
      );
    }
    if (s.includes('in progress') || s.includes('hearing') || s.includes('under process')) {
      return (
        <span className="bg-blue-100 text-[#092D62] border border-blue-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          In Progress
        </span>
      );
    }
    if (s.includes('under review') || s.includes('scrutiny') || s.includes('allocated')) {
      return (
        <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          Under Review
        </span>
      );
    }
    if (s.includes('rejected')) {
      return (
        <span className="bg-red-100 text-red-800 border border-red-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Submitted
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      <ComplainantHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/complainant/home" className="hover:text-[#092D62]">Citizen Portal</Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link to="/complainant/complaints" className="hover:text-[#092D62]">Complaint History</Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-[#061E46] font-mono">{id}</span>
          </nav>

          <Link
            to="/complainant/complaints"
            className="text-xs font-bold text-[#1E5AA8] hover:text-[#092D62] inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Complaints</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#092D62] mx-auto" />
            <p className="text-xs text-slate-500">Loading verified complaint details & statutory milestones...</p>
          </div>
        ) : error || !detail ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-red-200 shadow-2xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800">Unable to Access Complaint Record</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
            <Link
              to="/complainant/complaints"
              className="btn-3d-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Complaint History</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Header Card with Reference & Status */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm sm:text-base font-black text-[#092D62] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    {detail.id}
                  </span>
                  {getStatusBadge(detail.status)}
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    Bureau: {detail.bureau_code} (PGRC)
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-[#061E46]">
                  {detail.title || detail.category}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <strong>{detail.institution_name}</strong>
                    <span className="font-mono text-[11px] text-slate-400">({detail.permanent_id})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Submitted: {new Date(detail.date_received).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <Clock className="w-4 h-4 text-amber-600" />
                    SLA Target: {new Date(detail.prescribed_deadline).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleOpenReceipt}
                  disabled={isLoadingReceipt}
                  className="btn-3d-amber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Acknowledgment Slip</span>
                </button>
              </div>
            </div>

            {/* 2. 5-Stage Statutory Progress Stepper */}
            <GrievanceRedressalStepper status={detail.status} events={detail.events} />

            {/* 2b. Action Required: Clarification & Additional Details Form */}
            {detail.status.toLowerCase().includes('additional') && (
              <div className="bg-amber-50/90 border-2 border-amber-400 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#061E46]">
                        Action Required: Additional Information Requested by Bureau
                      </h3>
                      <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Pending Complainant Response
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      AICTE Public Grievance Redressal Cell requires supplementary clarification or evidentiary proof to advance investigation into your complaint.
                    </p>
                    {detail.last_action && (
                      <div className="mt-2 p-3 bg-white/95 rounded-xl border border-amber-300 text-xs shadow-2xs space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-amber-900 block">
                          Officer Instructions / Specific Requisition:
                        </span>
                        <p className="text-slate-800 font-semibold">{detail.last_action}</p>
                      </div>
                    )}
                  </div>
                </div>

                {clarificationMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      clarificationMsg.type === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {clarificationMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
                    )}
                    <span>{clarificationMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitClarification} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Your Response / Clarification Narrative <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={clarificationText}
                      onChange={(e) => setClarificationText(e.target.value)}
                      placeholder="Provide specific factual details, dates, transaction references, or explanatory statements requested above..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#092D62] text-slate-800 shadow-2xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Attach Evidentiary Document (Optional)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setClarificationFile(e.target.files[0]);
                          }
                        }}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#092D62] file:text-white hover:file:bg-[#061E46] cursor-pointer bg-white p-1 rounded-xl border border-slate-300"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        PDF, PNG, JPG, JPEG, DOCX (Max 3 MB).
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Document Classification Category
                      </label>
                      <select
                        value={clarificationCategory}
                        onChange={(e) => setClarificationCategory(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                      >
                        <option value="Clarification Evidence">Clarification Evidence</option>
                        <option value="Fee Receipt / Bank Proof">Fee Receipt / Bank Proof</option>
                        <option value="Official Correspondence">Official Correspondence</option>
                        <option value="Affidavit / Statutory Undertaking">Affidavit / Statutory Undertaking</option>
                        <option value="Other Supporting Record">Other Supporting Record</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingClarification || !clarificationText.trim()}
                      className="btn-3d-amber px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isSubmittingClarification ? 'Submitting Clarification...' : 'Submit Clarification to AICTE PGRC'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Factual Details & Chronological Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Factual Allegation Details Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#061E46] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1E5AA8]" />
                      <span>Factual Allegation & Grievance Information</span>
                    </h3>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      {detail.category}
                    </span>
                  </div>

                  {detail.subcategory && (
                    <div className="text-xs">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Specific Subcategory</span>
                      <span className="font-semibold text-slate-800">{detail.subcategory}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Factual Narrative</span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                      {detail.description}
                    </p>
                  </div>

                  {detail.last_action && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-[#092D62] block">Latest Bureau Action</span>
                      <p className="text-slate-700">{detail.last_action}</p>
                      {detail.last_action_date && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Recorded: {new Date(detail.last_action_date).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chronological Public Timeline */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#061E46] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1E5AA8]" />
                      <span>Official Public Redressal Timeline</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      {detail.events?.length || 0} Milestones
                    </span>
                  </div>

                  {detail.events && detail.events.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-200 pl-7">
                      {detail.events.map((ev, i) => (
                        <div key={i} className="relative space-y-1">
                          <div className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-[#092D62] border-2 border-white shadow-xs" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#061E46]">{ev.event_type}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(ev.timestamp).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {ev.remarks && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              {ev.remarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-50 rounded-xl">
                      Grievance submitted in registry. Preliminary officer scrutiny in progress.
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Statutory Privacy Guarantee: Public milestone updates reflect official determinations. Internal administrative notes are protected from leakage.</span>
                  </div>
                </div>
              </div>

              {/* Right Col: Respondent Institution & Supporting Evidentiary Documents */}
              <div className="space-y-6">
                {/* Respondent Institution Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#061E46] flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Building2 className="w-4 h-4 text-[#1E5AA8]" />
                    <span>Respondent Institution</span>
                  </h3>

                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900">{detail.institution_name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">Permanent ID: {detail.permanent_id}</p>
                  </div>
                </div>

                {/* Supporting Documents Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#061E46] flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#1E5AA8]" />
                      <span>Evidentiary Documents</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      {detail.documents?.length || 0} Attached
                    </span>
                  </div>

                  {/* Document List */}
                  {detail.documents && detail.documents.length > 0 ? (
                    <div className="space-y-2">
                      {detail.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-[#061E46] truncate">
                                {doc.original_filename || doc.file_name}
                              </p>
                              <span className="text-[10px] text-slate-500">
                                {doc.category || 'Evidence'} • {Math.round(doc.file_size / 1024)} KB
                              </span>
                            </div>
                          </div>

                          <a
                            href={api.getComplainantDocumentDownloadUrl(detail.id, doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#092D62] hover:bg-slate-100 transition-colors flex-shrink-0"
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl text-center">
                      No documents attached yet. You can attach supporting evidence below.
                    </p>
                  )}

                  {/* Supplementary Document Upload Form */}
                  <form onSubmit={handleUploadSupplementaryDoc} className="pt-3 border-t border-slate-100 space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Attach Supplementary Evidence
                    </span>

                    {uploadMsg && (
                      <div
                        className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                          uploadMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-red-50 text-red-800 border border-red-300'
                        }`}
                      >
                        {uploadMsg.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span>{uploadMsg.text}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <select
                        value={suppDocType}
                        onChange={(e) => setSuppDocType(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Fee Receipt / Bank Proof">Fee Receipt / Bank Proof</option>
                        <option value="Official Correspondence">Official Correspondence</option>
                        <option value="Affidavit / Statutory Undertaking">Affidavit / Statutory Undertaking</option>
                        <option value="Inspection Photographic Evidence">Inspection Photographic Evidence</option>
                        <option value="Other Supporting Record">Other Supporting Record</option>
                      </select>

                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSuppFile(e.target.files[0]);
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#092D62] file:text-white hover:file:bg-[#061E46] cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!suppFile || isUploading}
                      className="btn-3d-amber w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Uploading Evidence...' : 'Upload Supplementary Record'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 block text-center">
                      Supported: PDF, PNG, JPG, JPEG, DOCX (Max 3 MB).
                    </span>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Statutory Acknowledgment Slip Modal */}
        <GrievanceReceiptModal
          receipt={receiptData}
          onClose={() => setReceiptData(null)}
        />
      </main>
    </div>
  );
};

export default ComplaintDetailPage;
