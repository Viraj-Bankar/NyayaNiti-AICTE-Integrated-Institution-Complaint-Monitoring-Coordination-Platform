import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, Globe, UserCheck, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GovTopBar: React.FC = () => {
  const { fontSize, setFontSize, highContrast, toggleHighContrast, language, setLanguage, user, logout } = useAuth();

  return (
    <div className="bg-[#061E46] text-slate-200 text-xs py-1.5 px-4 border-b border-slate-700/60 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Official Gov of India Tag */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#FFB900] inline-block animate-pulse"></span>
            {language === 'hi' ? 'भारत सरकार | शिक्षा मंत्रालय' : 'GOVERNMENT OF INDIA | MINISTRY OF EDUCATION'}
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline">
            {language === 'hi' ? 'अखिल भारतीय तकनीकी शिक्षा परिषद (एआईसीटीई)' : 'All India Council for Technical Education (AICTE)'}
          </span>
        </div>

        {/* Right: Accessibility Controls & User Info */}
        <div className="flex items-center gap-3">
          {/* Accessibility text resize */}
          <div className="flex items-center bg-[#092D62] rounded px-1.5 py-0.5 border border-slate-600/50">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-1 hover:text-[#FFB900] ${fontSize === 'sm' ? 'font-bold text-[#FFB900]' : 'text-slate-300'}`}
              title="Small Text"
            >
              A-
            </button>
            <span className="text-slate-500 text-[10px]">|</span>
            <button
              onClick={() => setFontSize('md')}
              className={`px-1 hover:text-[#FFB900] ${fontSize === 'md' ? 'font-bold text-[#FFB900]' : 'text-slate-300'}`}
              title="Default Text"
            >
              A
            </button>
            <span className="text-slate-500 text-[10px]">|</span>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-1 hover:text-[#FFB900] ${fontSize === 'lg' ? 'font-bold text-[#FFB900]' : 'text-slate-300'}`}
              title="Large Text"
            >
              A+
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={toggleHighContrast}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-600/50 text-[11px] transition-colors ${
              highContrast ? 'bg-[#FFB900] text-[#061E46] font-semibold' : 'bg-[#092D62] text-slate-300 hover:text-white'
            }`}
            title="Toggle High Contrast Mode"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden md:inline">{highContrast ? 'Standard' : 'Contrast'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#092D62] border border-slate-600/50 text-[11px] text-slate-300 hover:text-[#FFB900]"
          >
            <Globe className="w-3 h-3" />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Auth Status & Quick Action */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-slate-700 pl-2">
              <span className="bg-[#1E5AA8] text-white px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#FFB900]" />
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
              <button
                onClick={logout}
                className="text-red-300 hover:text-red-100 underline text-[11px]"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 bg-[#FFB900] text-[#061E46] px-2.5 py-0.5 rounded font-semibold text-[11px] hover:bg-[#FFC526] transition-colors"
            >
              <UserCheck className="w-3 h-3" />
              Officer Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
