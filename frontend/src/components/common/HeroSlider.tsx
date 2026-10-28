import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, FileCheck,
  CheckCircle, GitMerge, FileText, Search, UserCheck
} from 'lucide-react';

interface StepItem {
  number: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SlideData {
  id: number;
  tagline: string;
  title: string;
  description: string;
  primaryBtnText: string;
  primaryBtnLink: string;
  secondaryBtnText: string;
  secondaryBtnLink: string;
  steps: StepItem[];
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    tagline: 'AICTE ADMINISTRATIVE COORDINATION SYSTEM',
    title: 'Centralized Cross-Bureau Complaint Monitoring',
    description: 'Harmonize institutional grievances handled across Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC) with automated overlap detection and unified case visibility.',
    primaryBtnText: 'Access Officer Workspace',
    primaryBtnLink: '/dashboard',
    secondaryBtnText: 'View Case Register',
    secondaryBtnLink: '/cases',
    steps: [
      { number: '1', title: 'Case Registration', desc: 'Central ingestion across RB & PGRC channels', icon: FileText },
      { number: '2', title: 'Cross-Bureau Matching', desc: 'SBERT AI similarity & entity resolution', icon: GitMerge },
      { number: '3', title: 'Unified Disposal', desc: 'Coordinated order & compliance closure', icon: CheckCircle },
    ]
  },
  {
    id: 2,
    tagline: 'STATUTORY SLA COMPLIANCE & ESCALATION',
    title: 'Grievance Redressal & Priority Engine',
    description: 'Ensure zero procedural delays with explainable multi-factor priority ranking, automated SLA countdowns, and proactive escalation notices directly to Bureau Heads.',
    primaryBtnText: 'Review Priority Queue',
    primaryBtnLink: '/dashboard',
    secondaryBtnText: 'Check Deadlines',
    secondaryBtnLink: '/cases?overdue_only=true',
    steps: [
      { number: '1', title: 'Severity Scoring', desc: 'Statutory weighting of regulatory urgency', icon: ShieldCheck },
      { number: '2', title: 'Deadline Tracking', desc: 'Prescribed SLA monitoring & alerts', icon: FileCheck },
      { number: '3', title: 'Executive Review', desc: 'Bureau Head scrutiny & disposal tracking', icon: UserCheck },
    ]
  },
  {
    id: 3,
    tagline: 'IDENTITY RESOLUTION & ALIAS DISCOVERY',
    title: '360° Verified Technical Institution Records',
    description: 'Establish authoritative institution identity using exact AICTE Permanent IDs, gazette aliases, and geographical matching to eliminate fragmented case records.',
    primaryBtnText: 'Explore Institution Directory',
    primaryBtnLink: '/institutions',
    secondaryBtnText: 'Test Identity Engine',
    secondaryBtnLink: '/validation',
    steps: [
      { number: '1', title: 'Authoritative ID', desc: 'AICTE Permanent ID verification', icon: Search },
      { number: '2', title: 'Alias Resolution', desc: 'Historical & abbreviation matching', icon: GitMerge },
      { number: '3', title: '360° Dossier', desc: 'Consolidated regulatory case history', icon: FileCheck },
    ]
  },
  {
    id: 4,
    tagline: 'INTER-BUREAU COHERENCE & ACTION HARMONIZATION',
    title: 'Action Conflict Detection & Joint Workspaces',
    description: 'Prevent contradictory directives and duplicate inspections across departments through non-destructive reconciliation workspaces and collaborative tasks.',
    primaryBtnText: 'Overlap Review Centre',
    primaryBtnLink: '/overlaps',
    secondaryBtnText: 'Action Conflicts Centre',
    secondaryBtnLink: '/action-conflicts',
    steps: [
      { number: '1', title: 'Conflict Scanning', desc: 'Deterministic order discrepancy rules', icon: ShieldCheck },
      { number: '2', title: 'Joint Workspace', desc: 'Shared tasks across lead & peer bureaus', icon: GitMerge },
      { number: '3', title: 'Harmonized Order', desc: 'Audit-logged coherent regulatory stance', icon: CheckCircle },
    ]
  }
];

// Infinite looping track: prepend clone of last slide, append clone of first slide
const EXTENDED_SLIDES: SlideData[] = [
  SLIDES[SLIDES.length - 1], // index 0 (clone of Slide 4)
  ...SLIDES,                 // index 1..4 (Slides 1..4)
  SLIDES[0]                  // index 5 (clone of Slide 1)
];

