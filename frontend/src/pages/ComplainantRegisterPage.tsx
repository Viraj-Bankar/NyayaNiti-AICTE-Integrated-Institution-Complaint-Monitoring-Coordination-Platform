import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useComplainantAuth } from '../context/ComplainantAuthContext';
import { Shield, AlertCircle, CheckCircle2, User, Mail, Phone, Lock, ArrowLeft } from 'lucide-react';

export const ComplainantRegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [complainantType, setComplainantType] = useState('Student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isAuthenticated } = useComplainantAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/complainant/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    const cleanMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and password confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        password,
        confirm_password: confirmPassword,
        complainant_type: complainantType
      });
      navigate('/complainant/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {/* Emblem */}
        <div className="w-14 h-14 rounded-full bg-[#092D62] border-2 border-[#FFB900] mx-auto flex items-center justify-center text-white shadow-md">
          <span className="font-extrabold text-xs tracking-wider text-[#FFB900]">AICTE</span>
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#061E46]">
          Citizen Grievance Portal Registration
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          न्यायनीति | NyayaNiti — Register to submit and monitor institution-related grievances across AICTE bureaus.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-md rounded-xl border border-slate-200 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-[#092D62] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Statutory Citizen Access:</strong> Registered citizens receive unique grievance tracking numbers and direct milestone updates from assigned bureaus.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                />
              </div>
            </div>

            {/* Email & Mobile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                </div>
              </div>
            </div>

            {/* Complainant Role / Standing */}
            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Complainant Category
              </label>
              <select
                value={complainantType}
                onChange={(e) => setComplainantType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
              >
                <option value="Student">Student / Scholar</option>
                <option value="Faculty">Faculty Member / Teaching Staff</option>
                <option value="Parent">Parent / Guardian</option>
                <option value="Citizen">General Citizen / Institutional Whistleblower</option>
              </select>
            </div>

            {/* Password & Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-3d-amber py-3 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Complete Citizen Registration'}</span>
              </button>
            </div>
          </form>

          {/* Links & Switchers */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-2 text-xs">
            <p className="text-slate-600">
              Already registered?{' '}
              <Link to="/complainant/login" className="font-bold text-[#092D62] hover:underline">
                Sign in to Citizen Portal
              </Link>
            </p>

            <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <Link to="/" className="flex items-center gap-1 hover:text-[#092D62]">
                <ArrowLeft className="w-3 h-3" /> Back to Explore
              </Link>
              <span>•</span>
              <Link to="/login" className="hover:text-[#092D62]">
                AICTE Officer Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplainantRegisterPage;
