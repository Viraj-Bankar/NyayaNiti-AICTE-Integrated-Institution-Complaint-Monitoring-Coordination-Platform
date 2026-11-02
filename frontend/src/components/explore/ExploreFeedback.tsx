import React from 'react';
import { MessageSquare, Info, Send } from 'lucide-react';

export const ExploreFeedback: React.FC = () => {
  return (
    <section id="contact" className="py-14 sm:py-16 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#092D62] px-3 py-1 rounded-full text-xs font-bold border border-blue-200 uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-[#1E5AA8]" />
            <span>Public Stakeholder Suggestions</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#061E46] tracking-tight">
            Share Your Suggestions on NyayaNiti
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            We welcome observations and recommendations from technical education stakeholders to guide future enhancements of the institutional complaint coordination platform.
          </p>
        </div>

        {/* Backend Availability Transparency Notice */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 text-xs text-[#092D62] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-[#092D62] block text-xs font-bold">
              Feature Preview • Online Intake In Development
            </strong>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Direct public feedback submission is currently under active development and will be integrated with the planned citizen governance services. The form below provides a non-functional preview of the upcoming submission categories.
            </p>
          </div>
        </div>

        {/* Form Interface Preview (Non-Functional) */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Feedback Category <span className="text-slate-400 font-normal">(Preview)</span>
              </label>
              <select
                disabled
                defaultValue="General Platform Suggestion"
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
              >
                <option value="General Platform Suggestion">General Platform Suggestion</option>
                <option value="AI & Overlap Detection">AI & Overlap Detection</option>
                <option value="Cross-Bureau Coordination">Cross-Bureau Coordination</option>
                <option value="Institutional Dossier Usability">Institutional Dossier Usability</option>
                <option value="Technical & Accessibility">Technical & Accessibility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Stakeholder Perspective <span className="text-slate-400 font-normal">(Preview)</span>
              </label>
              <select
                disabled
                defaultValue="Institutional Stakeholder"
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
              >
                <option value="Institutional Stakeholder">Institutional Representative / Faculty</option>
                <option value="Student / Citizen">Student / Scholar / Citizen</option>
                <option value="Academic Administrator">Academic Administrator</option>
                <option value="Regulatory Expert">Regulatory / Legal Professional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#061E46] mb-1">
              Feedback & Suggestions <span className="text-slate-400 font-normal">(Preview)</span>
            </label>
            <textarea
              rows={4}
              disabled
              placeholder="Online feedback intake will be enabled in a future release. Suggestions will support institutional monitoring and cross-bureau coordination workflows..."
              className="w-full text-xs p-3 rounded border border-slate-300 bg-slate-50 text-slate-400 resize-none cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 block text-right pt-0.5">
              Online submission endpoint scheduled for upcoming phased release.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 italic">
              * Non-functional preview interface. No data is stored or transmitted.
            </span>
            <button
              type="button"
              disabled
              className="px-5 py-2.5 rounded text-xs font-bold flex items-center gap-2 bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
            >
              <Send className="w-3.5 h-3.5 text-slate-400" />
              <span>Submission Currently In Development</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ExploreFeedback;
