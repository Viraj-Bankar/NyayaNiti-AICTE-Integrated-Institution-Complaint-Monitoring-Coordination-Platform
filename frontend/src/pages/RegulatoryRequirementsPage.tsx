import React, { useState, useEffect } from 'react';
import { complianceApi } from '../services/api';
import { RegulatoryRequirement, RegulatoryRequirementVersion } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import { CreateRequirementModal } from '../components/compliance/CreateRequirementModal';
import { UpdateRequirementModal } from '../components/compliance/UpdateRequirementModal';
import {
  BookOpen, PlusCircle, Search, Filter, History, ExternalLink,
  CheckCircle2, AlertCircle, Edit, Calendar, Tag, Shield
} from 'lucide-react';

export const RegulatoryRequirementsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<RegulatoryRequirement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [reqToUpdate, setReqToUpdate] = useState<RegulatoryRequirement | null>(null);

  const bureaus = [
    { id: 1, code: 'APPROVAL', name: 'Approval Bureau' },
    { id: 2, code: 'POLICY_ACAD', name: 'Policy and Academic Planning Bureau' },
    { id: 3, code: 'ADMIN', name: 'Administration Bureau' },
    { id: 4, code: 'FINANCE', name: 'Finance Bureau' },
    { id: 5, code: 'RIFD', name: 'Research, Institutional & Faculty Development' },
    { id: 6, code: 'LEGAL', name: 'Legal Cell' }
  ];

  useEffect(() => {
    loadRequirements();
  }, [typeFilter, statusFilter]);

  const loadRequirements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await complianceApi.listRequirements({
        institution_type: typeFilter === 'ALL' ? undefined : typeFilter,
        is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE'
      });
      setRequirements(data);
      if (data.length > 0 && !selectedReq) {
        // Fetch detailed version trail for the first item
        loadRequirementDetails(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load regulatory requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequirementDetails = async (id: string) => {
    try {
      const detail = await complianceApi.getRequirement(id);
      setSelectedReq(detail);
    } catch (err: any) {
      console.warn('Could not load requirement detail:', err);
    }
  };

  const filteredRequirements = requirements.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.regulatory_source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
              <span className="text-[#092D62] font-semibold">Regulatory Requirements Centre</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#FFB900]" />
              AICTE Regulatory Requirements & Promulgation Registry
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Authoritative catalogue of statutory mandates, approval handbook clauses, and immutable version trails.
            </p>
          </div>

          {hasRole(['super_admin', 'bureau_head']) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>Promulgate New Mandate</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, title, or statutory source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Institution Types</option>
              <option value="ENGINEERING">Engineering & Technology</option>
              <option value="MANAGEMENT">Management / MBA</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="POLYTECHNIC">Polytechnic</option>
              <option value="ARCHITECTURE">Architecture & Planning</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ACTIVE">Active Mandates</option>
              <option value="ARCHIVED">Archived / Superseded</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Content Layout: Left Table + Right Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* Requirements List (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Regulatory Catalogue ({filteredRequirements.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Click row to inspect version history</span>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
                Loading regulatory catalogue...
              </div>
            ) : filteredRequirements.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No regulatory requirements found.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Adjust filters or promulgate a new statutory mandate.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {filteredRequirements.map((req) => {
                  const isSelected = selectedReq?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      onClick={() => loadRequirementDetails(req.id)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/70 border-l-4 border-[#092D62]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                            {req.id}
                          </span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                            v{req.version}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.weight === 1.0 ? 'bg-red-50 text-red-700' : req.weight >= 0.7 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Weight: {req.weight}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          req.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {req.is_active ? 'ACTIVE' : 'ARCHIVED'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-800 mt-1.5">
                        {req.title}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {req.description}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        <span className="truncate max-w-[220px]">
                          Ref: {req.regulatory_source}
                        </span>
                        <span>Bureau: {req.responsible_bureau_code || `#${req.responsible_bureau_id}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Requirement Detail Drawer (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
            {selectedReq ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                        {selectedReq.id}
                      </span>
                      <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                        Version {selectedReq.version}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-[#092D62] mt-1.5">
                      {selectedReq.title}
                    </h2>
                  </div>

                  {hasRole(['super_admin', 'bureau_head']) && (
                    <button
                      onClick={() => {
                        setReqToUpdate(selectedReq);
                        setIsUpdateOpen(true);
                      }}
                      className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer shadow-xs"
                      title="Promulgate new statutory version"
                    >
                      <Edit className="w-3 h-3 text-[#092D62]" />
                      <span>Update</span>
                    </button>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Full Statutory Description
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    {selectedReq.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Regulatory Authority</div>
                    <div className="font-bold text-slate-800 mt-0.5 truncate">{selectedReq.regulatory_source}</div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Severity Weight</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedReq.weight} (Critical: 1.0)</div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Applicable Institution Types
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedReq.applicable_institution_types?.map((t: string) => (
                      <span key={t} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedReq.default_evidence_requirements && selectedReq.default_evidence_requirements.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Statutory Evidence Checklist
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                      {selectedReq.default_evidence_requirements.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Immutable Version History Trail */}
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#092D62] uppercase tracking-wide mb-2">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Statutory Promulgation Audit Trail</span>
                  </div>

                  {selectedReq.versions && selectedReq.versions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedReq.versions.map((v: RegulatoryRequirementVersion) => (
                        <div key={v.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#092D62]">Version {v.version_number}</span>
                            <span className="text-[10px] text-slate-500">{new Date(v.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5 italic">
                            "{v.changes_summary}"
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Initial Version 1 active. No subsequent statutory amendments promulgated.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <BookOpen className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-xs font-medium">Select a requirement to inspect statutory details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateRequirementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created: RegulatoryRequirement) => {
          setRequirements((prev) => [created, ...prev]);
          setSelectedReq(created);
        }}
        bureaus={bureaus}
      />

      {reqToUpdate && (
        <UpdateRequirementModal
          isOpen={isUpdateOpen}
          onClose={() => {
            setIsUpdateOpen(false);
            setReqToUpdate(null);
          }}
          requirement={reqToUpdate}
          onSuccess={(updated: RegulatoryRequirement) => {
            setRequirements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelectedReq(updated);
          }}
        />
      )}
    </div>
  );
};

export default RegulatoryRequirementsPage;
