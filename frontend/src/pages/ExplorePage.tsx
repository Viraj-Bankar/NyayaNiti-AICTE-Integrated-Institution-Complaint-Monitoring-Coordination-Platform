import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ExploreQuickNav,
  ExploreHero,
  ExploreAbout,
  ExploreChallenges,
  ExploreVision,
  ExploreCapabilities,
  ExploreAITechnology,
  ExploreHowItWorks,
  ExploreSecurityTrust,
  ExploreCriticalCases,
  ExploreBenefits,
  ExploreRoadmap,
  ExploreTransparency,
  ExploreFAQ,
  ExploreFeedback,
  ExploreCTA,
} from '../components/explore';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginClick = () => {
    navigate('/login', { state: location.state });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800">
      {/* Sticky Quick-Jump Anchor Navigation Bar */}
      <ExploreQuickNav />

      {/* Section 1: Hero */}
      <ExploreHero
        onExploreClick={() => scrollToSection('about')}
        onLoginClick={handleLoginClick}
      />

      {/* Section 2: Administrative Mandate & Pillars */}
      <ExploreAbout />

      {/* Section 3: Fragmented Governance Challenges */}
      <ExploreChallenges />

      {/* Section 4: Blueprint & Convergence Architecture */}
      <ExploreVision />

      {/* Section 5: Platform Capabilities (8 Pillars) */}
      <ExploreCapabilities />

      {/* Section 6: AI & Machine Learning Architecture */}
      <ExploreAITechnology />

      {/* Section 7: Operational Lifecycle & How It Works */}
      <ExploreHowItWorks />

      {/* Section 8: Trust, Identity & Security (TrustID & DigiLocker) */}
      <ExploreSecurityTrust />

      {/* Section 9: Statutory Escalation & Critical Cases */}
      <ExploreCriticalCases />

      {/* Section 10: Institutional & Administrative Benefits */}
      <ExploreBenefits />

      {/* Section 11: Strategic Technology Roadmap */}
      <ExploreRoadmap />

      {/* Section 12: Ethical Governance & Transparency */}
      <ExploreTransparency />

      {/* Section 13: Frequently Asked Questions */}
      <ExploreFAQ />

      {/* Section 14: Citizen & Stakeholder Feedback */}
      <ExploreFeedback />

      {/* Section 15: Final Call to Action & Back to Top */}
      <ExploreCTA onLoginClick={handleLoginClick} />
    </div>
  );
};

export default ExplorePage;
