import React from 'react';
import { FileStack, Network, Clock, Building2, RefreshCw, AlertCircle } from 'lucide-react';

export const ExploreChallenges: React.FC = () => {
  const challenges = [
    {
      id: '01',
      title: 'Complaint Duplication',
      icon: FileStack,
      tag: 'Duplicate Representations',
      description:
        'Similar complaints may reach different bureaus independently through varied intake channels, public grievances, and direct representations without unified correlation.',
    },
    {
      id: '02',
      title: 'Fragmented Operations',
      icon: Network,
      tag: 'Isolated Bureau Silos',
      description:
        'Different teams may handle related cases without shared visibility, resulting in compartmentalized reviews and incomplete awareness of concurrent administrative proceedings.',
    },
    {
      id: '03',
      title: 'Delayed Coordination',
      icon: Clock,
      tag: 'Communication Latency',
      description:
        'Cross-bureau communication can delay action when inter-office memos and formal inquiries are required just to confirm whether another desk has initiated action.',
    },
    {
      id: '04',
      title: 'Institution Visibility',
      icon: Building2,
      tag: 'Scattered Records',
      description:
        'Institution-related complaint history may be scattered across distinct files and databases, preventing officers from viewing an institution’s comprehensive 360-degree compliance record.',
    },
    {
      id: '05',
      title: 'Repeated Work',
      icon: RefreshCw,
      tag: 'Redundant Inquiries',
      description:
        'Overlapping cases can lead to redundant investigation, duplicated committee hearings, and repeated follow-ups regarding the same underlying campus dispute.',
    },
  ];

  return (
    <section id="challenges" className="py-14 sm:py-16 px-4 bg-[#F4F6F9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs font-bold text-[#C62828] uppercase tracking-wider bg-red-50 px-3 py-1 rounded border border-red-200">
            The Problem
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#061E46] tracking-tight">
            Challenges in Decentralized Complaint Governance
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            When institutional grievances are processed across isolated departmental desks, administrative inefficiencies and blind spots inevitably arise.
          </p>
        </div>

        {/* 5 Professional Problem Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs hover:border-[#092D62] hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#092D62] text-[#FFB900] flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-[#092D62] transition-colors">
                      {c.id}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#061E46]">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-bold text-[#092D62] uppercase tracking-wider bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
                    {c.tag}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Contextual Institutional Impact Callout Card */}
          <div className="bg-gradient-to-br from-[#061E46] to-[#092D62] text-white rounded-xl p-5 sm:p-6 border border-slate-700 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFB900] uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Institutional Consequence</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Contradictory Directives & Loss of Trust
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Without cross-bureau coordination, one department may issue a show-cause or inspection notice while another desk grants approval, compromising regulatory consistency.
              </p>
            </div>

            <div className="pt-3.5 mt-4 border-t border-slate-700/80 text-[10px] text-amber-200/90 font-medium">
              Solved by NyayaNiti’s Convergence Engine
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreChallenges;
