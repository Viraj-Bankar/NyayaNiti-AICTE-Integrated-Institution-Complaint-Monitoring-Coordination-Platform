import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Shield, ArrowUpRight, User } from 'lucide-react';

interface ExploreCTAProps {
  onLoginClick: () => void;
}

export const ExploreCTA: React.FC<ExploreCTAProps> = ({ onLoginClick }) => {
  return (
    <section id="cta" className="py-16 sm:py-20 px-4 bg-gradient-to-r from-[#061E46] via-[#092D62] to-[#061E46] text-white text-center">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="w-12 h-12 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold mx-auto shadow-md">
          <Compass className="w-6 h-6" />
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          Building a More Connected and Accountable Institutional Complaint Ecosystem.
        </h2>

        <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed">
          Discover how NyayaNiti supports intelligent monitoring, institutional visibility and coordinated administrative action.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/complainant/login"
            className="btn-3d-amber px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <User className="w-4 h-4 text-[#061E46]" />
            <span>Track Your Complaint</span>
          </Link>

          <button
            onClick={onLoginClick}
            className="btn-3d-white px-6 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Shield className="w-4 h-4 text-[#092D62]" />
            <span>Officer Login</span>
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-5 py-3 rounded text-xs tracking-wide font-bold flex items-center gap-2 cursor-pointer shadow-md bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all"
          >
            <span>Back to Top</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExploreCTA;
