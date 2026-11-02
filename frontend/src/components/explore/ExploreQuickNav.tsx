import React, { useState, useEffect } from 'react';
import {
  Compass, Info, AlertTriangle, Layers, Cpu,
  Sparkles, CheckCircle2, ShieldCheck, HelpCircle, MessageSquare
} from 'lucide-react';

interface QuickNavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: QuickNavItem[] = [
  { id: 'hero', label: 'Overview', icon: Compass },
  { id: 'about', label: 'About', icon: Info },
  { id: 'challenges', label: 'The Problem', icon: AlertTriangle },
  { id: 'vision', label: 'Our Solution', icon: Layers },
  { id: 'capabilities', label: 'Capabilities', icon: Cpu },
  { id: 'ai-technology', label: 'AI & ML', icon: Sparkles },
  { id: 'how-it-works', label: 'How It Works', icon: CheckCircle2 },
  { id: 'security-trust', label: 'Security & DPDP', icon: ShieldCheck },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Feedback', icon: MessageSquare }
];

export const ExploreQuickNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('hero');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const el = document.getElementById(NAV_ITEMS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(NAV_ITEMS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -70;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Explore page section navigation"
      className="sticky top-0 z-20 bg-[#061E46]/95 backdrop-blur-md border-b border-[#092D62] text-slate-200 py-1.5 px-4 shadow-sm select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Section anchor navigation items */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none w-full">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FFB900] text-[#061E46] shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-[#092D62]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#061E46]' : 'text-amber-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ExploreQuickNav;
