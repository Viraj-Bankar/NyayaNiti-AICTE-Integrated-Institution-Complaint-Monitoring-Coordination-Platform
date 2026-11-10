import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { GrievancePerformance, Institution } from '../types';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import {
  Clock, CheckCircle2, AlertTriangle, Filter, Search,
  TrendingUp, BarChart3, Info, Building2, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

export const SlaAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<GrievancePerformance | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number>(1);
  const [observationDays, setObservationDays] = useState<number>(90);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformance();
  }, [selectedInstId, observationDays]);

  const loadPerformance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [instsData, perfData] = await Promise.all([
        api.getInstitutions().catch(() => []),
        complianceApi.getGrievancePerformance(selectedInstId, observationDays).catch(() => null)
      ]);

      setInstitutions(instsData);
      setPerformance(perfData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load grievance SLA analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedInst = institutions.find((i) => i.id === selectedInstId);

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
              <span className="text-[#092D62] font-semibold">Grievance Performance & SLA Analytics</span>
            </div>
            <h1 className="text-xl font-bold text-[#092D62] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FFB900]" />
              Institutional Grievance Disposal Velocity & SLA Adherence
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Operational grievance-management turnaround telemetry, disposal rates, and statutory category breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(Number(e.target.value))}
              className="bg-white border border-slate-300 text-xs rounded px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.official_name}</option>
              ))}
            </select>

            <select
              value={observationDays}
              onChange={(e) => setObservationDays(Number(e.target.value))}
              className="bg-white border border-slate-300 text-xs rounded px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
            >
              <option value={30}>Last 30 Days Window</option>
              <option value={60}>Last 60 Days Window</option>
              <option value={90}>Last 90 Days Window (Standard)</option>
              <option value={180}>Last 180 Days Window</option>
              <option value={365}>Last 365 Days (Full Year)</option>
            </select>

            <button
              onClick={loadPerformance}
              className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mandatory Statutory Separation Notice */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Operational Performance Metric (Decoupled from Regulatory Compliance):</span>
            <p className="mt-0.5 text-[11px] text-blue-900 leading-relaxed font-medium">
              These SLA statistics measure internal institutional responsiveness to citizen complaints. Under AICTE regulatory framework, high grievance velocity or prolonged resolution times reflect operational workloads and are <strong>strictly decoupled</strong> from verified statutory infrastructure and academic compliance percentages.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">SLA Adherence Rate</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {performance ? `${performance.sla_adherence_pct}%` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Resolved within prescribed timeline</div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Disposal Rate</div>
                <div className="text-2xl font-extrabold text-[#092D62] mt-1">
                  {performance ? `${performance.disposal_rate_pct}%` : '0%'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {performance ? `${performance.resolved_complaints} of ${performance.total_complaints} resolved` : '0%'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Avg Resolution Turnaround</div>
                <div className="text-2xl font-extrabold text-blue-700 mt-1">
                  {performance ? `${performance.average_resolution_days}d` : '0d'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">From intake to closure order</div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Overdue Breaches</div>
                <div className="text-2xl font-extrabold text-red-600 mt-1">
                  {performance ? performance.overdue_complaints : 0}
                </div>
                <div className="text-[10px] text-red-600 font-semibold mt-1">
                  {performance ? `${performance.overdue_rate_pct}% overdue rate` : '0%'}
                </div>
              </div>
            </div>

            {/* Category Breakdown Chart & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
              {/* Category Chart (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs p-4">
                <h2 className="text-xs font-bold text-[#092D62] uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">
                  Grievance Volume & Disposal by Statutory Category
                </h2>
                {performance?.category_breakdown && performance.category_breakdown.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performance.category_breakdown}>
                        <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" name="Total Complaints" fill="#092D62" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="sla_breached" name="SLA Breached" fill="#EF4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                    <Clock className="w-8 h-8 mb-2 stroke-1" />
                    <p className="text-xs font-medium">No complaints recorded during this observation window.</p>
                  </div>
                )}
              </div>

              {/* Institution Overview (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-xs font-bold text-[#092D62] uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">
                    Institutional Turnaround Summary
                  </h2>
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Selected Institution</div>
                      <div className="text-sm font-bold text-[#092D62] mt-0.5">
                        {selectedInst?.official_name || `Institution #${selectedInstId}`}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Permanent ID: {selectedInst?.permanent_id} | Region: {selectedInst?.region}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Pending</div>
                        <div className="text-lg font-bold text-amber-700">{performance?.pending_complaints || 0}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Observation Period</div>
                        <div className="text-xs font-bold text-slate-700 mt-1">{performance?.observation_period}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => navigate(`/compliance/institutions/${selectedInstId}`)}
                    className="w-full bg-[#092D62] hover:bg-[#061E46] text-white py-2 rounded text-xs font-semibold cursor-pointer shadow-xs text-center"
                  >
                    View Full Statutory Compliance Scorecard →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SlaAnalyticsPage;
