import React from 'react';
import { Sparkles, Info } from 'lucide-react';

export const ExploreAITechnology: React.FC = () => {
  return (
    <section id="ai-technology" className="py-14 px-4 bg-[#061E46] text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#FFB900] bg-white/10 px-3 py-1 rounded-full border border-[#FFB900]/40 uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Machine Learning Architecture</span>
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
            Intelligence Behind NyayaNiti
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong>MPNet + SVM – Semantic Complaint Overlap Detection</strong>
          </p>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            Traditional keyword searches and string-matching algorithms fail when grievances are articulated using varied phrasing, colloquial terminology, or distinct grievance categories. NyayaNiti implements a specialized dual-stage architecture combining deep 768-dimensional sentence transformer representations with discriminative support vector classification.
          </p>
        </div>

        {/* 7-Step Visual Vector Pipeline */}
        <div className="bg-[#092D62]/70 border border-slate-700 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-bold text-[#FFB900] mb-3 text-center uppercase tracking-wider">
            7-Stage Semantic Overlap & Vector Classification Pipeline
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">01</span>
              <span className="font-bold text-white text-[11px] mt-0.5">Complaint Intake</span>
              <span className="text-[9px] text-slate-300">Case Ingestion</span>
            </div>

            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">02</span>
              <span className="font-bold text-white text-[11px] mt-0.5">Normalization</span>
              <span className="text-[9px] text-slate-300">Clean & Structure</span>
            </div>

            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">03</span>
              <span className="font-bold text-white text-[11px] mt-0.5">MPNet Embedding</span>
              <span className="text-[9px] text-slate-300">768-d Vector</span>
            </div>

            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">04</span>
              <span className="font-bold text-white text-[11px] mt-0.5">Candidate Retrieval</span>
              <span className="text-[9px] text-slate-300">Permanent ID Filter</span>
            </div>

            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">05</span>
              <span className="font-bold text-white text-[11px] mt-0.5">Pair Features</span>
              <span className="text-[9px] text-slate-300">Cosine & Distance</span>
            </div>

            <div className="bg-[#061E46] border border-blue-400/30 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-[#FFB900] font-mono">06</span>
              <span className="font-bold text-white text-[11px] mt-0.5">SVM Classification</span>
              <span className="text-[9px] text-slate-300">Overlap Prediction</span>
            </div>

            <div className="bg-[#C62828]/80 border border-red-400/40 p-2.5 rounded-lg flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-amber-200 font-mono">07</span>
              <span className="font-bold text-white text-[11px] mt-0.5">Overlap Alert</span>
              <span className="text-[9px] text-slate-200">Officer Verification</span>
            </div>
          </div>
        </div>

        {/* Workflow Steps Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#092D62]/40 border border-slate-700 space-y-2">
            <span className="text-[#FFB900] font-bold text-xs uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-[10px]">1</span>
              Complaint Ingestion & Cleaning
            </span>
            <p className="text-slate-300 leading-relaxed">
              When a grievance is filed, the narrative undergoes structured tokenization and normalization—stripping extraneous formatting noise while preserving substantive legal and factual allegations.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#092D62]/40 border border-slate-700 space-y-2">
            <span className="text-[#FFB900] font-bold text-xs uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-[10px]">2</span>
              Dense 768-Dimensional Representations
            </span>
            <p className="text-slate-300 leading-relaxed">
              The <code>all-mpnet-base-v2</code> transformer transforms the grievance text into a dense 768-dimensional embedding, capturing deep semantics, contextual nuances, and regulatory meanings.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#092D62]/40 border border-slate-700 space-y-2">
            <span className="text-[#FFB900] font-bold text-xs uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-[10px]">3</span>
              Permanent ID Filtering & Pair Construction
            </span>
            <p className="text-slate-300 leading-relaxed">
              Active candidate cases matching the institution’s Permanent ID and affiliated regional clusters are extracted. Pairwise vector differences, cosine affinities, and category overlaps are assembled into a feature vector.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#092D62]/40 border border-slate-700 space-y-2">
            <span className="text-[#FFB900] font-bold text-xs uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-[10px]">4</span>
              SVM Pairwise Decision Classification
            </span>
            <p className="text-slate-300 leading-relaxed">
              A trained Support Vector Machine classifier evaluates the pairwise feature vector against calibrated decision hyperplanes, predicting case overlap with probabilistic confidence scores.
            </p>
          </div>
        </div>

        {/* Essential Principle: Human-in-the-Loop Oversight */}
        <div className="bg-[#092D62] border border-amber-400/40 rounded-lg p-4 text-xs text-amber-200 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#FFB900] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-[#FFB900] block text-xs">Essential Governance Principle: Human-in-the-Loop Oversight</strong>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              The MPNet + SVM engine functions strictly as a decision-support advisory system. AI models do not autonomously consolidate, dispose of, or merge complaints. Final determination of case relationship, cross-bureau coordination, or procedural disposal rests entirely with authorized AICTE administrative officers.
            </p>
          </div>
        </div>

        {/* Technology Stack Pills */}
        <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Enterprise Tech Stack:</span>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">React 19 + TypeScript</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">FastAPI (Python)</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">Neon PostgreSQL</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">SQLAlchemy ORM</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">all-mpnet-base-v2</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">scikit-learn (SVM)</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">Tailwind CSS</span>
          </div>
        </div>
      </div>
    </section>
  );
};
