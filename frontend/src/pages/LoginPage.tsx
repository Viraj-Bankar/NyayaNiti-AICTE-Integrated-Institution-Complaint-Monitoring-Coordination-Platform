import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, UserCheck, AlertCircle, Sparkles, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide valid officer credentials.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await demoLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Fast login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* AICTE Emblem / Seal Motif */}
        <div className="w-16 h-16 rounded-full bg-[#092D62] border-2 border-[#FFB900] mx-auto flex items-center justify-center text-white shadow-md">
          <span className="font-extrabold text-sm tracking-wider text-[#FFB900]">AICTE</span>
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-[#061E46]">
          AICTE Authorized Officer Portal
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          न्यायनीति | NyayaNiti — Grievance Monitoring & Coordination System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Main Login Card */}
        <div className="bg-white py-8 px-6 shadow-md rounded-lg border border-slate-200 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Government Officer Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or officer_pgrc"
                className="w-full p-2.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#092D62]"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Security Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#092D62]"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-3d-navy w-full py-2.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Authenticating with Central Registry...' : 'Sign In as Authorized Official'}
              </button>
            </div>
          </form>

          {/* Quick Demo Switcher (Section 4 & 5 Requirement) */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>1-Click Evaluator Role Selection</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickDemo('super_admin')}
                className="p-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer"
              >
                <div className="font-bold text-[#092D62]">Super Admin</div>
                <div className="text-[10px] text-slate-500">Member Secretary</div>
              </button>

              <button
                onClick={() => handleQuickDemo('bureau_head')}
                className="p-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer"
              >
                <div className="font-bold text-[#092D62]">Bureau Head</div>
                <div className="text-[10px] text-slate-500">Adviser-I (RB)</div>
              </button>

              <button
                onClick={() => handleQuickDemo('authorized_officer')}
                className="p-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer"
              >
                <div className="font-bold text-[#092D62]">Authorized Officer</div>
                <div className="text-[10px] text-slate-500">Deputy Director (PGRC)</div>
              </button>

              <button
                onClick={() => handleQuickDemo('monitoring_officer')}
                className="p-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer"
              >
                <div className="font-bold text-[#092D62]">Monitoring Officer</div>
                <div className="text-[10px] text-slate-500">Director (Vigilance)</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          This is an internal administrative coordination portal. Not for public complaint submission.
        </div>
      </div>
    </div>
  );
};
