import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complianceApi, api } from '../services/api';
import { ExecutiveGovernanceSummary, Institution } from '../types';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import {
  ShieldAlert, Award, AlertTriangle, Download, RefreshCw,
  Building2, BookOpen, AlertOctagon, CheckSquare,
  ExternalLink, Search, Filter, Lock,
  ChevronRight, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#EF4444',
  Critical: '#7F1D1D'
};

export const ExecutiveGovernancePage: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const isAuthorized = hasRole(['super_admin', 'bureau_head', 'monitoring_officer']);

  const [summary, setSummary] = useState<ExecutiveGovernanceSummary | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Institution comparison filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  useEffect(() => {
    if (isAuthorized) {
      loadExecutiveData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  const loadExecutiveData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [execData, instData] = await Promise.all([
        complianceApi.getExecutiveDashboard(),
        api.getInstitutions()
      ]);
      setSummary(execData);
      setInstitutions(instData || []);
    } catch (err: any) {
      console.error('Failed to load executive governance data:', err);
      setError(err?.message || 'Failed to load executive governance metrics from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await complianceApi.downloadRegistryCSV();
    } catch (err: any) {
      alert(`Export failed: ${err?.message || 'Could not download official compliance registry.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Executive Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            The Executive Governance Council Dashboard is restricted to Super Administrators, Bureau Heads, and designated Monitoring Officers.
          </p>
          <button
            onClick={() => navigate('/compliance')}
            className="px-4 py-2 bg-[#092D62] text-white text-sm font-medium rounded hover:bg-[#071f43] transition-colors"
          >
            Return to Compliance Hub
          </button>
        </div>
      </div>
    );
  }

  // Filtered institutions for comparison table
  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = !searchQuery ||
      (inst.official_name && inst.official_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.permanent_id && inst.permanent_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.city && inst.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRegion = selectedRegion === 'ALL' || inst.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const regionsList = Array.from(new Set(institutions.map(i => i.region).filter(Boolean)));

  // Risk distribution for Pie Chart
  const riskPieData = summary ? [
    { name: 'Low Risk', value: summary.risk_distribution.Low || 0, color: RISK_COLORS.Low },
    { name: 'Medium Risk', value: summary.risk_distribution.Medium || 0, color: RISK_COLORS.Medium },
    { name: 'High Risk', value: summary.risk_distribution.High || 0, color: RISK_COLORS.High },
    { name: 'Critical Risk', value: summary.risk_distribution.Critical || 0, color: RISK_COLORS.Critical }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-Navigation */}
      <ComplianceSubNav activeTab="executive" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#092D62] text-white uppercase tracking-wider">
                Statutory AICTE Oversight
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Evaluated: {summary?.evaluated_at ? new Date(summary.evaluated_at).toLocaleString() : 'Live'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Award className="w-6 h-6 text-[#FFB900]" />
              Executive Governance Council Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              National high-level regulatory compliance monitoring, cross-bureau remediation velocity, and systemic risk posture.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadExecutiveData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#092D62] text-white rounded text-xs font-medium hover:bg-[#071f43] shadow-sm transition-colors"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Exporting...' : 'Export National Registry (CSV)'}
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 flex items-center justify-between text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadExecutiveData}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded border border-slate-200 animate-pulse h-28" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded border border-slate-200 animate-pulse h-80" />
              <div className="bg-white p-6 rounded border border-slate-200 animate-pulse h-80" />
            </div>
          </div>
        ) : summary ? (
          <>
            {/* National KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Monitored Institutions</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{summary.total_institutions_monitored}</div>
                <div className="text-xs text-slate-500 mt-1">Accredited technical institutes</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Requirements</span>
                  <BookOpen className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{summary.active_regulatory_requirements}</div>
                <div className="text-xs text-slate-500 mt-1">Gazetted statutory standards</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Nat'l Avg Compliance</span>
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {summary.national_average_compliance_pct.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Verified standard satisfaction</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm border-l-4 border-l-[#FFB900]">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Assessment Coverage</span>
                  <BarChart3 className="w-4 h-4 text-[#FFB900]" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {summary.national_average_coverage_pct.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Audit evaluation completeness</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">High / Critical Risk</span>
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{summary.institutions_high_or_critical_risk}</div>
                <div className="text-xs text-slate-500 mt-1">Institutions under surveillance</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Outstanding CAPs</span>
                  <AlertOctagon className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{summary.total_active_caps}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Active directives ({summary.total_overdue_caps} overdue)
                </div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Grievance SLA Adherence</span>
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {summary.national_grievance_sla_adherence_pct.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Complaints closed within SLA</div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Overdue CAP Directives</span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className={`text-2xl font-bold ${summary.total_overdue_caps > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {summary.total_overdue_caps}
                </div>
                <div className="text-xs text-slate-500 mt-1">Require immediate escalation</div>
              </div>
            </div>

            {/* Visualizations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Regional Compliance Overview */}
              <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#092D62]" />
                    Regional Compliance & Coverage Overview
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Comparison of average verified compliance index vs. assessment coverage across AICTE regions.
                  </p>
                </div>
                <div className="h-64">
                  {summary.regional_summaries && summary.regional_summaries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.regional_summaries} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <XAxis dataKey="region" stroke="#64748B" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                        <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded shadow text-xs">
                                  <div className="font-bold mb-1">{label} Region</div>
                                  <div className="text-blue-300">Avg Compliance: {Number(payload[0]?.value).toFixed(1)}%</div>
                                  <div className="text-amber-300">Avg Coverage: {Number(payload[1]?.value).toFixed(1)}%</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar dataKey="avg_compliance" name="Avg Compliance (%)" fill="#092D62" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="avg_coverage" name="Avg Coverage (%)" fill="#FFB900" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No regional summary data recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* National Risk Distribution */}
              <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-[#092D62]" />
                    National Institutional Risk Tier Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Classification based on complaint surges, SLA breaches, active CAPs, and unverified standards.
                  </p>
                </div>
                <div className="h-64 flex items-center justify-center">
                  {riskPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          label={({ name, percent }: any) => `${(name || '').replace(' Risk', '')}: ${(((percent as number) || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {riskPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0];
                              return (
                                <div className="bg-slate-900 text-white p-2 rounded shadow text-xs">
                                  <span className="font-semibold">{d.name}:</span> {d.value} institutions
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400">
                      No risk distribution evaluations recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Regulatory Deficiencies Pareto */}
            {summary.top_deficiencies && summary.top_deficiencies.length > 0 && (
              <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      Top Statutory Deficiencies Nationally
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory requirements with the highest count of non-compliant determinations.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/compliance/requirements')}
                    className="text-xs text-[#092D62] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Manage Catalogue <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.top_deficiencies.map((def, idx) => (
                    <div key={idx} className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono text-slate-600 font-medium">{def.requirement_id}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                            {def.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{def.title}</h4>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Non-Compliant:</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {def.non_compliant_count} instances
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Institutional Comparison Table */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#092D62]" />
                    Institutional Compliance Comparative Registry
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live overview of technical institutions. Click an institution to inspect detailed scorecard, CAPs, and risk breakdown.
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search institution..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#092D62] focus:outline-none w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#092D62] focus:outline-none"
                    >
                      <option value="ALL">All Regions</option>
                      {regionsList.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Code / ID</th>
                      <th className="py-3 px-4">Institution Name</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">City / State</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInstitutions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No institutions matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredInstitutions.map((inst) => (
                        <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">
                            {inst.permanent_id || `INST-${inst.id}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{inst.official_name}</div>
                            {inst.aliases && inst.aliases.length > 0 && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                Aliases: {inst.aliases.map(a => a.alias_name).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              {inst.region || 'Unassigned'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {inst.institution_type || 'Technical'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {inst.city ? `${inst.city}, ${inst.state}` : (inst.state || 'N/A')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => navigate(`/compliance/institutions/${inst.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#092D62] hover:bg-blue-50 border border-blue-200 rounded transition-colors"
                            >
                              Profile & Scorecard
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Displaying {filteredInstitutions.length} of {institutions.length} institutions</span>
                <span className="italic">Note: Institutional comparisons distinguish unassessed data from non-compliance.</span>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
