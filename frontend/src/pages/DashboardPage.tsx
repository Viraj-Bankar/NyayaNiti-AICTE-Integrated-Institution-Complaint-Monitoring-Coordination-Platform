import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE } from '../services/api';
import { DashboardKpis } from '../types';
import { AlertTicker } from '../components/common/AlertTicker';
import { StatusBadge } from '../components/common/StatusBadge';
import { AIDashboardWidget } from '../components/ai/AIDashboardWidget';
import {
  FileText, Clock, CheckCircle2, ArrowRight, AlertTriangle,
  GitMerge, ShieldAlert, TrendingUp, Sparkles, Download,
  PlusCircle, RefreshCw, Layers, Calendar, ExternalLink, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [charts, setCharts] = useState<any | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [kpisRes, chartsRes, activityRes, deadlinesRes] = await Promise.all([
        api.getKpis(),
        api.getCharts(),
        api.getRecentActivity(),
        api.getUpcomingDeadlines()
      ]);
      setKpis(kpisRes);
      setCharts(chartsRes);
      setRecentActivity(activityRes || []);
      setUpcomingDeadlines(deadlinesRes || []);
    } catch (err: any) {
      console.error('Dashboard data fetching error:', err);
      setError(err?.message || 'Failed to connect to the backend server. Please verify network connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAiScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await api.scanAllOverlaps();
      setScanMessage(`Scan complete: ${res.new_overlaps_detected} candidate overlaps identified.`);
      await loadDashboardData();
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const COLORS = ['#092D62', '#1E5AA8', '#25B8BD', '#FFB900', '#C62828', '#218653'];

  const renderKpiValue = (val: number | undefined) => {
    if (isLoading && kpis === null) {
      return <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />;
    }
    if (error && kpis === null) {
      return <span className="text-red-500 font-mono text-base">--</span>;
    }
    return val ?? 0;
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      {/* 1. Sliding Alert Ticker */}
      <AlertTicker />

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Officer Operational Workspace Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E5AA8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Official Operational Workspace
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <span>Institution Complaint Monitoring & Coordination Dashboard</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Active Officer: <strong className="text-[#092D62]">{user?.full_name || 'Dr. Rajesh Sharma'}</strong> |{' '}
              Role: <strong className="text-[#092D62]">{user?.role?.replace('_', ' ').toUpperCase() || 'SUPER ADMIN'}</strong> |{' '}
              Bureau: <strong className="text-[#092D62]">{user?.bureau_code || 'Regulation Bureau (RB)'}</strong>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/cases?action=new')}
              className="btn-3d-amber px-3.5 py-2 rounded text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Grievance</span>
            </button>

            <button
              onClick={handleRunAiScan}
              disabled={isScanning}
              className="btn-3d-navy px-3.5 py-2 rounded text-xs tracking-wide flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Execute Cross-Bureau Sentence-BERT Semantic Matching"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#FFB900] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Run AI Scan'}</span>
            </button>

            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="btn-3d-white px-3.5 py-2 rounded text-xs tracking-wide font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Refresh live metrics from Neon PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#092D62] ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <a
              href={api.getExportCsvUrl()}
              className="btn-3d-white px-3.5 py-2 rounded text-xs tracking-wide font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Backend Connection Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-[#C62828] p-4 rounded-r-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C62828] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#C62828] uppercase tracking-wide">
                  Backend Service Unavailable
                </h4>
                <p className="text-xs text-slate-700 mt-0.5">
                  {error}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Target API: {API_BASE}/dashboard/kpis
                </p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="btn-3d-navy px-4 py-1.5 rounded text-xs tracking-wide flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {scanMessage && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2 rounded text-xs font-semibold flex items-center justify-between">
            <span>{scanMessage}</span>
            <button onClick={() => setScanMessage(null)} className="text-amber-800 font-bold ml-4">✕</button>
          </div>
        )}

        {/* 2. 8 High-Impact KPI Cards (Live Neon Database) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Total */}
          <div
            onClick={() => navigate('/cases')}
            className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#092D62] transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Cases</span>
            <div className="text-xl font-black text-[#092D62] mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.total_complaints)}
            </div>
            <span className="text-[9px] text-slate-500 block mt-1">Registry-Wide</span>
          </div>

          {/* Card 2: Intake Queue */}
          <div
            onClick={() => navigate('/cases?status=Submitted&unassigned_only=true')}
            className="bg-amber-50/60 rounded-lg p-3 border border-amber-300 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-900">Intake Queue</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
            <div className="text-xl font-black text-amber-900 mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.new_intake_complaints ?? kpis?.submitted ?? kpis?.pending)}
            </div>
            <span className="text-[9px] text-amber-800 block mt-1 font-semibold">Unassigned Grievances</span>
          </div>

          {/* Card 3: Under Process */}
          <div
            onClick={() => navigate('/cases?status=Under Process')}
            className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-[#1E5AA8]">Under Process</span>
            <div className="text-xl font-black text-[#1E5AA8] mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.under_process)}
            </div>
            <span className="text-[9px] text-slate-500 block mt-1">Active Inquiry</span>
          </div>

          {/* Card 4: Disposed */}
          <div
            onClick={() => navigate('/cases?status=Disposed')}
            className="bg-white rounded-lg p-3 border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-[#218653]">Disposed</span>
            <div className="text-xl font-black text-[#218653] mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.disposed)}
            </div>
            <span className="text-[9px] text-emerald-700 block mt-1">Complied / Closed</span>
          </div>

          {/* Card 5: Transferred */}
          <div
            onClick={() => navigate('/cases?status=Transferred')}
            className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-purple-800">Transferred</span>
            <div className="text-xl font-black text-purple-700 mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.transferred)}
            </div>
            <span className="text-[9px] text-purple-600 block mt-1">Inter-Bureau</span>
          </div>

          {/* Card 6: Overdue */}
          <div
            onClick={() => navigate('/cases?overdue_only=true')}
            className="bg-red-50 rounded-lg p-3 border border-red-300 shadow-sm hover:shadow-md hover:border-red-500 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-[#C62828] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Overdue
            </span>
            <div className="text-xl font-black text-[#C62828] mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.overdue)}
            </div>
            <span className="text-[9px] text-red-700 block mt-1 font-semibold">SLA Breached</span>
          </div>

          {/* Card 7: Overlaps Awaiting Review */}
          <div
            onClick={() => navigate('/overlaps')}
            className="bg-amber-50 rounded-lg p-3 border border-amber-300 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1">
              <GitMerge className="w-2.5 h-2.5 text-amber-600" />
              Overlaps
            </span>
            <div className="text-xl font-black text-amber-900 mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.potential_overlaps_awaiting_review)}
            </div>
            <span className="text-[9px] text-amber-800 block mt-1 font-semibold">Awaiting Review</span>
          </div>

          {/* Card 8: Action Conflicts */}
          <div
            onClick={() => navigate('/action-conflicts')}
            className="bg-red-50 rounded-lg p-3 border border-red-300 shadow-sm hover:shadow-md hover:border-red-500 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-[#C62828] flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-[#C62828]" />
              Conflicts
            </span>
            <div className="text-xl font-black text-[#C62828] mt-1 group-hover:scale-105 transition-transform min-h-[1.75rem] flex items-center">
              {renderKpiValue(kpis?.action_conflicts_awaiting_review)}
            </div>
            <span className="text-[9px] text-red-800 block mt-1 font-semibold">Reconcile Now</span>
          </div>
        </div>

        {/* Phase 7 Cross-Bureau Coordination Hub Banner */}
        <div className="bg-gradient-to-r from-[#092D62] to-[#1E5AA8] rounded-lg p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-xs">
              <Layers className="w-5 h-5 text-[#FFB900]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  Cross-Bureau Coordination & Conflict Intelligence
                </h3>
                <span className="text-[10px] font-bold bg-[#FFB900] text-[#061E46] px-2 py-0.5 rounded">
                  AICTE Phase 7
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                Active Joint Workspaces: <strong className="text-white font-mono">{renderKpiValue(kpis?.active_coordination_workspaces)}</strong> |
                Pending Shared Tasks: <strong className="text-white font-mono ml-1">{renderKpiValue(kpis?.coordination_tasks_pending)}</strong> |
                Unresolved Action Conflicts: <strong className="text-white font-mono ml-1">{renderKpiValue(kpis?.action_conflicts_awaiting_review)}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/action-conflicts')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Conflicts Center</span>
            </button>
            <button
              onClick={() => navigate('/coordination')}
              className="px-3.5 py-1.5 bg-[#FFB900] hover:bg-amber-400 text-[#061E46] rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>Coordination Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Recharts Visual Analytics (Live Backend Data) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Bureau Workload (Active vs Disposed) */}
          <div className="lg:col-span-6 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#061E46]">1. Bureau-Wise Case Workload</h4>
                <p className="text-[10px] text-slate-500">Live distribution across Regulation Bureau, PGRC, & Approvals</p>
              </div>
              <span className="text-[10px] font-mono text-[#092D62] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                Live Data
              </span>
            </div>
            <div className="h-60 w-full">
              {charts?.bureau_workload ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.bureau_workload}>
                    <XAxis dataKey="bureau" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="active" name="Active / Under Process" fill="#092D62" />
                    <Bar dataKey="disposed" name="Disposed / Closed" fill="#218653" />
                  </BarChart>
                </ResponsiveContainer>
              ) : isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 text-[#092D62] animate-spin" />
                  <span>Loading bureau workload...</span>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {error ? 'Unable to load workload data' : 'No records found'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Complaint Status Distribution (Donut) */}
          <div className="lg:col-span-6 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#061E46]">2. Complaint Status Distribution</h4>
                <p className="text-[10px] text-slate-500">Live proportions across statutory resolution stages</p>
              </div>
              <span className="text-[10px] font-mono text-[#092D62] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                Live Data
              </span>
            </div>
            <div className="h-60 w-full flex items-center">
              {charts?.status_distribution && charts.status_distribution.some((d: any) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.status_distribution.filter((d: any) => d.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {charts.status_distribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : isLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 text-[#092D62] animate-spin" />
                  <span>Loading status distribution...</span>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  {error ? 'Unable to load status distribution' : 'No status records found'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 3: Monthly Complaint Trends (Area) */}
          <div className="lg:col-span-6 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#061E46]">3. Monthly Ingestion vs Disposal Trend</h4>
                <p className="text-[10px] text-slate-500">Monthly complaint intake vs resolutions from database</p>
              </div>
              <span className="text-[10px] font-mono text-[#092D62] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                6-Month Trend
              </span>
            </div>
            <div className="h-60 w-full">
              {charts?.monthly_trend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthly_trend}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="received" name="Complaints Received" stroke="#092D62" fill="#092D62" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="disposed" name="Disposed" stroke="#218653" fill="#218653" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 text-[#092D62] animate-spin" />
                  <span>Loading monthly trends...</span>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {error ? 'Unable to load trend data' : 'No trend records found'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: Case Ageing Distribution */}
          <div className="lg:col-span-6 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#061E46]">4. Case Ageing Distribution</h4>
                <p className="text-[10px] text-slate-500">Active grievances bucketed by calendar days pending</p>
              </div>
              <span className="text-[10px] font-mono text-[#092D62] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                SLA Ageing
              </span>
            </div>
            <div className="h-60 w-full">
              {charts?.case_ageing ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.case_ageing}>
                    <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                    <Bar dataKey="cases" name="Active Cases" fill="#FFB900" />
                  </BarChart>
                </ResponsiveContainer>
              ) : isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 text-[#092D62] animate-spin" />
                  <span>Loading case ageing data...</span>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {error ? 'Unable to load ageing data' : 'No records found'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 5: Priority Distribution */}
          <div className="lg:col-span-4 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-[#061E46]">5. Priority Tiers</h4>
              <span className="text-[10px] text-slate-400">Multi-factor engine</span>
            </div>
            <div className="h-52 w-full">
              {charts?.priority_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.priority_distribution}>
                    <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" fill="#C62828" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {isLoading ? 'Loading...' : 'No priority data'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 6: Overlap Review Status */}
          <div className="lg:col-span-4 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-[#061E46]">6. Overlap Review States</h4>
              <span className="text-[10px] text-slate-400">AI Matches</span>
            </div>
            <div className="h-52 w-full">
              {charts?.overlap_status && charts.overlap_status.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.overlap_status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      label={({ name }: any) => name}
                    >
                      {charts.overlap_status.map((_: any, index: number) => (
                        <Cell key={`cell-ov-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {isLoading ? 'Loading...' : 'No overlap records'}
                </div>
              )}
            </div>
          </div>

          {/* Chart 7: Top Grievance Categories */}
          <div className="lg:col-span-4 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-[#061E46]">7. Top Grievance Subjects</h4>
              <span className="text-[10px] text-slate-400">Taxonomy</span>
            </div>
            <div className="h-52 w-full">
              {charts?.category_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.category_distribution} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" fill="#1E5AA8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  {isLoading ? 'Loading...' : 'No category data'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI-Powered Semantic Duplicate Detection & Coordination Intelligence (Phase 6) */}
        <AIDashboardWidget />

        {/* 4. Bottom Grid: Upcoming Deadlines & Recent Chronological Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upcoming Deadlines Panel */}
          <div className="lg:col-span-5 bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <h4 className="text-xs font-bold text-[#061E46] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Upcoming & Overdue Deadlines
                </h4>
                <button
                  onClick={() => navigate('/cases?overdue_only=true')}
                  className="text-[11px] font-semibold text-[#1E5AA8] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      onClick={() => navigate(`/cases/${dl.id}`)}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        dl.is_overdue
                          ? 'bg-red-50 border-red-200 hover:bg-red-100/70'
                          : dl.days_remaining <= 3
                          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#092D62]">{dl.id}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-semibold">
                            {dl.bureau_code}
                          </span>
                          <StatusBadge status={dl.priority} type="priority" />
                        </div>
                        <p className="text-[11px] text-slate-700 truncate max-w-xs mt-0.5 font-medium">
                          {dl.institution_name}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {dl.is_overdue ? (
                          <span className="text-red-700 font-extrabold text-[11px] block">
                            Overdue by {Math.abs(dl.days_remaining)}d
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold text-[11px] block">
                            {dl.days_remaining}d remaining
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 block">
                          {new Date(dl.prescribed_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {isLoading ? 'Loading deadlines...' : 'No upcoming deadlines recorded'}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <span className="text-[10px] text-slate-500">
                Statutory AICTE prescribed deadlines strictly enforced by Council regulation.
              </span>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="lg:col-span-7 bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h4 className="text-xs font-bold text-[#061E46] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#092D62]" />
                Recent Official Case Events & Regulatory Actions
              </h4>
              <button
                onClick={() => navigate('/audit')}
                className="text-[11px] font-semibold text-[#1E5AA8] hover:underline"
              >
                Full Audit Trail
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2 px-2.5">Time</th>
                    <th className="py-2 px-2.5">Case ID</th>
                    <th className="py-2 px-2.5">Event</th>
                    <th className="py-2 px-2.5">Responsible Actor</th>
                    <th className="py-2 px-2.5">Official Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2.5 whitespace-nowrap text-slate-500 text-[10px] font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-[#092D62] whitespace-nowrap">
                          <span
                            onClick={() => navigate(`/cases/${ev.case_id}`)}
                            className="hover:underline cursor-pointer"
                          >
                            {ev.case_id}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                            {ev.event_type}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                          {ev.actor_name}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 truncate max-w-xs text-[11px]">
                          {ev.remarks || ev.new_value || 'Action recorded in central system'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        {isLoading ? 'Loading activity...' : 'No recent activity records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
