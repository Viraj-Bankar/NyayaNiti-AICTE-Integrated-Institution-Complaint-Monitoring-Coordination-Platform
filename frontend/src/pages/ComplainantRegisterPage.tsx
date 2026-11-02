import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import {
  Shield, AlertCircle, CheckCircle2, User, Mail, Phone, Lock,
  ArrowLeft, Eye, EyeOff, Loader2, LogIn
} from 'lucide-react';

export const ComplainantRegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [complainantType, setComplainantType] = useState('Student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    mobile?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isAuthenticated } = useComplainantAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/complainant/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    // 1. Full name
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full legal name (at least 2 characters).';
    }

    // 2. Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address (e.g. name@example.com).';
    }

    // 3. 10-digit Indian mobile format (starts with 6, 7, 8, or 9)
    const cleanMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobile = 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    // 4. Password complexity and length
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!(/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password))) {
      errors.password = 'Password must contain uppercase, lowercase, and numeric characters.';
    }

    // 5. Password confirmation match
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password,
        confirm_password: confirmPassword,
        complainant_type: complainantType
      });
      navigate('/complainant/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {/* Emblem */}
        <div className="w-14 h-14 rounded-full bg-[#092D62] border-2 border-[#FFB900] mx-auto flex items-center justify-center text-white shadow-md">
          <span className="font-extrabold text-xs tracking-wider text-[#FFB900]">AICTE</span>
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#061E46] tracking-tight">
          Citizen Grievance Portal Registration
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          न्यायनीति | NyayaNiti — Register to submit and monitor institution-related grievances across AICTE bureaus.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-md rounded-xl border border-slate-200 space-y-6">
          {/* Backend / Global Error Banner */}
          {error && (
            <div className="bg-red-50 text-red-800 p-3.5 rounded-lg border border-red-200 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Statutory Citizen Access Advisory */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-[#092D62] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#1E5AA8] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Statutory Citizen Access:</strong> Registered complainants receive an official reference ID (<code className="text-[#092D62] font-semibold">AICTE-PGRC-YYYY-XXXX</code>) and direct milestone updates from assigned bureaus.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Legal Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-[#061E46] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="fullName"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded border ${
                    fieldErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.fullName}</span>
                </p>
              )}
            </div>

            {/* Email & Mobile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="regEmail" className="block text-xs font-bold text-[#061E46] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regEmail"
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    placeholder="name@example.com"
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded border ${
                      fieldErrors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="regMobile" className="block text-xs font-bold text-[#061E46] mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regMobile"
                    type="tel"
                    required
                    maxLength={10}
                    disabled={isSubmitting}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, ''));
                      if (fieldErrors.mobile) setFieldErrors({ ...fieldErrors, mobile: undefined });
                    }}
                    placeholder="10-digit number"
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded border ${
                      fieldErrors.mobile ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  />
                </div>
                {fieldErrors.mobile && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.mobile}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Complainant Standing / Category */}
            <div>
              <label htmlFor="complainantType" className="block text-xs font-bold text-[#061E46] mb-1">
                Complainant Category
              </label>
              <select
                id="complainantType"
                disabled={isSubmitting}
                value={complainantType}
                onChange={(e) => setComplainantType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="Student">Student / Scholar</option>
                <option value="Faculty">Faculty Member / Teaching Staff</option>
                <option value="Parent">Parent / Guardian</option>
                <option value="Citizen">General Citizen / Institutional Whistleblower</option>
              </select>
            </div>

            {/* Password & Confirmation with Visibility Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="regPassword" className="block text-xs font-bold text-[#061E46] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                    }}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
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

              <div>
                <label htmlFor="regConfirmPassword" className="block text-xs font-bold text-[#061E46] mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regConfirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }}
                    placeholder="Re-enter password"
                    className={`w-full text-xs pl-9 pr-10 py-2.5 rounded border ${
                      fieldErrors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    } focus:outline-hidden focus:ring-2 focus:ring-[#092D62] disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Primary Action: Submit Registration */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-3d-amber py-3 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Citizen Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secondary Actions: Sign In & Return to Explore */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-3 text-xs">
            <div className="flex items-center justify-center gap-1.5 text-slate-600">
              <span>Already have an account?</span>
              <Link
                to="/complainant/login"
                className="inline-flex items-center gap-1 font-bold text-[#092D62] hover:text-blue-700 hover:underline"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Citizen Portal</span>
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

export default ComplainantRegisterPage;
