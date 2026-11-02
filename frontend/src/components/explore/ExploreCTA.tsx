import React from 'react';
import { Compass, Shield, ArrowUpRight } from 'lucide-react';

interface ExploreCTAProps {
  onLoginClick: () => void;
}

export const ExploreCTA: React.FC<ExploreCTAProps> = ({ onLoginClick }) => {
  return (
    <section id="cta" className="py-16 px-4 bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#061E46] text-white text-center">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="w-12 h-12 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold mx-auto shadow-md">
          <Compass className="w-6 h-6" />
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
          Building a More Connected and Accountable Institutional Grievance Ecosystem
        </h2>

        <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed">
          Explore a smarter approach to institutional complaint monitoring, intelligent case analysis and coordinated administrative action across AICTE bureaus.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onLoginClick}
            className="btn-3d-amber px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Shield className="w-4 h-4" />
            <span>Officer Login / Access Platform</span>
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-3d-white px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>Back to Top</span>
            <ArrowUpRight className="w-4 h-4 text-[#092D62]" />
          </button>
        </div>
      </div>
    </section>
  );
};
