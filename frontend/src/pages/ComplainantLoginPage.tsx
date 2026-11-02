import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import {
  Shield, AlertCircle, LogIn, Sparkles, Mail, Lock, ArrowLeft,
  Eye, EyeOff, Loader2, UserPlus
} from 'lucide-react';

export const ComplainantLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
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

  const validateForm = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};
    const cleanId = identifier.trim();

    if (!cleanId) {
      errors.identifier = 'Please enter your registered email address or 10-digit mobile number.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionError();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim().toLowerCase(), password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email/mobile or password. Please try again.');
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
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official AICTE Emblem */}
        <div className="w-14 h-14 rounded-full bg-[#092D62] border-2 border-[#FFB900] mx-auto flex items-center justify-center text-white shadow-md">
          <span className="font-extrabold text-xs tracking-wider text-[#FFB900]">AICTE</span>
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#061E46] tracking-tight">
          Citizen Grievance & Tracking Portal
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          न्यायनीति | NyayaNiti — Sign in to submit and monitor complaints filed with AICTE bureaus.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-md rounded-xl border border-slate-200 space-y-5">
          {/* Session Expiry Banner */}
          {sessionError && (
            <div className="bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{sessionError}</span>
              </div>
              <button
                type="button"
                onClick={clearSessionError}
                className="text-amber-700 hover:text-amber-900 font-bold text-sm cursor-pointer px-1"
                aria-label="Close message"
              >
                ×
              </button>
            </div>
          )}

          {/* Backend / Global Error Banner */}
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email or Mobile Number */}
            <div>
              <label htmlFor="identifier" className="block text-xs font-bold text-[#061E46] mb-1">
                Registered Email or Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="identifier"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: undefined });
                  }}
                  placeholder="student@example.com or 10-digit mobile"
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded border ${
                    fieldErrors.identifier ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                />
              </div>
              {fieldErrors.identifier && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.identifier}</span>
                </p>
              )}
            </div>

            {/* Password with Visibility Control */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#061E46] mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  placeholder="Enter your account password"
                  className={`w-full text-xs pl-9 pr-10 py-2.5 rounded border ${
                    fieldErrors.password ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Primary Action: Login */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-3d-amber py-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Citizen Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Evaluation Switch */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded text-xs font-bold bg-amber-50 text-[#092D62] border border-amber-300 hover:bg-amber-100 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Demo: Sign In as Student Complainant</span>
            </button>
          </div>

          {/* Secondary Actions: Create Account & Return to Explore */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-3 text-xs">
            <div className="flex items-center justify-center gap-1.5 text-slate-600">
              <span>New to NyayaNiti?</span>
              <Link
                to="/complainant/register"
                className="inline-flex items-center gap-1 font-bold text-[#092D62] hover:text-blue-700 hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Citizen Account</span>
              </Link>
            </div>

            <div className="pt-1 flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <Link to="/" className="flex items-center gap-1 hover:text-[#092D62] transition-colors">
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Explore</span>
              </Link>
              <span>•</span>
              <Link to="/login" className="flex items-center gap-1 hover:text-[#092D62] transition-colors">
                <Shield className="w-3 h-3" />
                <span>AICTE Officer Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplainantLoginPage;
