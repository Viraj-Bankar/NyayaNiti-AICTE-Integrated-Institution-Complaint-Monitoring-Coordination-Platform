import React, { useState, useEffect } from 'react';
import { complianceApi, api } from '../services/api';
import { ComplianceEvidence, Institution } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import { ReviewEvidenceModal } from '../components/compliance/ReviewEvidenceModal';
import {
  FileCheck2, Filter, Search, Download, CheckCircle2,
  XCircle, Clock, AlertCircle, RefreshCw, Paperclip
} from 'lucide-react';

export const EvidenceReviewPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [evidenceList, setEvidenceList] = useState<ComplianceEvidence[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Review modal
  const [evidenceToReview, setEvidenceToReview] = useState<ComplianceEvidence | null>(null);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  useEffect(() => {
    loadEvidenceData();
  }, [statusFilter, institutionFilter]);

  const loadEvidenceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [evData, instsData] = await Promise.all([
        complianceApi.listEvidence({
          verification_status: statusFilter === 'ALL' ? undefined : statusFilter,
          institution_id: institutionFilter === 'ALL' ? undefined : parseInt(institutionFilter, 10)
        }),
        api.getInstitutions().catch(() => [])
      ]);

      setEvidenceList(evData);
      setInstitutions(instsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance evidence items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (evidence: ComplianceEvidence) => {
    setIsDownloading(evidence.id);
    try {
      const token = localStorage.getItem('nyayaniti_token');
      const res = await fetch(`/api/documents/${evidence.document_id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error(`Download failed: HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = evidence.document_name || `evidence_${evidence.id}_doc_${evidence.document_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Secure download error: ${err?.message || 'Unable to stream file'}`);
    } finally {
      setIsDownloading(null);
    }
  };

  const filteredEvidence = evidenceList.filter((e) => {
    const q = searchTerm.toLowerCase();
    return (
      e.evidence_type.toLowerCase().includes(q) ||
      (e.document_name && e.document_name.toLowerCase().includes(q)) ||
      (e.verification_remarks && e.verification_remarks.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>VERIFIED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
            <XCircle className="w-3 h-3" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>SUBMITTED / PENDING</span>
          </span>
        );
    }
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
              <span className="text-[#092D62] font-semibold">Evidence Review Centre</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#FFB900]" />
              Evidentiary Documentation Audit & Scrutiny
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Securely inspect institutional proofs, affidavits, inspection reports, and record binding audit determinations.
            </p>
          </div>

          <button
            onClick={loadEvidenceData}
            className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by evidence type or document title..."
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
              <option value="ALL">All Verification Statuses</option>
              <option value="SUBMITTED">Submitted / Pending Review</option>
              <option value="VERIFIED">Verified & Certified</option>
              <option value="REJECTED">Statutorily Rejected</option>
            </select>

            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.official_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Evidence Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs mt-4 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
              Documentary Proofs Queue ({filteredEvidence.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Only authorized officers can certify or reject evidence
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
              Loading evidentiary items...
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-600">No documentary evidence items found.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Proofs attached to institutional assessments will appear in this review queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Evidence ID</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3">Document Title</th>
                    <th className="p-3">Related Assessment</th>
                    <th className="p-3">Submitter / Role</th>
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Verification Status</th>
                    <th className="p-3">Review Remarks</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvidence.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-[#092D62]">
                        EVD-{e.id}
                      </td>
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                        {e.evidence_type}
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-medium truncate">{e.document_name || `Document #${e.document_id}`}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        Assessment #{e.assessment_id}
                      </td>
                      <td className="p-3 text-slate-600 capitalize">
                        {e.submitted_by_role}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(e.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {getStatusBadge(e.verification_status)}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {e.rejection_reason ? (
                          <span className="text-red-600 font-semibold">Rejected: {e.rejection_reason}</span>
                        ) : (
                          e.verification_remarks || <span className="italic text-slate-400">Awaiting scrutiny</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleDownload(e)}
                          disabled={isDownloading === e.id}
                          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer shadow-xs"
                          title="Stream encrypted document from secure storage"
                        >
                          <Download className="w-3 h-3 inline mr-1 text-[#092D62]" />
                          <span>{isDownloading === e.id ? 'Streaming...' : 'Download'}</span>
                        </button>

                        {hasRole(['super_admin', 'bureau_head', 'monitoring_officer', 'authorized_officer']) && (
                          <button
                            onClick={() => setEvidenceToReview(e)}
                            className="bg-[#092D62] hover:bg-[#061E46] text-white px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer shadow-xs"
                          >
                            Scrutinize
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Scrutiny / Review Modal */}
      {evidenceToReview && (
        <ReviewEvidenceModal
          isOpen={!!evidenceToReview}
          onClose={() => setEvidenceToReview(null)}
          evidence={evidenceToReview}
          onSuccess={(updated: ComplianceEvidence) => {
            setEvidenceList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }}
        />
      )}
    </div>
  );
};

export default EvidenceReviewPage;
