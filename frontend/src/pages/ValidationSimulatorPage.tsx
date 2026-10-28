import React, { useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { CheckCircle2, Search, Sparkles, Building, AlertCircle, HelpCircle } from 'lucide-react';

export const ValidationSimulatorPage: React.FC = () => {
  const [permanentId, setPermanentId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testPresets = [
    {
      label: 'Priority 1: Authoritative Exact AICTE ID',
      pid: '1-10293847',
      name: 'Delhi Institute of Advanced Technology',
      state: 'Delhi',
      district: 'South West Delhi'
    },
    {
      label: 'Priority 2: Verified Historical Alias',
      pid: '',
      name: 'Delhi College of Advanced Technology',
      state: 'Delhi',
      district: ''
    },
    {
      label: 'Priority 3 & 4: Same Name in Rajasthan (Apex Jaipur)',
      pid: '',
      name: 'Apex Institute of Engineering & Technology',
      state: 'Rajasthan',
      district: 'Jaipur'
    },
    {
      label: 'Priority 3 & 4: Same Name in Madhya Pradesh (Apex Bhopal)',
      pid: '',
      name: 'Apex Institute of Engineering & Technology',
      state: 'Madhya Pradesh',
      district: 'Bhopal'
    },
    {
      label: 'Edge Case: Conflicting ID vs Name',
      pid: '1-10293847',
      name: 'Totally Unrelated South Indian Polytechnic',
      state: 'Tamil Nadu',
      district: 'Chennai'
    }
  ];

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.testIdentityResolution({
        permanent_id: permanentId,
        institution_name: institutionName,
        state: state,
        district: district
      });
      setResult(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (p: typeof testPresets[0]) => {
    setPermanentId(p.pid);
    setInstitutionName(p.name);
    setState(p.state);
    setDistrict(p.district);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                SECTION 12 ENGINE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">6-Stage Priority Resolution</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#218653]" />
              <span>Institution Identity Verification Engine Bench</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Interactive test bench evaluating the 6-priority rules: Authoritative AICTE Permanent ID &gt; Verified Aliases &gt; RapidFuzz &gt; Geographic Agreement.
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Click to Load Canonical Demonstration Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            {testPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#092D62] px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form & Output Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="lg:col-span-5 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#061E46] uppercase tracking-wider pb-2 border-b">
              Candidate Query Parameters
            </h3>

            <form onSubmit={handleTest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  AICTE Permanent ID (Priority 1)
                </label>
                <input
                  type="text"
                  value={permanentId}
                  onChange={(e) => setPermanentId(e.target.value)}
                  placeholder="e.g. 1-10293847"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Institution Name / Historical Alias
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Apex Institute of Engineering"
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-3d-navy w-full py-2.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'Executing Resolution Engine...' : 'Run Identity Resolution'}
                </button>
              </div>
            </form>
          </div>

          {/* Engine Output */}
          <div className="lg:col-span-7 bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#061E46] uppercase tracking-wider pb-2 border-b">
              Resolution Engine Verdict & Evidence
            </h3>

            {result ? (
              <div className="space-y-4 text-xs">
                {/* Result Banner */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Resolution Outcome</span>
                    <div className="mt-1">
                      <StatusBadge status={result.outcome} type="verification" />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Confidence Metric</span>
                    <span className="text-lg font-black text-[#092D62] font-mono">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Rule Applied */}
                <div className="p-3 rounded bg-blue-50/70 border border-blue-200 text-xs">
                  <span className="font-bold text-[#092D62] block">Rule Triggered:</span>
                  <p className="text-slate-800 mt-0.5">{result.rule_applied}</p>
                </div>

                {/* Matched Institution Profile */}
                {result.matched_institution && (
                  <div className="p-3.5 rounded border border-slate-200 bg-white space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Matched Authority Record:</span>
                    <h4 className="font-bold text-[#061E46] text-sm">{result.matched_institution.official_name}</h4>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Permanent ID: {result.matched_institution.permanent_id} | State: {result.matched_institution.state}
                    </p>
                  </div>
                )}

                {/* Evidence Dictionary */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Audit Evidence Dictionary:</span>
                  <pre className="bg-[#061E46] text-amber-300 p-3 rounded font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(result.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select a preset scenario above or enter parameters to execute the identity verification engine.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