// Thematic SVG background watermarks for depth & government portal authority
const SlideWatermark: React.FC<{ slideId: number; isActive: boolean }> = ({ slideId, isActive }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center transition-transform duration-[7000ms] ease-out ${
        isActive ? 'scale-105 opacity-100' : 'scale-100 opacity-90'
      }`}
    >
      {slideId === 1 && (
        <svg className="w-[620px] h-[620px] text-white opacity-[0.06]" viewBox="0 0 600 600" fill="none" stroke="currentColor">
          <circle cx="300" cy="300" r="260" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="300" cy="300" r="220" strokeWidth="26" />
          <circle cx="300" cy="300" r="160" strokeWidth="2" />
          <circle cx="300" cy="300" r="100" strokeWidth="12" />
          <circle cx="300" cy="300" r="30" strokeWidth="4" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            return (
              <line
                key={i}
                x1="300"
                y1="300"
                x2={300 + 150 * Math.cos((angle * Math.PI) / 180)}
                y2={300 + 150 * Math.sin((angle * Math.PI) / 180)}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      )}

      {slideId === 2 && (
        <svg className="w-[620px] h-[620px] text-white opacity-[0.06]" viewBox="0 0 600 600" fill="none" stroke="currentColor">
          <circle cx="300" cy="300" r="270" strokeWidth="2" strokeDasharray="4 8" />
          <circle cx="300" cy="300" r="230" strokeWidth="20" />
          <circle cx="300" cy="300" r="170" strokeWidth="3" />
          <path
            d="M300 90 L440 150 V310 C440 400 380 470 300 510 C220 470 160 400 160 310 V150 Z"
            strokeWidth="10"
          />
          <path
            d="M300 130 L400 180 V300 C400 370 350 430 300 460 C250 430 200 370 200 300 V180 Z"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          <line x1="300" y1="50" x2="300" y2="550" strokeWidth="1.5" strokeDasharray="10 10" />
          <line x1="50" y1="300" x2="550" y2="300" strokeWidth="1.5" strokeDasharray="10 10" />
        </svg>
      )}

      {slideId === 3 && (
        <svg className="w-[620px] h-[620px] text-white opacity-[0.06]" viewBox="0 0 600 600" fill="none" stroke="currentColor">
          <circle cx="300" cy="300" r="270" strokeWidth="22" />
          <circle cx="300" cy="300" r="220" strokeWidth="2" strokeDasharray="5 5" />
          <path d="M160 210 L300 120 L440 210 Z" strokeWidth="8" />
          <line x1="150" y1="210" x2="450" y2="210" strokeWidth="10" />
          <line x1="190" y1="220" x2="190" y2="440" strokeWidth="12" />
          <line x1="250" y1="220" x2="250" y2="440" strokeWidth="12" />
          <line x1="310" y1="220" x2="310" y2="440" strokeWidth="12" />
          <line x1="370" y1="220" x2="370" y2="440" strokeWidth="12" />
          <line x1="410" y1="220" x2="410" y2="440" strokeWidth="12" />
          <line x1="140" y1="440" x2="460" y2="440" strokeWidth="16" />
          <line x1="120" y1="465" x2="480" y2="465" strokeWidth="8" />
        </svg>
      )}

      {slideId === 4 && (
        <svg className="w-[620px] h-[620px] text-white opacity-[0.06]" viewBox="0 0 600 600" fill="none" stroke="currentColor">
          <circle cx="300" cy="300" r="270" strokeWidth="2" strokeDasharray="8 8" />
          <circle cx="240" cy="300" r="150" strokeWidth="18" />
          <circle cx="360" cy="300" r="150" strokeWidth="18" />
          <circle cx="300" cy="300" r="80" strokeWidth="6" strokeDasharray="4 4" />
          <circle cx="300" cy="300" r="25" strokeWidth="6" />
          <line x1="90" y1="300" x2="510" y2="300" strokeWidth="2" strokeDasharray="6 6" />
          <line x1="300" y1="90" x2="300" y2="510" strokeWidth="2" strokeDasharray="6 6" />
        </svg>
      )}
    </div>
  );
};

export const HeroSlider: React.FC = () => {
  // currentSlide is 0-indexed (0 to 3) representing the active slide
  const [currentSlide, setCurrentSlide] = useState(0);
  // trackIndex is the position in EXTENDED_SLIDES (1 to 4 for real slides, 0 and 5 for loop boundaries)
  const [trackIndex, setTrackIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);

  // Transition parameters: 1500ms duration, smooth luxury ease-in-out curve
  const TRANSITION_DURATION = 1500;
  const TRANSITION_TIMING = 'cubic-bezier(0.45, 0, 0.15, 1)';
  const AUTO_PLAY_INTERVAL = 7000;

  // Advance to next slide with smooth horizontal glide
  const nextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    setTrackIndex((prev) => prev + 1);
  }, [isTransitioning]);

  // Rewind to previous slide with smooth horizontal glide
  const prevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
    setTrackIndex((prev) => prev - 1);
  }, [isTransitioning]);

  // Jump directly to a specific slide via pagination dot
  const goToSlide = useCallback((targetIndex: number) => {
    if (isTransitioning || targetIndex === currentSlide) return;

    // Handle seamless wrap-around edge jumps smoothly
    if (currentSlide === 0 && targetIndex === SLIDES.length - 1) {
      setCurrentSlide(targetIndex);
      setIsTransitioning(true);
      setTrackIndex(0);
      return;
    }

    if (currentSlide === SLIDES.length - 1 && targetIndex === 0) {
      setCurrentSlide(targetIndex);
      setIsTransitioning(true);
      setTrackIndex(EXTENDED_SLIDES.length - 1);
      return;
    }

    setCurrentSlide(targetIndex);
    setIsTransitioning(true);
    setTrackIndex(targetIndex + 1);
  }, [currentSlide, isTransitioning]);

  // Auto-advance slides every 7 seconds when not hovered or transitioning
  useEffect(() => {
    if (isHovered || isTransitioning) return;

    const timer = setTimeout(() => {
      nextSlide();
    }, AUTO_PLAY_INTERVAL);

    return () => clearTimeout(timer);
  }, [currentSlide, isHovered, isTransitioning, nextSlide]);

  // Handle clone boundary reset once transition finishes
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Only respond to transform transition on the track itself
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;

    if (trackIndex === 0) {
      // Reached start clone (Slide 4) -> silently jump to real Slide 4 (index 4)
      setIsTransitioning(false);
      setTrackIndex(SLIDES.length);
    } else if (trackIndex === EXTENDED_SLIDES.length - 1) {
      // Reached end clone (Slide 1) -> silently jump to real Slide 1 (index 1)
      setIsTransitioning(false);
      setTrackIndex(1);
    } else {
      setIsTransitioning(false);
    }
  };

  // Failsafe timer in case transitionend event is dropped by browser tab suspension
  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      if (trackIndex === 0) {
        setTrackIndex(SLIDES.length);
      } else if (trackIndex === EXTENDED_SLIDES.length - 1) {
        setTrackIndex(1);
      }
    }, TRANSITION_DURATION + 100);

    return () => clearTimeout(timer);
  }, [isTransitioning, trackIndex]);

  return (
    <div
      className="relative bg-gradient-to-b from-[#061E46] via-[#092D62] to-[#0A336E] text-white overflow-hidden shadow-md border-b-4 border-[#FFB900] select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Government Technical Portal Highlights"
    >
      {/* Horizontal Carousel Sliding Track Container */}
      <div className="w-full overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-full"
          style={{
            transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
            transition: isTransitioning
              ? `transform ${TRANSITION_DURATION}ms ${TRANSITION_TIMING}`
              : 'none',
            willChange: 'transform',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {EXTENDED_SLIDES.map((slide, index) => {
            // Determine whether this slide is the currently visible one
            const isSlideActive = (trackIndex === index);

            return (
              <div
                key={`${slide.id}-${index}`}
                className="w-full flex-shrink-0 min-w-full relative pt-10 pb-4 px-4"
                aria-hidden={!isSlideActive}
              >
                {/* Subtle Thematic Parallax / Slow Zoom Watermark */}
                <SlideWatermark slideId={slide.id} isActive={isSlideActive} />

                {/* Hero Content Composition */}
                <div className="max-w-7xl mx-auto relative z-10">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]">
                    {/* Left Column: Tagline, Title, Description & 3D Action Buttons */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Tagline Badge */}
                      <div
                        className={`inline-flex items-center gap-2 bg-[#FFB900] text-[#061E46] px-2.5 py-0.5 rounded font-bold text-[11px] uppercase tracking-wider shadow-sm transition-all duration-700 ease-out ${
                          isSlideActive ? 'opacity-100 translate-x-0' : 'opacity-90 translate-x-1'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{slide.tagline}</span>
                      </div>

                      {/* Main Heading */}
                      <h2
                        className={`text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight transition-all duration-800 ease-out delay-75 ${
                          isSlideActive ? 'opacity-100 translate-x-0' : 'opacity-90 translate-x-1'
                        }`}
                      >
                        {slide.title}
                      </h2>

                      {/* Description */}
                      <p
                        className={`text-slate-200 text-sm leading-relaxed max-w-xl transition-all duration-800 ease-out delay-150 ${
                          isSlideActive ? 'opacity-100 translate-x-0' : 'opacity-90 translate-x-1'
                        }`}
                      >
                        {slide.description}
                      </p>

                      {/* 3D Action Buttons */}
                      <div
                        className={`flex flex-wrap items-center gap-3.5 pt-2 transition-all duration-700 ease-out delay-200 ${
                          isSlideActive ? 'opacity-100 translate-y-0' : 'opacity-95 translate-y-0.5'
                        }`}
                      >
                        <button
                          onClick={() => navigate(slide.primaryBtnLink)}
                          className="btn-3d-amber px-5 py-2.5 rounded text-xs tracking-wide flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFB900]"
                          tabIndex={isSlideActive ? 0 : -1}
                        >
                          <span>{slide.primaryBtnText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(slide.secondaryBtnLink)}
                          className="btn-3d-white px-5 py-2.5 rounded text-xs tracking-wide font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                          tabIndex={isSlideActive ? 0 : -1}
                        >
                          <span>{slide.secondaryBtnText}</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Clean 3-Step Process Infographic (CPGRAMS/AICTE inspired) */}
                    <div
                      className={`lg:col-span-5 bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20 shadow-lg transition-all duration-800 ease-out delay-100 ${
                        isSlideActive ? 'opacity-100 translate-x-0' : 'opacity-90 translate-x-1'
                      }`}
                    >
                      <div className="text-center pb-3 border-b border-white/15 mb-4">
                        <span className="text-xs uppercase tracking-widest text-[#FFB900] font-bold">
                          INSTITUTIONAL REGULATORY FLOW
                        </span>
                        <p className="text-[11px] text-slate-300">Statutory 3-Step Institutional Grievance Workflow</p>
                      </div>

                      <div className="space-y-3.5">
                        {slide.steps.map((st, idx) => {
                          const StepIcon = st.icon;
                          return (
                            <div key={st.number} className="relative flex items-center gap-3">
                              {/* Connecting Line between steps */}
                              {idx < slide.steps.length - 1 && (
                                <div className="absolute left-4 top-8 w-0.5 h-6 bg-amber-400/50"></div>
                              )}

                              {/* Step Number Circle */}
                              <div className="w-8 h-8 rounded-full bg-[#FFB900] text-[#061E46] font-bold text-xs flex items-center justify-center shadow-md flex-shrink-0 z-10">
                                {st.number}
                              </div>

                              {/* Step Content Card */}
                              <div className="flex-1 bg-white rounded p-2.5 text-slate-800 shadow-sm border border-slate-200 flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-bold text-[#092D62]">{st.title}</h4>
                                  <p className="text-[10px] text-slate-600">{st.desc}</p>
                                </div>
                                <StepIcon className="w-4 h-4 text-[#1E5AA8] flex-shrink-0 ml-2" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel Navigation Controls & Indicators */}
      <div className="max-w-7xl mx-auto px-4 pb-6 relative z-20">
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {/* Pagination Indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToSlide(idx)}
                disabled={isTransitioning}
                className={`h-2 transition-all duration-500 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#FFB900] ${
                  idx === currentSlide ? 'w-8 bg-[#FFB900]' : 'w-2 bg-white/40 hover:bg-white/70'
                } ${isTransitioning ? 'cursor-default' : ''}`}
                title={`Go to slide ${idx + 1}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Previous / Next Controls and Counter */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              disabled={isTransitioning}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-white"
              title="Previous Slide"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 font-mono tracking-widest select-none">
              {currentSlide + 1} / {SLIDES.length}
            </span>
            <button
              onClick={nextSlide}
              disabled={isTransitioning}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-white"
              title="Next Slide"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
