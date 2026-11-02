import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, MapPin, ExternalLink, ArrowRight, Building2, ChevronRight } from 'lucide-react';

const CURRENT_YEAR = 2026;

export const GovFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionScroll = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (location.pathname === '/' || location.pathname === '/explore') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/explore#${sectionId}`);
  };

  return (
    <footer className="bg-[#061E46] text-slate-300 border-t-4 border-[#092D62] text-xs pt-12 pb-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {/* Col 1: AICTE Authority & NyayaNiti identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-xs shadow-sm">
              AICTE
            </div>
            <div>
              <h4 className="text-white font-bold text-sm tracking-tight">न्यायनीति | NyayaNiti</h4>
              <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                AICTE Complaint Monitoring Platform
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Centralized administrative complaint monitoring, AI-assisted candidate overlap detection, and cross-bureau coordination system for AICTE technical education governance.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="inline-block bg-[#092D62] border border-slate-700 text-amber-300 text-[10px] px-2.5 py-0.5 rounded font-mono">
              Version 1.0.0 (Official Portal)
            </span>
            <span className="inline-block bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded">
              Govt. of India
            </span>
          </div>
        </div>

        {/* Col 2: Platform Exploration (Explore Page Section Links) */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-[#FFB900]" />
            Explore NyayaNiti
          </h5>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li>
              <a
                href="#about"
                onClick={(e) => handleSectionScroll(e, 'about')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>About NyayaNiti</span>
              </a>
            </li>
            <li>
              <a
                href="#challenges"
                onClick={(e) => handleSectionScroll(e, 'challenges')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Challenges & Proposed Solution</span>
              </a>
            </li>
            <li>
              <a
                href="#capabilities"
                onClick={(e) => handleSectionScroll(e, 'capabilities')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Core Capabilities & Institution 360</span>
              </a>
            </li>
            <li>
              <a
                href="#ai-technology"
                onClick={(e) => handleSectionScroll(e, 'ai-technology')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>AI & Overlap Architecture</span>
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                onClick={(e) => handleSectionScroll(e, 'how-it-works')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Operational Lifecycle Workflow</span>
              </a>
            </li>
            <li>
              <a
                href="#security-trust"
                onClick={(e) => handleSectionScroll(e, 'security-trust')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Security & Access Governance</span>
              </a>
            </li>
            <li>
              <a
                href="#future-vision"
                onClick={(e) => handleSectionScroll(e, 'future-vision')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Planned Future Scope</span>
              </a>
            </li>
            <li>
              <a
                href="#faq"
                onClick={(e) => handleSectionScroll(e, 'faq')}
                className="hover:text-white transition-colors flex items-center gap-1 group"
              >
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-[#FFB900] transition-colors" />
                <span>Frequently Asked Questions</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Official Portals & Officer Access */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#FFB900]" />
            Official Portals & Access
          </h5>
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-[#092D62]/60 border border-slate-700 space-y-2">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                Authorized Personnel
              </span>
              <p className="text-[11px] text-slate-300 leading-snug">
                Administrative access is restricted to authenticated AICTE officers and cell members.
              </p>
              <Link
                to="/login"
                className="btn-3d-amber px-3 py-1.5 rounded text-[11px] font-bold inline-flex items-center gap-1.5 text-[#061E46] cursor-pointer shadow-xs"
              >
                <Shield className="w-3 h-3" />
                <span>Officer Login</span>
              </Link>
            </div>

            <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700 space-y-1.5">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                Citizen Grievance Portal
              </span>
              <p className="text-[11px] text-slate-300 leading-snug">
                Submit and track complaints filed with AICTE bureaus.
              </p>
              <Link
                to="/complainant/login"
                className="btn-3d-white px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1.5 text-[#061E46] cursor-pointer shadow-xs"
              >
                <span>Citizen Sign In / Register</span>
              </Link>
            </div>

            <ul className="space-y-1.5 text-[11px] text-slate-400 pt-1">
              <li>
                <a
                  href="https://www.aicte-india.org"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#FFB900] transition-colors flex items-center gap-1"
                >
                  <span>AICTE Official Web Portal</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://pgportal.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#FFB900] transition-colors flex items-center gap-1"
                >
                  <span>CPGRAMS Grievance Portal</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.education.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#FFB900] transition-colors flex items-center gap-1"
                >
                  <span>Ministry of Education, GoI</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Col 4: Council Headquarters */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#FFB900]" />
            Council Headquarters
          </h5>
          <div className="space-y-3 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FFB900] flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="text-white font-semibold block">
                  All India Council for Technical Education
                </span>
                <span>Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</span>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded p-2.5 border border-slate-700/70 text-[10px] space-y-1">
              <span className="font-bold text-slate-200 block uppercase tracking-wider">
                Statutory Regulatory Body
              </span>
              <p className="text-slate-400 leading-normal">
                Department of Higher Education, Ministry of Education, Government of India.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer & Copyright Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <div>
          <p>© {CURRENT_YEAR} All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India.</p>
          <p className="text-slate-500 mt-0.5">
            Administrative institutional complaint monitoring and cross-bureau coordination system. Strictly for authorized institutional officials.
          </p>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:underline cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Security & Access Governance</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">NIC Compliance Guidelines</span>
        </div>
      </div>
    </footer>
  );
};

export default GovFooter;
