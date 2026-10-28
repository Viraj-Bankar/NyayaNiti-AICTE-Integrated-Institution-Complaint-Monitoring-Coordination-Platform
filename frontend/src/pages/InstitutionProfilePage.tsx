import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Institution } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ArrowLeft, Building, MapPin, Mail, Phone, Globe, Shield,
  GitMerge, AlertTriangle, FileText, CheckCircle2, History,
  Clock, ExternalLink, Calendar
} from 'lucide-react';

export const InstitutionProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'cross_bureau' | 'overlaps' | 'conflicts' | 'aliases'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.getInstitutionProfile(Number(id))
        .then(setInstitution)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  if (isLoading || !institution) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-xs text-slate-500">
        Loading 360° Institution Profile...
      </div>
    );
  }

  const cases = institution.cases || [];
  const overlaps = institution.overlap_alerts || [];
  const conflicts = institution.action_conflicts || [];

  const rbCases = cases.filter((c: any) => c.bureau_code === 'RB');
  const pgrcCases = cases.filter((c: any) => c.bureau_code === 'PGRC');

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/institutions')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#092D62] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </button>

        {/* 360 Profile Header Card */}
        <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#092D62] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                <Building className="w-7 h-7 text-[#FFB900]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-300">
                    AICTE Permanent ID: {institution.permanent_id}
                  </span>
                  <StatusBadge status={institution.verification_status} type="verification" />
                </div>
                <h1 className="text-xl font-extrabold text-[#061E46] mt-1.5">
                  {institution.official_name}
                </h1>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FFB900]" />
                  <span>{institution.address}, {institution.city}, {institution.district}, {institution.state} - {institution.pincode} ({institution.region} Region)</span>
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 text-center">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 min-w-[70px]">
                <span className="text-lg font-black text-[#092D62] block">{institution.case_count}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Cases</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 min-w-[70px]">
                <span className="text-lg font-black text-amber-900 block">{institution.pending_case_count}</span>
                <span className="text-[10px] text-amber-800 uppercase font-semibold">Active</span>
              </div>
              <div className="bg-red-50 p-2.5 rounded border border-red-200 min-w-[70px]">
                <span className="text-lg font-black text-red-700 block">{overlaps.length}</span>
                <span className="text-[10px] text-red-800 uppercase font-semibold">Overlaps</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 pt-1">
            {institution.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.email}</span>
              </span>
            )}
            {institution.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.phone}</span>
              </span>
            )}
            {institution.website && (
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <a href={institution.website} target="_blank" rel="noreferrer" className="text-[#1E5AA8] underline">
                  {institution.website}
                </a>
              </span>
            )}
          </div>
        </div>

        {/* 8 Profile Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[
              { key: 'overview', label: '1. Overview' },
              { key: 'cases', label: `2. All Cases (${cases.length})` },
              { key: 'cross_bureau', label: `3. RB vs PGRC Activity (${rbCases.length}/${pgrcCases.length})` },
              { key: 'overlaps', label: `4. Overlap Alerts (${overlaps.length})` },
              { key: 'conflicts', label: `5. Action Conflicts (${conflicts.length})` },
              { key: 'aliases', label: `6. Verified Aliases (${(institution.aliases || []).length})` }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-[#092D62] text-[#092D62] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 text-xs">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-[#061E46] text-xs uppercase tracking-wide">Registry Identity Evidence</h4>
                    <p className="text-slate-600 leading-relaxed">
                      This institution is verified against the authoritative Council master registry database.
                      All past cases, gazette name changes, and geographical coordinates are locked to AICTE Permanent ID <strong>{institution.permanent_id}</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="font-bold text-[#061E46] text-xs uppercase tracking-wide">Cross-Bureau Summary</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Regulation Bureau (RB) has handled <strong>{rbCases.length}</strong> regulatory compliance proceedings.
                      Public Grievance Redressal Cell (PGRC) has logged <strong>{pgrcCases.length}</strong> student/staff grievances.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: All Cases */}
            {activeTab === 'cases' && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#092D62] text-white">
                      <tr>
                        <th className="py-2.5 px-3">Case ID</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Bureau</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Deadline</th>
                        <th className="py-2.5 px-3">Last Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cases.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-[#092D62]">
                            <span onClick={() => navigate(`/cases/${c.id}`)} className="hover:underline cursor-pointer">
                              {c.id}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{c.category}</td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {c.bureau_code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3"><StatusBadge status={c.priority} type="priority" /></td>
                          <td className="py-2.5 px-3"><StatusBadge status={c.status} type="status" /></td>
                          <td className="py-2.5 px-3 font-mono">{new Date(c.prescribed_deadline).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 truncate max-w-xs">{c.last_action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: RB vs PGRC Activity (Side-by-Side) */}
            {activeTab === 'cross_bureau' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RB Column */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-[#092D62] text-xs uppercase">Regulation Bureau (RB) Complaints</h4>
                    <span className="bg-[#092D62] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {rbCases.length} Recorded
                    </span>
                  </div>
                  {rbCases.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No Regulation Bureau records logged.</p>
                  ) : (
                    rbCases.map((c: any) => (
                      <div key={c.id} className="p-3 rounded bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span onClick={() => navigate(`/cases/${c.id}`)} className="font-bold text-[#092D62] hover:underline cursor-pointer">
                            {c.id}
                          </span>
                          <StatusBadge status={c.status} type="status" />
                        </div>
                        <p className="font-semibold text-slate-800 text-[11px]">{c.category}</p>
                        <p className="text-slate-600 text-[10px]">Action: {c.last_action}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* PGRC Column */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-[#1E5AA8] text-xs uppercase">Public Grievance Cell (PGRC) Records</h4>
                    <span className="bg-[#1E5AA8] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {pgrcCases.length} Recorded
                    </span>
                  </div>
                  {pgrcCases.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No Public Grievance Cell records logged.</p>
                  ) : (
                    pgrcCases.map((c: any) => (
                      <div key={c.id} className="p-3 rounded bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span onClick={() => navigate(`/cases/${c.id}`)} className="font-bold text-[#092D62] hover:underline cursor-pointer">
                            {c.id}
                          </span>
                          <StatusBadge status={c.status} type="status" />
                        </div>
                        <p className="font-semibold text-slate-800 text-[11px]">{c.category}</p>
                        <p className="text-slate-600 text-[10px]">Action: {c.last_action}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Overlaps */}
            {activeTab === 'overlaps' && (
              <div className="space-y-3">
                {overlaps.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No active overlap alerts for this institution.</p>
                ) : (
                  overlaps.map((o: any) => (
                    <div key={o.id} className="p-3 rounded border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#092D62] block">
                          Pair: {o.case_a_id} ↔ {o.case_b_id}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          SBERT Semantic Similarity: <strong>{Math.round(o.similarity_score * 100)}%</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={o.review_status} type="overlap" />
                        <button
                          onClick={() => navigate('/overlaps')}
                          className="btn-3d-navy px-3 py-1 rounded text-[11px]"
                        >
                          Review in Centre
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 5: Conflicts */}
            {activeTab === 'conflicts' && (
              <div className="space-y-3">
                {conflicts.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No action conflicts recorded for this institution.</p>
                ) : (
                  conflicts.map((cf: any) => (
                    <div key={cf.id} className="p-3 rounded border border-red-200 bg-red-50/50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-red-900 block">{cf.conflict_type}</span>
                        <span className="text-[11px] text-slate-700">Between {cf.case_a_id} and {cf.case_b_id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={cf.status} type="conflict" />
                        <button
                          onClick={() => navigate('/action-conflicts')}
                          className="btn-3d-amber px-3 py-1 rounded text-[11px]"
                        >
                          Investigate Conflict
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 6: Aliases */}
            {activeTab === 'aliases' && (
              <div className="space-y-3">
                <p className="text-slate-600 text-xs">
                  Verified historical names, acronyms, and aliases legally tied to Permanent ID <strong>{institution.permanent_id}</strong>:
                </p>
                <div className="space-y-2">
                  {(institution.aliases || []).map((al) => (
                    <div key={al.id} className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#092D62] text-xs block">{al.alias_name}</span>
                        <span className="text-[10px] text-slate-500">{al.verification_notes || 'Verified Council Alias'}</span>
                      </div>
                      <span className="bg-blue-100 text-[#092D62] text-[10px] font-bold px-2 py-0.5 rounded">
                        {al.alias_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
