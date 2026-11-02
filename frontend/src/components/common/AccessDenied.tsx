import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccessDeniedProps {
  requiredRoles?: string[];
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRoles }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const formattedRoles = requiredRoles?.map(r => r.replace('_', ' ').toUpperCase()).join(', ');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 text-center space-y-5">
        {/* Emblem Shield Badge */}
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 mx-auto flex items-center justify-center text-[#C62828] shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#C62828] bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
            403 • Access Restricted
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#061E46]">
            Unauthorized Administrative Access
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your current administrative account does not hold the statutory clearance required to access this operational module.
          </p>
        </div>

        {/* Current Role Context Box */}
        <div className="bg-[#F4F6F9] rounded-lg p-3.5 border border-slate-200 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Current Logged Officer:</span>
            <span className="font-semibold text-slate-700">{user?.full_name || 'Authenticated Official'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Assigned Role:</span>
            <span className="font-bold text-[#092D62] inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#FFB900]" />
              {user ? user.role.replace('_', ' ').toUpperCase() : 'N/A'}
            </span>
          </div>
          {requiredRoles && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
              <span>Required Clearance:</span>
              <span className="font-bold text-[#C62828]">{formattedRoles}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-3d-navy w-full sm:w-auto px-4 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#FFB900]" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="btn-3d-white w-full sm:w-auto px-4 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
