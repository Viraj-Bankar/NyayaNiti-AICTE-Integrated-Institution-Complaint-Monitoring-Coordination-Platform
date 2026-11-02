import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ComplainantHeader } from '../components/common/ComplainantHeader';
import { GrievanceReceiptModal } from '../components/complainant/GrievanceReceiptModal';
import { api } from '../services/api';
import {
  ComplainantInstitutionItem,
  ComplainantCategoryItem,
  ComplainantCaseItem,
  ComplainantReceipt
} from '../types';
import {
  FileText, CheckCircle2, AlertTriangle,
  Paperclip, Send, ArrowRight, Shield, Printer, Check, Copy, X
} from 'lucide-react';

export const ComplaintSubmissionPage: React.FC = () => {
  // Reference data
  const [institutions, setInstitutions] = useState<ComplainantInstitutionItem[]>([]);
  const [categories, setCategories] = useState<ComplainantCategoryItem[]>([]);
  const [isLoadingRefData, setIsLoadingRefData] = useState(true);

  // Form inputs
  const [instSearch, setInstSearch] = useState('');
  const [selectedInstId, setSelectedInstId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState('Fee Receipt / Bank Proof');
  const [isDeclared, setIsDeclared] = useState(false);

  // Submission state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCase, setSubmittedCase] = useState<ComplainantCaseItem | null>(null);

  // Receipt Modal state
  const [receiptData, setReceiptData] = useState<ComplainantReceipt | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setIsLoadingRefData(true);
        const [insts, cats] = await Promise.all([
          api.getComplainantInstitutions(),
          api.getComplainantCategories()
        ]);
        setInstitutions(insts || []);
        setCategories(cats || []);
        if (cats && cats.length > 0) {
          setCategory(cats[0].name);
        }
      } catch (err: any) {
        setBackendError('Failed to load institution directory or categories. Please refresh.');
      } finally {
        setIsLoadingRefData(false);
      }
    };
    fetchReferenceData();
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!instSearch.trim()) return institutions;
    const q = instSearch.toLowerCase();
    return institutions.filter(inst =>
      inst.official_name.toLowerCase().includes(q) ||
      inst.permanent_id.toLowerCase().includes(q) ||
      inst.city.toLowerCase().includes(q) ||
      inst.state.toLowerCase().includes(q)
    );
  }, [institutions, instSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({
        ...prev,
        file: 'File size exceeds maximum permitted limit of 5 MB.'
      }));
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'docx'];
    if (!ext || !allowed.includes(ext)) {
      setFieldErrors(prev => ({
        ...prev,
        file: 'Unsupported file format. Allowed formats: PDF, PNG, JPG, JPEG, DOCX.'
      }));
      return;
    }

    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
    setSelectedFile(file);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Please provide a clear complaint subject (minimum 3 characters).';
    }
    if (!selectedInstId) {
      errors.institution = 'Please select the respondent AICTE approved institution.';
    }
    if (!category.trim()) {
      errors.category = 'Please choose an approved statutory category.';
    }
    if (!description.trim() || description.trim().length < 20) {
      errors.description = 'Please provide detailed factual narrative (minimum 20 characters).';
    }
    if (!isDeclared) {
      errors.declaration = 'You must confirm the legal accuracy of this grievance before submission.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError(null);

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newCase = await api.submitComplainantComplaint({
        title: title.trim(),
        institution_id: Number(selectedInstId),
        category,
        subcategory: subcategory.trim() || undefined,
        description: description.trim()
      });

      // Upload file if selected
      if (selectedFile) {
        try {
          await api.uploadComplainantDocument(newCase.id, selectedFile, fileCategory);
        } catch (uploadErr: any) {
          console.warn('Document upload warning:', uploadErr);
        }
      }

      setSubmittedCase(newCase);
    } catch (err: any) {
      setBackendError(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceipt = async () => {
    if (!submittedCase) return;
    try {
      const receipt = await api.getComplainantReceipt(submittedCase.id);
      setReceiptData(receipt);
    } catch (err: any) {
      alert(`Receipt generation failed: ${err.message}`);
    }
  };

  const handleCopyRef = () => {
    if (!submittedCase) return;
    navigator.clipboard.writeText(submittedCase.id);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleResetForm = () => {
    setSubmittedCase(null);
    setTitle('');
    setSelectedInstId('');
    setInstSearch('');
    setSubcategory('');
    setDescription('');
    setSelectedFile(null);
    setIsDeclared(false);
    setFieldErrors({});
    setBackendError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      <ComplainantHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/complainant/home" className="hover:text-[#092D62]">Citizen Portal</Link>
          <span>/</span>
          <span className="font-bold text-[#061E46]">Lodging New Institutional Grievance</span>
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* SUCCESS SCREEN (Rendered after successful backend confirmation) */}
        {/* ------------------------------------------------------------- */}
        {submittedCase ? (
          <div className="bg-white rounded-2xl border-2 border-emerald-400 p-6 sm:p-10 shadow-lg space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Official Lodging Confirmed • AICTE Central Registry
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#061E46]">
                Grievance Successfully Registered
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your petition has been securely recorded and routed to the Public Grievance Redressal Cell (PGRC) for statutory scrutiny.
              </p>
            </div>

            {/* Reference Number Callout Box */}
            <div className="bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#1E5AA8] text-white p-5 rounded-xl shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-[#FFB900] tracking-wider block">
                  Public Grievance Reference Identifier
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-white select-all">
                  {submittedCase.id}
                </span>
              </div>
              <button
                onClick={handleCopyRef}
                className="btn-3d-amber px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? 'Copied!' : 'Copy Reference'}</span>
              </button>
            </div>

            {/* Submission Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Complaint Title</span>
                <p className="font-bold text-[#061E46]">{submittedCase.title || submittedCase.category}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Respondent Institution</span>
                <p className="font-bold text-slate-800">{submittedCase.institution_name}</p>
                <span className="text-[10px] text-slate-500 font-mono">Permanent ID: {submittedCase.permanent_id}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Statutory Category</span>
                <p className="font-bold text-amber-800">{submittedCase.category}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Initial Status</span>
                <p>
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    {submittedCase.status}
                  </span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Filing Timestamp</span>
                <p className="font-mono text-slate-700">
                  {new Date(submittedCase.date_received).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Prescribed Target Resolution</span>
                <p className="font-bold text-[#092D62]">
                  {new Date(submittedCase.prescribed_deadline).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              <button
                onClick={handleOpenReceipt}
                className="btn-3d-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs hover:text-[#092D62]"
              >
                <Printer className="w-4 h-4 text-[#1E5AA8]" />
                <span>View / Print Acknowledgment Slip</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Submit Another Grievance
                </button>
                <Link
                  to={`/complainant/complaints/${submittedCase.id}`}
                  className="btn-3d-amber px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Track Grievance Progression</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* COMPLAINT SUBMISSION FORM */
          /* ------------------------------------------------------------- */
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4 space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#092D62]">
                <Shield className="w-3.5 h-3.5" />
                <span>AICTE Statutory Public Grievance Form</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#061E46]">
                Submit Institutional Grievance
              </h1>
              <p className="text-xs text-slate-500">
                Provide factual details regarding non-compliance, overcharging, document retention, or irregularities by AICTE-approved institutions.
              </p>
            </div>

            {backendError && (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{backendError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Complaint Title */}
              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Complaint Title / Subject Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={250}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unapproved Development Fee Surcharge Without Official Receipt"
                  className={`w-full text-xs p-3 rounded-lg border ${
                    fieldErrors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#092D62]`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{fieldErrors.title}</p>
                )}
                <span className="text-[10px] text-slate-400 block mt-1">
                  Provide a concise, factual 1-line subject summary.
                </span>
              </div>

              {/* 2. Respondent Institution Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#061E46]">
                  Select AICTE Approved Institution <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={instSearch}
                    onChange={(e) => setInstSearch(e.target.value)}
                    placeholder="Search by Institution Name, Permanent ID (e.g. 1-10293847), or City..."
                    className="w-full text-xs p-2.5 rounded-t-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#092D62]"
                  />
                </div>
                <select
                  required
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full text-xs p-3 rounded-b-lg border ${
                    fieldErrors.institution ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                  } bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]`}
                >
                  <option value="">
                    {isLoadingRefData ? 'Loading institutions directory...' : `-- Choose Institution (${filteredInstitutions.length} found) --`}
                  </option>
                  {filteredInstitutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name} (Permanent ID: {inst.permanent_id}) — {inst.city}, {inst.state}
                    </option>
                  ))}
                </select>
                {fieldErrors.institution && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{fieldErrors.institution}</p>
                )}
              </div>

              {/* 3. Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#061E46] mb-1">
                    Statutory Grievance Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  >
                    {categories.map((cat, i) => (
                      <option key={i} value={cat.name}>
                        {cat.name} (SLA: {cat.sla_days} days)
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{fieldErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#061E46] mb-1">
                    Specific Subcategory / Allegation Type
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Tuition Fee Surcharge, Biometric Deficit"
                    maxLength={150}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Optional classification subcategory.</span>
                </div>
              </div>

              {/* 4. Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Detailed Factual Description & Allegation Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  minLength={20}
                  maxLength={10000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide chronological narrative specifying dates, department/program name, names of concerned officials, demanded fees, and exact statutory violations..."
                  className={`w-full text-xs p-3 rounded-lg border ${
                    fieldErrors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#092D62]`}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>Minimum 20 characters required.</span>
                  <span>{description.length} / 10,000 characters</span>
                </div>
                {fieldErrors.description && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{fieldErrors.description}</p>
                )}
              </div>

              {/* 5. Supporting Document Upload */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#061E46]">
                    <Paperclip className="w-4 h-4 text-[#1E5AA8]" />
                    <span>Upload Supporting Evidentiary Document (Optional)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Max 5 MB</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Document Classification</label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Fee Receipt / Bank Proof">Fee Receipt / Bank Proof</option>
                      <option value="Official Correspondence">Official Correspondence</option>
                      <option value="Affidavit / Statutory Undertaking">Affidavit / Statutory Undertaking</option>
                      <option value="Inspection Photographic Evidence">Inspection Photographic Evidence</option>
                      <option value="Other Supporting Record">Other Supporting Record</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Select File</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#092D62] file:text-white hover:file:bg-[#061E46] cursor-pointer"
                    />
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({Math.round(selectedFile.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Remove document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {fieldErrors.file && (
                  <p className="text-[11px] text-red-600 font-medium">{fieldErrors.file}</p>
                )}

                <span className="text-[10px] text-slate-400 block">
                  Accepted formats: PDF, PNG, JPG, JPEG, DOCX. Executable and script files are strictly blocked.
                </span>
              </div>

              {/* 6. Confirmation Declaration Checkbox */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={isDeclared}
                    onChange={(e) => setIsDeclared(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#092D62] rounded border-slate-300 focus:ring-[#092D62] cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-[#061E46]">Statutory Declaration:</strong> I hereby declare that the facts stated in this complaint and documents attached are true, correct, and within my personal knowledge. I understand that submitting false, malicious, or fabricated allegations is a punishable offense under applicable statutory regulations.
                  </span>
                </label>
                {fieldErrors.declaration && (
                  <p className="text-[11px] text-red-600 font-medium pl-7">{fieldErrors.declaration}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <Link
                  to="/complainant/home"
                  className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting || !isDeclared}
                  className="btn-3d-amber px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting to AICTE PGRC...' : 'Submit Grievance'}</span>
                </button>
              </div>
            </form>
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

export default ComplaintSubmissionPage;
