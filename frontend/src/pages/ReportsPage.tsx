import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart3, Download, FileSpreadsheet, Building, ShieldCheck, Info } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [bureauReport, setBureauReport] = useState<any[]>([]);
  const [regionReport, setRegionReport] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getBureauReport(), api.getRegionReport()])
      .then(([bRes, rRes]) => {
        setBureauReport(bRes);
        setRegionReport(rRes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                MANAGEMENT INFORMATION SYSTEM
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">Official Regulatory Reports</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#092D62]" />
              <span>Council Reports & Statistical Analytics</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Statutory Bureau workloads, regional distributions, and official CSV exports with defined metrics.
            </p>
          </div>

          <a
            href={api.getExportCsvUrl()}
            className="btn-3d-amber px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Case Registry (CSV)</span>
          </a>
        </div>

        {/* Metric Formula Advisory (Mandatory from Section 24) */}
        <div className="bg-blue-50 border-l-4 border-[#1E5AA8] p-3.5 rounded text-xs text-[#061E46] flex items-start gap-2.5 shadow-xs">
          <Info className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[#092D62]">Statutory Metric Calculation Definition:</strong>
            Disposal Rate is explicitly calculated as a period-based ratio:
            <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-[#092D62] font-bold mx-1">
              (Disposed Cases in Period / Total Cases Logged in Period) * 100
            </code>
            and not mixed with longitudinal cohort completion rates.
          </div>
        </div>

        {/* 1. Bureau-Wise Report */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#092D62] text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              1. Bureau-Wise Regulatory Workload & Disposal Summary
            </h3>
            <span className="text-[10px] text-amber-300 font-mono font-semibold">Live Database Derived</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Bureau / Cell</th>
                  <th className="py-2.5 px-3 text-center">Total Complaints</th>
                  <th className="py-2.5 px-3 text-center">Pending Workload</th>
                  <th className="py-2.5 px-3 text-center">Disposed Cases</th>
                  <th className="py-2.5 px-3 text-center">Overdue Cases</th>
                  <th className="py-2.5 px-3 text-center">Period Disposal Rate</th>
                  <th className="py-2.5 px-3 text-center">Average Ageing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bureauReport.map((b) => (
                  <tr key={b.bureau_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-[#092D62]">
                      {b.bureau_name} ({b.bureau_code})
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{b.total_cases}</td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-900 bg-amber-50/50">{b.pending_workload}</td>
                    <td className="py-3 px-3 text-center font-semibold text-emerald-800 bg-emerald-50/50">{b.disposed_cases}</td>
                    <td className="py-3 px-3 text-center font-bold text-red-700 bg-red-50/50">{b.overdue_cases}</td>
                    <td className="py-3 px-3 text-center font-black text-[#092D62]">
                      {b.disposal_rate_pct}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{b.average_age_days} Days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Region-Wise Report */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#092D62] text-white px-5 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              2. Geographic Regional Case Volume & Overlap Distribution
            </h3>
            <span className="text-[10px] text-amber-300 font-mono font-semibold">AICTE Regions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">AICTE Regional Jurisdiction</th>
                  <th className="py-2.5 px-3 text-center">Institutions Tracked</th>
                  <th className="py-2.5 px-3 text-center">Total Complaints</th>
                  <th className="py-2.5 px-3 text-center">Active Workload</th>
                  <th className="py-2.5 px-3 text-center">Disposed Cases</th>
                  <th className="py-2.5 px-3 text-center">Cross-Bureau Overlap Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionReport.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-[#092D62]">{r.region} Region</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800">{r.institution_count}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{r.total_cases}</td>
                    <td className="py-3 px-3 text-center text-amber-900 font-semibold">{r.pending_cases}</td>
                    <td className="py-3 px-3 text-center text-emerald-800 font-semibold">{r.disposed_cases}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#C62828] bg-red-50/40">
                      {r.overlap_alerts_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
