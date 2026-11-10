import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { InstitutionalRiskIndicator, Institution, ExecutiveGovernanceSummary } from '../types';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import {
  ShieldAlert, AlertTriangle, Filter, Search, Info,
  CheckCircle2, Building2, RefreshCw, ArrowRight, ExternalLink
} from 'lucide-react';

export const InstitutionalRiskIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [indicators, setIndicators] = useState<InstitutionalRiskIndicator[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveGovernanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstId, setSelectedInstId] = useState<string>('ALL');

  useEffect(() => {
    loadRiskData();
  }, [selectedInstId]);

  const loadRiskData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [instsData, execData] = await Promise.all([
        api.getInstitutions().catch(() => []),
        complianceApi.getExecutiveDashboard().catch(() => null)
      ]);

      setInstitutions(instsData);
      setExecutiveSummary(execData);

      // If specific institution selected, load its indicators; else load across institutions
      let allIndicators: InstitutionalRiskIndicator[] = [];
      if (selectedInstId !== 'ALL') {
        const data = await complianceApi.getRiskIndicators(parseInt(selectedInstId, 10));
        allIndicators = data;
      } else {
        // Load indicators for first 5 institutions to aggregate
        const instList = instsData.slice(0, 5);
        const results = await Promise.all(
          instList.map((i: Institution) => complianceApi.getRiskIndicators(i.id).catch(() => []))
        );
        allIndicators = results.flat();
      }

      setIndicators(allIndicators);
    } catch (err: any) {
      setError(err?.message || 'Failed to load risk intelligence indicators');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const filteredIndicators = indicators.filter((ind) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      ind.title.toLowerCase().includes(q) ||
      (ind.institution_name && ind.institution_name.toLowerCase().includes(q)) ||
      ind.indicator_type.toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'ALL' || ind.severity.toUpperCase() === severityFilter;
    const matchesType = typeFilter === 'ALL' || ind.indicator_type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
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
              <span className="text-[#092D62] font-semibold">Institutional Risk Intelligence</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#FFB900]" />
              Explainable Multi-Bureau Regulatory Risk Telemetry
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Automated synthesis of violation recurrence, CAP deadlines, grievance velocity spikes, and action conflicts.
            </p>
          </div>

          <button
            onClick={loadRiskData}
            className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Mandatory Statutory Governance Safeguard Banner */}
        <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 mb-1">
                AICTE Statutory Guard: Advisory Risk Diagnostic Principles
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-amber-900 leading-relaxed font-medium">
                <li>• <strong>Advisory Nature:</strong> Risk indicators are predictive early-warning signals, NOT confirmed statutory violations.</li>
                <li>• <strong>Grievance Decoupling:</strong> High complaint volume reflects public engagement and is never equated with non-compliance.</li>
                <li>• <strong>Coverage Transparency:</strong> Low assessment coverage is clearly marked as insufficient information, never penalized as poor performance.</li>
                <li>• <strong>Human Primacy:</strong> All regulatory decisions require independent authenticated officer inspection and signoff.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by institution or indicator title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Sampled Institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.official_name}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value="ALL">All Indicator Types</option>
              <option value="overdue_cap">Overdue CAP</option>
              <option value="repeated_violations">Repeated Violations</option>
              <option value="unresolved_grievance_backlog">Grievance Backlog</option>
              <option value="complaint_velocity_spike">Complaint Velocity Spike</option>
              <option value="cross_bureau_action_conflict">Action Conflict</option>
              <option value="low_compliance_coverage">Low Coverage</option>
            </select>
          </div>
        </div>

        {/* Indicators List */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse bg-white rounded-lg border border-slate-200">
              Evaluating multi-bureau risk intelligence telemetry...
            </div>
          ) : filteredIndicators.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 stroke-1" />
              <p className="text-xs font-semibold text-slate-700">No elevated regulatory risk indicators active.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Monitored institutions reflect compliant operation across all statutory signals.
              </p>
            </div>
          ) : (
            filteredIndicators.map((ind, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 hover:border-slate-300 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(ind.severity)}`}>
                        {ind.severity.toUpperCase()} RISK
                      </span>
                      <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                        {ind.indicator_type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {ind.institution_name}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {ind.title}
                    </h3>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-800">
                      <strong>Recommended Advisory Review Direction:</strong>{' '}
                      <span className="text-slate-700">{ind.recommended_review}</span>
                    </div>

                    {/* Supporting Evidence Details */}
                    {ind.supporting_evidence && Object.keys(ind.supporting_evidence).length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Supporting Telemetry Signals:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(ind.supporting_evidence).map(([k, v]) => (
                            <span key={k} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700 font-mono">
                              <strong>{k.replace('_', ' ')}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end justify-between md:justify-start gap-2 flex-shrink-0 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Data Completeness</div>
                      <div className="text-xs font-bold text-[#092D62]">
                        {(ind.data_completeness * 100).toFixed(0)}% Complete
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Window: {ind.observation_period}
                    </div>

                    <button
                      onClick={() => navigate(`/compliance/institutions/${ind.institution_id}`)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#092D62] hover:text-amber-600 cursor-pointer pt-2"
                    >
                      <span>Institutional Profile</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionalRiskIntelligencePage;
