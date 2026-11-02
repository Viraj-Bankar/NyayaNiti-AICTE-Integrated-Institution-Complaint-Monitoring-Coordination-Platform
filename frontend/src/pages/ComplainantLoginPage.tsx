import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import { Shield, AlertCircle, LogIn, Sparkles, Mail, Lock, ArrowLeft } from 'lucide-react';

export const ComplainantLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, demoLogin, isAuthenticated, sessionError, clearSessionError } = useComplainantAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/complainant/home';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionError();

    if (!email.trim() || !password.trim()) {
      setError('Please provide your registered email/mobile and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email/mobile or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    clearSessionError();
    try {
      await demoLogin();
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Citizen demo login failed. Please register an account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem */}
        <div className="w-14 h-14 rounded-full bg-[#092D62] border-2 border-[#FFB900] mx-auto flex items-center justify-center text-white shadow-md">
          <span className="font-extrabold text-xs tracking-wider text-[#FFB900]">AICTE</span>
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#061E46]">
          Citizen Grievance & Tracking Portal
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          न्यायनीति | NyayaNiti — Sign in to submit and track complaints filed with AICTE bureaus.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-md rounded-xl border border-slate-200 space-y-5">
          {sessionError && (
            <div className="bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{sessionError}</span>
              </div>
              <button
                type="button"
                onClick={clearSessionError}
                className="text-amber-700 hover:text-amber-900 font-bold text-sm cursor-pointer px-1"
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Registered Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com or 10-digit mobile"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-3d-amber py-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing in...' : 'Sign In to Citizen Portal'}</span>
              </button>
            </div>
          </form>

          {/* Quick Demo Evaluation Switch */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded text-xs font-bold bg-amber-50 text-[#092D62] border border-amber-300 hover:bg-amber-100 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Demo: Sign In as Student Complainant</span>
            </button>
          </div>

          {/* Links & Switchers */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-2 text-xs">
            <p className="text-slate-600">
              New complainant?{' '}
              <Link to="/complainant/register" className="font-bold text-[#092D62] hover:underline">
                Register for Citizen Portal
              </Link>
            </p>

            <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <Link to="/" className="flex items-center gap-1 hover:text-[#092D62]">
                <ArrowLeft className="w-3 h-3" /> Back to Explore
              </Link>
              <span>•</span>
              <Link to="/login" className="hover:text-[#092D62] flex items-center gap-1">
                <Shield className="w-3 h-3" /> AICTE Officer Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplainantLoginPage;

