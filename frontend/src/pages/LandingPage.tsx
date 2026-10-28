import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSlider } from '../components/common/HeroSlider';
import { api } from '../services/api';
import { DashboardKpis } from '../types';
import {
  FileText, Shield, CheckCircle2, GitMerge, AlertTriangle,
  BarChart3, ArrowRight, Building, Clock, Users,
  Award, FileCheck2, ArrowUpRight, Megaphone
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  useEffect(() => {
    api.getKpis()
      .then(setKpis)
      .catch((err) => console.error('Failed to load landing metrics', err));
  }, []);

  const serviceCards = [
    {
      title: 'Centralized Case Management',
      desc: 'Comprehensive register for tracking all institutional complaints across Regulation Bureau and PGRC.',
      icon: FileText,
      link: '/cases',
      badge: 'Core Registry',
      color: 'border-l-4 border-[#092D62]'
    },
    {
      title: 'AI Overlap Detection Centre',
      desc: 'Sentence-BERT explainable semantic matching detects duplicate or related complaints across bureaus.',
      icon: GitMerge,
      link: '/overlaps',
      badge: 'SBERT AI Powered',
      color: 'border-l-4 border-[#FFB900]'
    },
    {
      title: 'Action Conflict Reconciliation',
      desc: 'Detects and resolves contradictory departmental directives or duplicate inspection orders.',
      icon: AlertTriangle,
      link: '/action-conflicts',
      badge: 'Integrity Check',
      color: 'border-l-4 border-[#C62828]'
    },
    {
      title: 'Cross-Bureau Coordination',
      desc: 'Collaborative workspaces for joint handling of multi-issue technical education grievances.',
      icon: Users,
      link: '/coordination',
      badge: 'Inter-Bureau',
      color: 'border-l-4 border-[#25B8BD]'
    },
    {
      title: 'Institution 360° Profiles',
      desc: 'Verified technical institution registry with Permanent IDs, gazette aliases, and complete case histories.',
      icon: Building,
      link: '/institutions',
      badge: 'Official Registry',
      color: 'border-l-4 border-[#1E5AA8]'
    },
    {
      title: 'Statutory Reports & Analytics',
      desc: 'Bureau workload analytics, SLA ageing distributions, and instant official CSV registry export.',
      icon: BarChart3,
      link: '/reports',
      badge: 'Management MIS',
      color: 'border-l-4 border-[#218653]'
    }
  ];

  const processMilestones = [
    {
      step: '01',
      title: 'Grievance Ingestion',
      desc: 'Multi-channel receipt via RB, PGRC, and affiliated state portals.',
      icon: FileText
    },
    {
      step: '02',
      title: 'Identity Resolution',
      desc: 'AICTE Permanent ID verification & historical alias resolution.',
      icon: CheckCircle2
    },
    {
      step: '03',
      title: 'AI Overlap Scanning',
      desc: 'SBERT semantic comparison detects cross-bureau overlap candidates.',
      icon: GitMerge
    },
    {
      step: '04',
      title: 'Action Conflict Check',
      desc: 'Automated verification against conflicting previous bureau orders.',
      icon: AlertTriangle
    },
    {
      step: '05',
      title: 'Statutory Disposal',
      desc: 'Harmonized compliance resolution within prescribed SLA window.',
      icon: Award
    }
  ];

  const announcements = [
    {
      date: 'OCT 2024',
      title: 'AICTE Approval Process Handbook 2024-25: Mandate for Central Grievance Redressal Mechanism',
      tag: 'Circular'
    },
    {
      date: 'SEP 2024',
      title: 'Mandatory Linkage of All Institution Grievance Records to AICTE Permanent IDs',
      tag: 'Order'
    },
    {
      date: 'AUG 2024',
      title: 'Establishment of Joint Standing Coordination Committee between RB and PGRC',
      tag: 'Notification'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      {/* 1. Hero Carousel */}
      <HeroSlider />

      {/* 2. Official Portal Key Metrics Banner */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded border border-slate-100 bg-[#F4F6F9]">
            <p className="text-2xl font-extrabold text-[#092D62]">{kpis ? kpis.total_complaints : 12}</p>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Total Complaints Logged</p>
          </div>
          <div className="p-3 rounded border border-slate-100 bg-[#F4F6F9]">
            <p className="text-2xl font-extrabold text-[#FFB900]">{kpis ? kpis.pending + kpis.under_process : 8}</p>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Active Cases Under Process</p>
          </div>
          <div className="p-3 rounded border border-slate-100 bg-[#F4F6F9]">
            <p className="text-2xl font-extrabold text-[#218653]">{kpis ? kpis.disposed : 2}</p>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Complaints Disposed</p>
          </div>
          <div className="p-3 rounded border border-slate-100 bg-[#F4F6F9]">
            <p className="text-2xl font-extrabold text-[#C62828]">{kpis ? kpis.potential_overlaps_awaiting_review : 1}</p>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Overlaps Awaiting Review</p>
          </div>
        </div>
      </section>

      {/* 3. Primary Core Services Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-[#1E5AA8] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            INTEGRATED PORTAL SERVICES
          </span>
          <h3 className="text-2xl font-extrabold text-[#061E46] mt-2">
            AICTE Cross-Bureau Regulatory Infrastructure
          </h3>
          <p className="text-slate-600 text-xs max-w-2xl mx-auto mt-1">
            Engineered specifically to overcome departmental silos, prevent duplicate institutional actions, and ensure consistent regulatory enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCards.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(srv.link)}
                className={`bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200 flex flex-col justify-between group ${srv.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                      {srv.badge}
                    </span>
                    <Icon className="w-5 h-5 text-[#092D62] group-hover:text-[#1E5AA8] transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-[#061E46] group-hover:text-[#1E5AA8] transition-colors">
                    {srv.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#092D62]">
                  <span>Access Module</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[#FFB900]" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Horizontal Grievance Redressal Process Timeline */}
      <section className="bg-white border-y border-slate-200 py-12 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-[#FFB900] bg-[#061E46] px-2.5 py-1 rounded">
              STATUTORY WORKFLOW
            </span>
            <h3 className="text-xl font-bold text-[#061E46] mt-2">
              End-to-End Institutional Grievance Coordination Lifecycle
            </h3>
            <p className="text-xs text-slate-500 max-w-xl mx-auto mt-1">
              Standard operating procedure enforced across technical education institutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {processMilestones.map((ms, idx) => {
              const Icon = ms.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#F4F6F9] rounded-lg p-4 border border-slate-200 relative flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-black text-[#092D62] font-mono">
                      {ms.step}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#092D62] text-white flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-[#FFB900]" />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#061E46]">{ms.title}</h5>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">{ms.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Official Circulars & Announcements Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <h4 className="text-sm font-bold text-[#061E46] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#1E5AA8]" />
              Official AICTE Circulars & Policy Directives
            </h4>
            <span className="text-xs font-semibold text-[#1E5AA8] cursor-pointer hover:underline">
              View All
            </span>
          </div>

          <div className="space-y-4">
            {announcements.map((ann, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 rounded hover:bg-[#F4F6F9] transition-colors border-b border-slate-100 last:border-0">
                <div className="bg-[#092D62] text-white px-2.5 py-1.5 rounded text-center font-mono flex-shrink-0">
                  <span className="text-[10px] block font-bold text-[#FFB900]">{ann.date.split(' ')[0]}</span>
                  <span className="text-xs font-extrabold">{ann.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                      {ann.tag}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#061E46] hover:text-[#1E5AA8] cursor-pointer">
                    {ann.title}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launchpad for Authorized Officers */}
        <div className="bg-gradient-to-br from-[#061E46] to-[#092D62] text-white rounded-lg p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-[#FFB900] text-[#061E46] flex items-center justify-center font-bold mb-3 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Authorized Officer Workspace</h4>
            <p className="text-xs text-slate-200 mt-2 leading-relaxed">
              Authorized personnel of Regulation Bureau, PGRC Cell, and Monitoring Directorate can access real-time dashboards and case records.
            </p>
          </div>

          <div className="space-y-2.5 pt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-3d-amber w-full py-2.5 rounded text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-3d-white w-full py-2.5 rounded text-xs tracking-wide cursor-pointer"
            >
              <span>Sign In with Gov Credentials</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
