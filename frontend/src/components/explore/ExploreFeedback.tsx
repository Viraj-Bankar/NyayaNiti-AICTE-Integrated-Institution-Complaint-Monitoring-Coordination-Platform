import React, { useState } from 'react';
import { MessageSquare, Check, AlertCircle, Send } from 'lucide-react';

export const ExploreFeedback: React.FC = () => {
  const [feedbackCategory, setFeedbackCategory] = useState('General Feedback');
  const [feedbackRating, setFeedbackRating] = useState('Helpful');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback or suggestion message.');
      return;
    }
    if (feedbackMessage.trim().length < 10) {
      setFeedbackError('Please provide a message with at least 10 characters.');
      return;
    }
    setFeedbackError(null);
    setFeedbackSubmitted(true);
  };

  const handleResetFeedback = () => {
    setFeedbackMessage('');
    setFeedbackContact('');
    setFeedbackCategory('General Feedback');
    setFeedbackRating('Helpful');
    setFeedbackSubmitted(false);
    setFeedbackError(null);
  };

  return (
    <section id="contact" className="py-14 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <span className="text-xs font-bold text-[#092D62] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 uppercase tracking-wider inline-flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-[#1E5AA8]" />
            <span>Public Stakeholder Feedback & Contact</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#061E46]">
            Share Your Insights on NyayaNiti
          </h2>
          <p className="text-xs text-slate-600">
            Help us refine the institutional monitoring, semantic intelligence, and cross-bureau coordination workflows.
          </p>
        </div>

        {feedbackSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900">
              Thank You for Your Feedback!
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              Your submission has been registered for evaluation by the NyayaNiti platform development and administrative oversight team.
            </p>
            <button
              onClick={handleResetFeedback}
              className="btn-3d-white px-4 py-2 rounded text-xs font-bold cursor-pointer mt-2"
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            {feedbackError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Feedback Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                >
                  <option value="General Feedback">General Feedback</option>
                  <option value="AI & Overlap Detection">AI & Overlap Detection</option>
                  <option value="Bureau Coordination Workflow">Bureau Coordination Workflow</option>
                  <option value="Usability & Accessibility">Usability & Accessibility</option>
                  <option value="Technical Issue / Suggestion">Technical Issue / Suggestion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#061E46] mb-1">
                  Experience Rating
                </label>
                <select
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                >
                  <option value="Very Helpful">Very Helpful</option>
                  <option value="Helpful">Helpful</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Your Suggestions / Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Describe your feedback, suggestion, or observations regarding the platform..."
                className="w-full text-xs p-3 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
                required
              />
              <span className="text-[10px] text-slate-500 block text-right">
                {feedbackMessage.length} characters (minimum 10 required)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#061E46] mb-1">
                Contact Information <span className="text-slate-400 font-normal">(Optional — Name / Email / Affiliation)</span>
              </label>
              <input
                type="text"
                value={feedbackContact}
                onChange={(e) => setFeedbackContact(e.target.value)}
                placeholder="e.g. Student / Faculty / Institutional Officer (email@domain.com)"
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#092D62]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="btn-3d-navy px-5 py-2.5 rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5 text-[#FFB900]" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
