import React, { useRef } from 'react';
import { Printer, X, Shield, CheckCircle2 } from 'lucide-react';
import { ComplainantReceipt } from '../../types';

interface GrievanceReceiptModalProps {
  receipt: ComplainantReceipt | null;
  onClose: () => void;
}

export const GrievanceReceiptModal: React.FC<GrievanceReceiptModalProps> = ({ receipt, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#061E46]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full my-8 overflow-hidden flex flex-col">
        {/* Action Header */}
        <div className="bg-[#092D62] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#FFB900] print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FFB900]" />
            <h3 className="text-sm font-bold tracking-wide">Statutory Grievance Lodging Acknowledgment</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-3d-amber px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Print official receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Slip */}
        <div ref={receiptRef} className="p-8 space-y-6 text-slate-800 font-sans print:p-0">
          {/* Slip Header */}
          <div className="border-b-2 border-slate-300 pb-5 text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-[#092D62] border-2 border-[#FFB900] text-white flex items-center justify-center font-black text-xs mx-auto mb-2 shadow-xs">
              <span className="text-[#FFB900]">AICTE</span>
            </div>
            <h2 className="text-base font-black text-[#061E46] tracking-tight uppercase">
              All India Council for Technical Education (AICTE)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Public Grievance Redressal Cell (PGRC) • Institutional Grievance Monitoring Directorate
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#092D62] border border-blue-200">
                OFFICIAL LODGING REFERENCE: {receipt.case_id}
              </span>
            </div>
          </div>

          {/* Grievance Summary Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Complainant Name</span>
              <span className="font-bold text-slate-800">{receipt.complainant_name} ({receipt.complainant_type})</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Registered Email</span>
              <span className="font-mono text-slate-800">{receipt.complainant_email}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">AICTE Permanent ID</span>
              <span className="font-mono font-bold text-[#092D62]">{receipt.permanent_id}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Filing Timestamp</span>
              <span className="text-slate-800">{new Date(receipt.date_received).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Institution Anchoring */}
          <div className="space-y-1 border-l-3 border-[#1E5AA8] pl-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Respondent Institution</span>
            <h4 className="text-xs font-bold text-[#061E46]">{receipt.institution_name}</h4>
            <p className="text-[11px] text-slate-600">{receipt.institution_address}</p>
          </div>

          {/* Factual Allegation Details */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#061E46]">Subject / Category</span>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                {receipt.category}
              </span>
            </div>
            {receipt.title && (
              <h5 className="text-xs font-bold text-slate-800">
                {receipt.title}
              </h5>
            )}
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              {receipt.description}
            </p>
          </div>

          {/* Statutory SLA Guarantee */}
          <div className="bg-emerald-50/80 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Statutory Target Resolution Deadline: <strong>{new Date(receipt.prescribed_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Priority: {receipt.priority}
            </span>
          </div>

          {/* Footer Statutory Seal Note */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 space-y-1">
            <p>
              • This is a system-generated statutory acknowledgment slip issued under the AICTE (Redressal of Grievance of Students) Regulations.
            </p>
            <p>
              • Track real-time progress, institution notices, and formal inquiry orders online via the NyayaNiti Citizen Portal using Reference ID <strong>{receipt.case_id}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrievanceReceiptModal;
