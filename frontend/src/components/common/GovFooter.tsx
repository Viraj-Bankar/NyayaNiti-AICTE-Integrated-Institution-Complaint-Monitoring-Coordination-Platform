import React from 'react';
import { Shield, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';

export const GovFooter: React.FC = () => {
  return (
    <footer className="bg-[#061E46] text-slate-300 border-t-4 border-[#092D62] text-xs pt-10 pb-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Col 1: AICTE Institutional Authority */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold text-xs shadow-sm">
              AICTE
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">न्यायनीति | NyayaNiti</h4>
              <p className="text-[10px] text-amber-300 font-semibold uppercase">AICTE Coordination Platform</p>
            </div>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Centralized administrative case-monitoring, semantic overlap detection, and cross-bureau coordination system for AICTE technical education governance.
          </p>
          <div className="pt-1">
            <span className="inline-block bg-[#092D62] border border-slate-700 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
              Version 1.0.0 (Official Portal)
            </span>
          </div>
        </div>

        {/* Col 2: Participating Bureaus */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#FFB900]" />
            Regulatory Bureaus
          </h5>
          <ul className="space-y-2 text-[11px] text-slate-400">
            <li className="hover:text-white transition-colors cursor-pointer">• Regulation Bureau (RB)</li>
            <li className="hover:text-white transition-colors cursor-pointer">• Public Grievance Redressal Cell (PGRC)</li>
            <li className="hover:text-white transition-colors cursor-pointer">• Approval Process & EoA Bureau</li>
            <li className="hover:text-white transition-colors cursor-pointer">• Policy & Academic Standards Cell</li>
            <li className="hover:text-white transition-colors cursor-pointer">• Vigilance & Monitoring Directorate</li>
          </ul>
        </div>

        {/* Col 3: Government Portals & Important Links */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60">
            Official Portals
          </h5>
          <ul className="space-y-2 text-[11px] text-slate-400">
            <li>
              <a href="https://www.aicte-india.org" target="_blank" rel="noreferrer" className="hover:text-[#FFB900] flex items-center gap-1">
                AICTE Official Web Portal <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </li>
            <li>
              <a href="https://pgportal.gov.in" target="_blank" rel="noreferrer" className="hover:text-[#FFB900] flex items-center gap-1">
                CPGRAMS Grievance Portal <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </li>
            <li>
              <a href="https://www.education.gov.in" target="_blank" rel="noreferrer" className="hover:text-[#FFB900] flex items-center gap-1">
                Ministry of Education, GoI <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </li>
            <li>
              <a href="https://scholarships.gov.in" target="_blank" rel="noreferrer" className="hover:text-[#FFB900] flex items-center gap-1">
                National Scholarship Portal <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Council Headquarters */}
        <div>
          <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3 pb-1 border-b border-slate-700/60">
            Council Headquarters
          </h5>
          <div className="space-y-2.5 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FFB900] flex-shrink-0 mt-0.5" />
              <span>Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FFB900] flex-shrink-0" />
              <span>011-26131576-78, 80</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FFB900] flex-shrink-0" />
              <span>grievance-support@aicte-india.org</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer & Copyright Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <div>
          <p>© {new Date().getFullYear()} All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India.</p>
          <p className="text-slate-500 mt-0.5">
            Administrative case-monitoring and cross-bureau coordination system. Strictly for authorized institutional officials.
          </p>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:underline cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Security Policy</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">NIC Guidelines</span>
        </div>
      </div>
    </footer>
  );
};
