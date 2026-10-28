import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Institution } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Search, Building, ExternalLink, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';

export const InstitutionListPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadInstitutions();
  }, [regionFilter]);

  const loadInstitutions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInstitutions({ q: search, region: regionFilter });
      setInstitutions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInstitutions();
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Authoritative Registry
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{institutions.length} Institutions Tracked</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1">
              Verified Technical Institutions Directory
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Identity-verified institutional records with gazette aliases and cross-bureau case linkage.
            </p>
          </div>

          <button
            onClick={() => navigate('/validation')}
            className="btn-3d-amber px-4 py-2 rounded text-xs font-bold self-start sm:self-auto cursor-pointer"
          >
            Launch Identity Engine Bench
          </button>
        </div>

        {/* Search & Region Filter */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Institution Name, AICTE Permanent ID (e.g. 1-10293847), or City..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-[#092D62]"
              />
            </div>
            <button type="submit" className="btn-3d-navy px-4 py-2 rounded text-xs font-semibold cursor-pointer">
              Search
            </button>
          </form>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded border border-slate-300 bg-white text-xs text-slate-700"
          >
            <option value="">All Regions</option>
            <option value="North-Western">North-Western</option>
            <option value="Western">Western</option>
            <option value="Central">Central</option>
            <option value="South-Western">South-Western</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
          </select>
        </div>

        {/* Institution Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-xs text-slate-500">Loading institutions...</div>
          ) : institutions.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-xs text-slate-500">No institutions found.</div>
          ) : (
            institutions.map((inst) => (
              <div
                key={inst.id}
                onClick={() => navigate(`/institutions/${inst.id}`)}
                className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#092D62] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-300">
                      ID: {inst.permanent_id}
                    </span>
                    <StatusBadge status={inst.verification_status} type="verification" />
                  </div>

                  <h3 className="text-sm font-bold text-[#061E46] group-hover:text-[#1E5AA8] transition-colors line-clamp-2">
                    {inst.official_name}
                  </h3>

                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB900] flex-shrink-0" />
                    <span>{inst.city}, {inst.district}, {inst.state} ({inst.region} Region)</span>
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 text-[11px]">
                      Cases: <strong className="text-[#092D62]">{inst.case_count}</strong>
                    </span>
                    <span className="text-amber-800 text-[11px]">
                      Active: <strong className="text-amber-900">{inst.pending_case_count}</strong>
                    </span>
                  </div>
                  <span className="text-[#092D62] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>360° Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
