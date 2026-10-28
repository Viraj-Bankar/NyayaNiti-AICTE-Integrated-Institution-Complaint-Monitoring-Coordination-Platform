import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'priority' | 'overlap' | 'conflict' | 'verification';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status' }) => {
  let colorClasses = 'bg-slate-100 text-slate-800 border-slate-300';

  const s = (status || '').toLowerCase();

  if (type === 'priority') {
    if (s === 'critical') {
      colorClasses = 'bg-red-50 text-red-800 border-red-300 font-bold';
    } else if (s === 'high') {
      colorClasses = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
    } else if (s === 'medium') {
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    } else if (s === 'low') {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  } else if (type === 'status') {
    if (s === 'pending') {
      colorClasses = 'bg-amber-50 text-amber-900 border-amber-300';
    } else if (s === 'under process') {
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-300';
    } else if (s === 'disposed') {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    } else if (s === 'transferred') {
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-300';
    } else if (s === 'escalated') {
      colorClasses = 'bg-red-50 text-red-800 border-red-300 font-bold animate-pulse';
    }
  } else if (type === 'overlap' || type === 'conflict') {
    if (s.includes('new') || s.includes('pending')) {
      colorClasses = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
    } else if (s.includes('conflict') || s.includes('coordination required')) {
      colorClasses = 'bg-red-50 text-red-800 border-red-300 font-bold';
    } else if (s.includes('resolved') || s.includes('proceed separately')) {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    } else if (s.includes('rejected')) {
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
    }
  } else if (type === 'verification') {
    if (s === 'verified' || s === 'verified match') {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    } else if (s.includes('probable')) {
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-300';
    } else if (s.includes('conflict') || s.includes('review')) {
      colorClasses = 'bg-red-50 text-red-800 border-red-300 font-bold';
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border font-medium whitespace-nowrap shadow-xs ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 mr-1.5"></span>
      {status}
    </span>
  );
};
