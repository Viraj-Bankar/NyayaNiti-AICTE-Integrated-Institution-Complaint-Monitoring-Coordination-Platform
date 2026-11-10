import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { ExecutiveGovernanceSummary, RegulatoryRequirement, ComplianceAssessment, CorrectiveActionPlan, Institution } from '../types';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import {
  Building2, BookOpen, CheckSquare, AlertOctagon,
  ShieldAlert, RefreshCw, Download, ArrowUpRight,
  TrendingUp, Award, AlertTriangle, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export const ComplianceDashboardPage: React.FC = () => {
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveGovernanceSummary | null>(null);
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('AY-2025-26');
  const [isScanningCaps, setIsScanningCaps] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [execData, reqsData, assessData, capsData, instsData] = await Promise.all([
        complianceApi.getExecutiveDashboard().catch(() => null),
        complianceApi.listRequirements().catch(() => []),
        complianceApi.listAssessments({ assessment_period: selectedPeriod }).catch(() => []),
        complianceApi.listCAPs().catch(() => []),
        api.getInstitutions().catch(() => [])
      ]);

      setExecutiveSummary(execData);
      setRequirements(reqsData);
      setAssessments(assessData);
      setCaps(capsData);
      setInstitutions(instsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load institutional compliance dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanOverdueCAPs = async () => {
    setIsScanningCaps(true);
    setScanMessage(null);
    try {
      const res = await complianceApi.scanOverdueCAPs();
      setScanMessage(`Scan Complete: ${res.scanned_count || 0} active CAPs evaluated; ${res.updated_to_overdue || 0} updated to OVERDUE status.`);
      await loadDashboardData();
    } catch (err: any) {
      setScanMessage(`Overdue scan failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsScanningCaps(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await complianceApi.downloadRegistryCSV();
    } catch (err: any) {
      alert(`Export failed: ${err?.message || 'Unable to download register'}`);
    }
  };

  // Calculations
  const totalMonitored = executiveSummary?.total_institutions_monitored ?? institutions.length;
  const activeReqCount = requirements.filter((r) => r.is_active).length;
  const applicableAssessmentsCount = assessments.length;
  const verifiedCompliantCount = assessments.filter((a) => a.status === 'COMPLIANT').length;
  const verifiedCompliancePct = executiveSummary?.national_average_compliance_pct ?? 0;
  const assessmentCoveragePct = executiveSummary?.national_average_coverage_pct ?? 0;
  const pendingEvidenceCount = assessments.filter((a) => a.status === 'PENDING_EVIDENCE' || a.status === 'UNDER_REVIEW').length;
  const activeCapsCount = caps.filter((c) => !['VERIFIED', 'CLOSED', 'CANCELLED'].includes(c.status)).length;
  const overdueCapsCount = caps.filter((c) => c.is_overdue || c.status === 'OVERDUE').length;

  // Chart data: Assessment status distribution
  const statusCounts: Record<string, number> = {
    COMPLIANT: 0,
    PARTIALLY_COMPLIANT: 0,
    NON_COMPLIANT: 0,
    PENDING_EVIDENCE: 0,
    UNDER_REVIEW: 0,
    NOT_APPLICABLE: 0
  };
  assessments.forEach((a) => {
    if (statusCounts[a.status] !== undefined) {
      statusCounts[a.status]++;
    }
  });

  const assessmentPieData = [
    { name: 'Compliant', value: statusCounts.COMPLIANT, color: '#10B981' },
    { name: 'Partially Compliant', value: statusCounts.PARTIALLY_COMPLIANT, color: '#F59E0B' },
    { name: 'Non-Compliant', value: statusCounts.NON_COMPLIANT, color: '#EF4444' },
    { name: 'Under Review', value: statusCounts.UNDER_REVIEW, color: '#3B82F6' },
    { name: 'Pending Evidence', value: statusCounts.PENDING_EVIDENCE, color: '#8B5CF6' }
  ].filter((d) => d.value > 0);

  // Chart data: CAP status breakdown
  const capStatusCounts: Record<string, number> = {};
  caps.forEach((c) => {
    capStatusCounts[c.status] = (capStatusCounts[c.status] || 0) + 1;
  });
  const capPieData = Object.entries(capStatusCounts).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: status === 'CLOSED' || status === 'VERIFIED' ? '#10B981' : status === 'OVERDUE' ? '#DC2626' : '#F59E0B'
  }));

  // Regional comparisons
  const regionalData = executiveSummary?.regional_summaries || [];

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <ComplianceSubNav />

      <div className="max-w-7xl mx-auto px-4 pt-5">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
              <span>National Institutional Governance</span>
              <span>/</span>
              <span className="text-[#092D62] font-semibold">Institutional Compliance Dashboard</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFB900]" />
              Automated Institutional Compliance & Regulatory Analytics
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Multi-bureau statutory oversight, explainable compliance scorecards, and automated remediation telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white border border-slate-300 text-xs rounded px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="AY-2025-26">AY-2025-26 (Current Academic Year)</option>
              <option value="AY-2024-25">AY-2024-25 (Historical)</option>
              <option value="AY-2023-24">AY-2023-24 (Historical)</option>
            </select>

            <button
              onClick={handleScanOverdueCAPs}
              disabled={isScanningCaps}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isScanningCaps ? 'animate-spin' : ''}`} />
              <span>Scan Overdue CAPs</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#092D62] hover:bg-[#061E46] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>Export Registry CSV</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded p-2.5 text-xs flex items-center justify-between">
            <span>{scanMessage}</span>
            <button onClick={() => setScanMessage(null)} className="text-amber-800 font-bold hover:text-amber-950 ml-2">✕</button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadDashboardData} className="underline font-semibold hover:text-red-900">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 mt-5">
              {/* 1. Institutions Monitored */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Institutions Monitored</span>
                  <Building2 className="w-4 h-4 text-[#092D62]" />
                </div>
                <div className="text-2xl font-extrabold text-[#092D62]">{totalMonitored}</div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Across all AICTE regions</span>
                </div>
              </div>

              {/* 2. Active Regulatory Requirements */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Active Mandates</span>
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-indigo-950">{activeReqCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  <span>Canonical statutory requirements</span>
                </div>
              </div>

              {/* 3. Verified Compliance Percentage */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">National Compliance</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {verifiedCompliancePct > 0 ? `${verifiedCompliancePct}%` : 'N/A'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">avg score</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Weighted evaluation formula
                </div>
              </div>

              {/* 4. Assessment Coverage */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Assessment Coverage</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-blue-700">
                    {assessmentCoveragePct > 0 ? `${assessmentCoveragePct}%` : '0%'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">evaluated</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Mandate inspection completeness
                </div>
              </div>

              {/* 5. Applicable Assessments Recorded */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Assessments Logged</span>
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-extrabold text-purple-950">{applicableAssessmentsCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {verifiedCompliantCount} fully compliant ({applicableAssessmentsCount > 0 ? Math.round((verifiedCompliantCount / applicableAssessmentsCount) * 100) : 0}%)
                </div>
              </div>

              {/* 6. Pending Evidence Verification */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Evidence</span>
                  <Layers className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-amber-800">{pendingEvidenceCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Awaiting officer audit review
                </div>
              </div>

              {/* 7. Outstanding CAPs */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Active CAPs</span>
                  <AlertOctagon className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-extrabold text-orange-900">{activeCapsCount}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Statutory remediation directives
                </div>
              </div>

              {/* 8. Overdue CAPs (Critical Risk) */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue CAPs</span>
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-extrabold text-red-600">{overdueCapsCount}</div>
                <div className="text-[10px] text-red-600 font-semibold mt-1">
                  Breached statutory deadline
                </div>
              </div>
            </div>

            {/* Assessment Coverage Notice Banner */}
            {assessmentCoveragePct < 50 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Statutory Integrity Safeguard:</span> Assessment Coverage is currently at{' '}
                  <strong>{assessmentCoveragePct}%</strong>. In accordance with AICTE regulatory guidelines, institutions with low assessment coverage are flagged as having <em>insufficient data</em> rather than being assumed fully compliant.
                </div>
              </div>
            )}

            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
              {/* Chart 1: Assessment Status Distribution */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                    Statutory Compliance Status Distribution
                  </h2>
                  <span className="text-[11px] text-slate-500">{assessments.length} total assessments</span>
                </div>
                {assessmentPieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assessmentPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {assessmentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                    <CheckSquare className="w-8 h-8 mb-2 stroke-1" />
                    <p className="text-xs font-medium">No assessment evaluations recorded for {selectedPeriod}.</p>
                    <p className="text-[11px] text-slate-500">Initiate assessments to populate verified status distributions.</p>
                  </div>
                )}
              </div>

              {/* Chart 2: Regional Performance Comparison */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                    Regional Compliance & Coverage Overview
                  </h2>
                  <span className="text-[11px] text-slate-500">{regionalData.length} AICTE regions</span>
                </div>
                {regionalData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionalData}>
                        <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avg_compliance" name="Avg Compliance %" fill="#092D62" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="avg_coverage" name="Avg Coverage %" fill="#FFB900" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                    <Building2 className="w-8 h-8 mb-2 stroke-1" />
                    <p className="text-xs font-medium">Regional aggregation data compiling...</p>
                    <p className="text-[11px] text-slate-500">Regional trends will populate as institutional evaluations progress.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Navigation Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div
                onClick={() => navigate('/compliance/requirements')}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:border-[#092D62] transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#092D62] group-hover:text-amber-600 transition-colors">
                    Regulatory Requirements Catalogue
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#092D62]" />
                </div>
                <p className="text-xs text-slate-600">
                  Inspect {activeReqCount} canonical statutory mandates, approval handbook clauses, and version histories.
                </p>
              </div>

              <div
                onClick={() => navigate('/compliance/caps')}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:border-[#092D62] transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#092D62] group-hover:text-amber-600 transition-colors">
                    Corrective Action Plans (CAP)
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#092D62]" />
                </div>
                <p className="text-xs text-slate-600">
                  Track {activeCapsCount} active remediation directives, overdue escalations, and verified closures.
                </p>
              </div>

              <div
                onClick={() => navigate('/compliance/risk-intelligence')}
                className="bg-white p-4 rounded-lg border border-slate-200 hover:border-[#092D62] transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#092D62] group-hover:text-amber-600 transition-colors">
                    Multi-Bureau Risk Intelligence
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#092D62]" />
                </div>
                <p className="text-xs text-slate-600">
                  Synthesize repeated violation trends, grievance velocity spikes, and multi-bureau conflict signals.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComplianceDashboardPage;
