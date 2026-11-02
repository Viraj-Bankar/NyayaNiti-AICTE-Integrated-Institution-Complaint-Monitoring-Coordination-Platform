import React from 'react';
import { Check, Clock, AlertCircle, FileText, Building2, Search, Award } from 'lucide-react';
import { ComplainantCaseMilestone } from '../../types';

interface GrievanceRedressalStepperProps {
  status: string;
  events?: ComplainantCaseMilestone[];
}

interface StepDefinition {
  id: number;
  label: string;
  shortDesc: string;
  icon: React.ElementType;
}

const STEPS: StepDefinition[] = [
  { id: 1, label: 'Grievance Lodged', shortDesc: 'Registered in AICTE Portal', icon: FileText },
  { id: 2, label: 'Bureau Allocated', shortDesc: 'PGRC Regulatory Scrutiny', icon: Building2 },
  { id: 3, label: 'Inquiry in Progress', shortDesc: 'Institution Notice & Hearing', icon: Search },
  { id: 4, label: 'Determination Issued', shortDesc: 'Remedial Action Enforced', icon: Clock },
  { id: 5, label: 'Disposed / Resolved', shortDesc: 'Final Order Communicated', icon: Award }
];

export const GrievanceRedressalStepper: React.FC<GrievanceRedressalStepperProps> = ({ status, events: _events = [] }) => {
  const normStatus = (status || '').toLowerCase();

  // Determine current active step (1 to 5)
  let currentStep = 1;
  let isRejected = false;
  let isAdditionalInfo = false;

  if (normStatus.includes('disposed') || normStatus.includes('resolved') || normStatus.includes('closed')) {
    currentStep = 5;
  } else if (normStatus.includes('in progress') || normStatus.includes('hearing') || normStatus.includes('inquiry')) {
    currentStep = 3;
  } else if (normStatus.includes('under review') || normStatus.includes('scrutiny') || normStatus.includes('allocated')) {
    currentStep = 2;
  } else if (normStatus.includes('rejected')) {
    isRejected = true;
    currentStep = 2;
  } else if (normStatus.includes('additional') || normStatus.includes('clarification')) {
    isAdditionalInfo = true;
    currentStep = 3;
  } else {
    // Submitted or Pending
    currentStep = 1;
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E5AA8] block">
            Statutory Lifecycle Stepper
          </span>
          <h4 className="text-sm font-bold text-[#061E46]">Grievance Progress Milestone</h4>
        </div>
        <div className="flex items-center gap-2">
          {isRejected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Grievance Rejected with Reasoned Order
            </span>
          ) : isAdditionalInfo ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Additional Information Requested
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-[#092D62] border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-[#1E5AA8] animate-pulse" />
              Stage {currentStep} of 5: {STEPS[currentStep - 1]?.label}
            </span>
          )}
        </div>
      </div>

      {/* Responsive Horizontal Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2 relative">
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep || (step.id === 5 && currentStep === 5);
          const isCurrent = step.id === currentStep && currentStep !== 5;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                isCompleted
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                  : isCurrent
                  ? 'bg-blue-50/90 border-[#1E5AA8] text-[#061E46] ring-1 ring-[#1E5AA8]/30 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#092D62] text-[#FFB900]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isCompleted ? 'text-emerald-600' : isCurrent ? 'text-[#1E5AA8]' : 'text-slate-300'
                  }`}
                />
              </div>

              <div>
                <span
                  className={`text-xs font-bold block ${
                    isCompleted
                      ? 'text-emerald-900'
                      : isCurrent
                      ? 'text-[#061E46]'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  {step.shortDesc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GrievanceRedressalStepper;
