import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TrendingUp, AlertTriangle, Building, ArrowRight, Shield, Info } from 'lucide-react';

export const SurgeDetectionPage: React.FC = () => {
  const [surges, setSurges] = useState<any[]>([]);
  const [windowDays, setWindowDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSurges();
  }, [windowDays]);

  const loadSurges = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSurges(windowDays);
      setSurges(data.surges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#C62828] px-2 py-0.5 rounded">
                STATISTICAL ANOMALY ENGINE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">Rolling Window: {windowDays} Days</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#C62828]" />
              <span>Complaint Surge Detection Centre</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Identifies abnormal statistical spikes in grievances per institution and category using z-score and baseline observation rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-semibold">Time Window:</span>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="p-1.5 border border-slate-300 rounded text-xs bg-white"
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days (Standard)</option>
              <option value={60}>60 Days</option>
            </select>
          </div>
        </div>

        {/* Advisory Box (Mandatory from Section 18) */}
        <div className="bg-blue-50 border-l-4 border-[#1E5AA8] p-3.5 rounded text-xs text-[#061E46] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[#092D62]">Administrative Inquiry Notice:</strong>
            A detected complaint surge triggers administrative review and joint scrutiny. It does NOT automatically label an institution as fraudulent or establish proof of wrongdoing.
          </div>
        </div>

        {/* Surges List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-500">Calculating rolling baselines and standard deviations...</div>
          ) : surges.length === 0 ? (
            <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500">
              No complaint surges detected above statistical thresholds in the current {windowDays}-day window.
            </div>
          ) : (
            surges.map((s, idx) => (
              <div key={idx} className="bg-white rounded-lg p-5 border border-red-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-900 border border-red-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        Active Surge Signal
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        Permanent ID: {s.permanent_id}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-[#061E46] mt-1">
                      {s.institution_name}
                    </h3>
                  </div>

                  <button
                    onClick={() => navigate(`/institutions/${s.institution_id}`)}
                    className="btn-3d-navy px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>View Institution Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Window Count</span>
                    <span className="text-lg font-black text-red-700">{s.current_count} Complaints</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Historical Mean</span>
                    <span className="text-lg font-bold text-slate-800">{s.historical_mean} / window</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Z-Score Deviation</span>
                    <span className="text-lg font-black text-amber-900 font-mono">+{s.z_score} σ</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Detection Method</span>
                    <span className="text-[11px] font-bold text-[#092D62]">{s.detection_method}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p>
                    <strong>Subject Under Surge:</strong> {s.category}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Linked Complaint IDs: {(s.related_case_ids || []).map((cid: string) => (
                      <span
                        key={cid}
                        onClick={() => navigate(`/cases/${cid}`)}
                        className="font-mono font-bold text-[#1E5AA8] hover:underline cursor-pointer mr-2"
                      >
                        {cid}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
