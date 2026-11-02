import React from 'react';
import {
  FileText,
  Filter,
  Cpu,
  Search,
  GitCompare,
  Scale,
  UserCheck,
  Users,
  ArrowRight,
  Database,
  Info,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const ExploreAITechnology: React.FC = () => {
  const steps = [
    {
      id: '01',
      title: 'Complaint Text Input',
      icon: FileText,
      subtitle: 'Text & Metadata',
      desc: 'Receive complaint narrative, institution identifier, grievance category, and submission metadata.',
    },
    {
      id: '02',
      title: 'Text Preprocessing',
      icon: Filter,
      subtitle: 'Normalize & Clean',
      desc: 'Clean extraneous formatting, standardize punctuation, and tokenize legal and factual statements.',
    },
    {
      id: '03',
      title: 'MPNet Embedding',
      icon: Cpu,
      subtitle: '768-d Vector',
      desc: 'all-mpnet-base-v2 generates dense 768-dimensional semantic embeddings capturing contextual meaning.',
      highlight: 'MPNet',
    },
    {
      id: '04',
      title: 'Candidate Retrieval',
      icon: Search,
      subtitle: 'Cosine & pgvector',
      desc: 'Identifies candidate cases using cosine similarity; pgvector planned for scalable vector index retrieval.',
    },
    {
      id: '05',
      title: 'Pairwise Features',
      icon: GitCompare,
      subtitle: 'Feature Vector',
      desc: 'Constructs comparison features: cosine affinity, vector differences, and categorical concordance.',
    },
    {
      id: '06',
      title: 'SVM Classification',
      icon: Scale,
      subtitle: 'Overlap Prediction',
      desc: 'Trained Support Vector Machine evaluates the pair against calibrated hyperplanes to predict overlap.',
      highlight: 'SVM',
    },
    {
      id: '07',
      title: 'Officer Verification',
      icon: UserCheck,
      subtitle: 'Human Review',
      desc: 'Candidate matches and supporting evidence highlights are presented to statutory officers for review.',
    },
    {
      id: '08',
      title: 'Coordination',
      icon: Users,
      subtitle: 'Cross-Bureau Action',
      desc: 'Verified relationships support joint inquiries, synchronized hearings, and harmonized directives.',
    },
  ];

  return (
    <section id="ai-technology" className="py-14 sm:py-16 px-4 bg-[#061E46] text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FFB900]/15 border border-[#FFB900]/40 px-3.5 py-1 rounded-full text-xs font-bold text-[#FFB900] tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Finalized AI Architecture • Proposed Pipeline</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            AI-Assisted Complaint Overlap Detection
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A specialized two-stage architecture pairing <strong>sentence-transformers/all-mpnet-base-v2</strong> (768-dimensional embeddings) with a <strong>Support Vector Machine (SVM)</strong> pairwise classifier to identify related institutional grievances across AICTE bureaus.
          </p>
        </div>

        {/* 8-Stage Architecture Flow */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-700/80">
            <span className="text-xs font-bold text-[#FFB900] uppercase tracking-wider font-mono">
              Proposed 8-Stage Architecture Pipeline
            </span>
            <span className="text-[11px] text-slate-400">
              Desktop: Sequential Flow • Mobile: Vertical Stack
            </span>
          </div>

          {/* Connected Flow: 8 Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              const isHighlight = Boolean(st.highlight);
              return (
                <div
                  key={st.id}
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between relative group ${
                    isHighlight
                      ? 'bg-[#092D62] border-amber-400/50 shadow-md ring-1 ring-[#FFB900]/20'
                      : 'bg-[#092D62]/40 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#FFB900]">
                        Stage {st.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center ${
                            isHighlight ? 'bg-[#FFB900] text-[#061E46]' : 'bg-[#061E46] text-[#FFB900]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {idx < steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-500 hidden lg:block" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{st.title}</span>
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {st.subtitle}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  {st.highlight && (
                    <div className="pt-2 mt-2 border-t border-slate-700/80 text-[10px] font-mono font-bold text-[#FFB900] uppercase">
                      Core Component: {st.highlight}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Separate Deep-Dive: MPNet Semantic Embeddings & SVM Classifier */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Component 1: MPNet Embeddings */}
          <div className="bg-[#092D62]/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#061E46] text-[#FFB900] flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Stage 1: Semantic Representation
                  </h3>
                  <span className="text-[11px] font-mono text-amber-300">
                    sentence-transformers/all-mpnet-base-v2
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">
                768 Dimensions
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                Traditional keyword searches fail when students and faculty articulate identical violations using differing vocabulary, regional phrasing, or separate procedural classifications.
              </p>
              <p>
                The <code>all-mpnet-base-v2</code> transformer maps each unstructured complaint into a dense <strong>768-dimensional semantic embedding space</strong>. Grievances describing analogous statutory infractions (e.g. mandatory fee extortions vs. capitation demands) cluster closely together geometrically.
              </p>
              <div className="p-3 bg-[#061E46]/80 rounded-lg border border-slate-700/80 space-y-1">
                <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#FFB900]" />
                  <span>Candidate Retrieval & Planned pgvector Storage</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cosine similarity serves as the rapid candidate retrieval mechanism, extracting top matching records within an institution’s active dockets. The target architecture incorporates <code>pgvector</code> in PostgreSQL to scale sub-second vector distance indexing.
                </p>
              </div>
            </div>
          </div>

          {/* Component 2: SVM Pairwise Classification */}
          <div className="bg-[#092D62]/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#061E46] text-[#FFB900] flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Stage 2: Pairwise Classification
                  </h3>
                  <span className="text-[11px] font-mono text-amber-300">
                    Support Vector Machine (SVM)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded border border-white/20 text-slate-200">
                Calibrated Hyperplane
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                Semantic similarity alone does not determine whether two complaints warrant coordinated administrative action. A complaint pair may share technical keywords but relate to completely unrelated academic years or separate campuses.
              </p>
              <p>
                NyayaNiti constructs a <strong>pairwise comparison feature vector</strong> combining cosine similarity, element-wise difference vectors, institutional permanent ID concordance, and regulatory category overlap.
              </p>
              <div className="p-3 bg-[#061E46]/80 rounded-lg border border-slate-700/80 space-y-1">
                <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Discriminative Overlap Decision</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  A trained Support Vector Machine evaluates the pairwise vector against optimal separating hyperplanes, generating a calibrated overlap prediction. This flag is surfaced exclusively as an advisory notice for human officer review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accuracy Demarcation: Existing Baseline vs Target Architecture */}
        <div className="bg-[#092D62] border border-blue-400/40 rounded-xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FFB900] uppercase tracking-wide">
            <Info className="w-4 h-4 text-[#FFB900] flex-shrink-0" />
            <span>Architecture Transparency & Implementation Demarcation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-[#061E46] rounded-lg border border-slate-700 space-y-1.5">
              <span className="font-bold text-slate-200 text-xs block">
                Current Operational Baseline
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The current operational release provides basic token similarity, category correlation, and permanent ID matching to link concurrent complaints for manual review.
              </p>
            </div>

            <div className="p-3.5 bg-[#061E46] rounded-lg border border-slate-700 space-y-1.5">
              <span className="font-bold text-[#FFB900] text-xs block">
                Finalized Target Pipeline (Under Phased Rollout)
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The full <code>all-mpnet-base-v2</code> embedding model, persistent 768-d vector storage (pgvector), and trained SVM classifier represent the approved target machine learning architecture for production deployment.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 italic pt-1">
            * Note: In compliance with statutory AI governance, NyayaNiti does not present synthetic benchmark metrics or automated case disposal. All machine learning outputs serve strictly as advisory decision-support for authorized AICTE officers.
          </p>
        </div>

        {/* Human-in-the-Loop Principle Reminder */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Mandatory Human Verification:</strong> Officers independently review flagged relationships before any cases are formally linked or coordinated.
            </span>
          </span>
          <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2.5 py-0.5 rounded border border-white/20">
            Non-Autonomous AI
          </span>
        </div>
      </div>
    </section>
  );
};

export default ExploreAITechnology;
