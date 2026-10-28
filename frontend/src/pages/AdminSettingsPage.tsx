import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { Settings, Users, Sliders, Shield, CheckCircle2, UserPlus } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [thresholds, setThresholds] = useState<any>({});
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    Promise.all([api.getThresholds(), api.getUsers()])
      .then(([tRes, uRes]) => {
        setThresholds(tRes);
        setUsers(uRes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateThresholds(thresholds);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  };

  const handleToggleUser = async (userId: number) => {
    try {
      await api.toggleUserStatus(userId);
      const updated = await api.getUsers();
      setUsers(updated);
    } catch (err: any) {
      alert(`Error toggling user: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                SUPER ADMIN JURISDICTION
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">System Configuration</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#092D62]" />
              <span>Council Application Settings & Bureau Thresholds</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Configure AI SBERT semantic thresholds, prescribed statutory deadlines, surge z-scores, and officer account statuses.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 p-3 rounded text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Council thresholds updated and recorded to audit logs successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configurable Thresholds Form */}
          <div className="lg:col-span-6 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#1E5AA8]" />
              <h3 className="text-xs font-bold text-[#061E46] uppercase tracking-wider">
                1. AI Matching & Surge Thresholds
              </h3>
            </div>

            <form onSubmit={handleUpdateThresholds} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  SBERT Semantic Overlap Review Threshold (0.0 to 1.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  value={thresholds.overlap_review_threshold || 0.60}
                  onChange={(e) => setThresholds({ ...thresholds, overlap_review_threshold: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Cases with similarity above this are flagged for human review.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  RapidFuzz Name Similarity Threshold (0 to 100)
                </label>
                <input
                  type="number"
                  step="1"
                  min="50"
                  max="100"
                  value={thresholds.rapidfuzz_name_threshold || 78}
                  onChange={(e) => setThresholds({ ...thresholds, rapidfuzz_name_threshold: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Token sort ratio minimum for candidate institution identity match.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Complaint Surge Z-Score Threshold (Standard Deviations σ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={thresholds.surge_z_score_threshold || 1.8}
                  onChange={(e) => setThresholds({ ...thresholds, surge_z_score_threshold: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Standard deviation threshold for statistical surge signal trigger.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SLA Critical (Days)</label>
                  <input
                    type="number"
                    value={thresholds.sla_days_critical || 7}
                    onChange={(e) => setThresholds({ ...thresholds, sla_days_critical: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SLA High (Days)</label>
                  <input
                    type="number"
                    value={thresholds.sla_days_high || 15}
                    onChange={(e) => setThresholds({ ...thresholds, sla_days_high: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="btn-3d-amber w-full py-2.5 rounded text-xs font-bold cursor-pointer"
                >
                  Save & Apply Regulatory Thresholds
                </button>
              </div>
            </form>
          </div>

          {/* User Management List */}
          <div className="lg:col-span-6 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#092D62]" />
                <h3 className="text-xs font-bold text-[#061E46] uppercase tracking-wider">
                  2. Authorized Personnel & Officer Accounts
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{users.length} Users</span>
            </div>

            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-[#061E46] text-xs">{u.full_name}</h5>
                    <p className="text-[11px] text-slate-500">{u.designation || u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#092D62] text-white px-2 py-0.2 rounded text-[10px] font-bold">
                        {u.role.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">@{u.username}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-red-50 hover:text-red-800'
                          : 'bg-red-50 text-red-800 border-red-300 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
