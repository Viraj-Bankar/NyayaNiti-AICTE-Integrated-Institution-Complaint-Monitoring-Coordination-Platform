import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complianceApi, api } from '../services/api';
import { InstitutionScorecard, InstitutionalRiskIndicator, ComplianceAssessment, CorrectiveActionPlan, Institution } from '../types';
import { ComplianceSubNav } from '../components/compliance/ComplianceSubNav';
import { ReviewAssessmentModal } from '../components/compliance/ReviewAssessmentModal';
import { UploadEvidenceModal } from '../components/compliance/UploadEvidenceModal';
import {
  Building2, Award, AlertTriangle, ShieldAlert, CheckCircle2,
  Clock, AlertOctagon, FileText, ArrowLeft, ExternalLink,
  Info, RefreshCw, ChevronRight, CheckSquare
} from 'lucide-react';

export const InstitutionComplianceProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const institutionId = parseInt(id || '1', 10);
  const navigate = useNavigate();

  const [scorecard, setScorecard] = useState<InstitutionScorecard | null>(null);
  const [riskIndicators, setRiskIndicators] = useState<InstitutionalRiskIndicator[]>([]);
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('AY-2025-26');
  const [activeTab, setActiveTab] = useState<'assessments' | 'caps' | 'risks' | 'formula'>('assessments');

  // Modals
  const [assessmentToReview, setAssessmentToReview] = useState<ComplianceAssessment | null>(null);
  const [assessmentToUpload, setAssessmentToUpload] = useState<ComplianceAssessment | null>(null);

  useEffect(() => {
    loadInstitutionProfile();
  }, [institutionId, selectedPeriod]);

  const loadInstitutionProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cardData, riskData, assessData, capsData, instData] = await Promise.all([
        complianceApi.getScorecard(institutionId, selectedPeriod).catch(() => null),
        complianceApi.getRiskIndicators(institutionId).catch(() => []),
        complianceApi.listAssessments({ institution_id: institutionId, assessment_period: selectedPeriod }).catch(() => []),
        complianceApi.listCAPs({ institution_id: institutionId }).catch(() => []),
        api.getInstitutionProfile(institutionId).catch(() => null)
      ]);

      setScorecard(cardData);
      setRiskIndicators(riskData);
      setAssessments(assessData);
      setCaps(capsData);
      setInstitution(instData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load institution compliance profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadgeColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getAssessmentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIALLY_COMPLIANT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NON_COMPLIANT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <ComplianceSubNav />

      <div className="max-w-7xl mx-auto px-4 pt-5">
        {/* Back Link */}
        <button
          onClick={() => navigate('/compliance')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#092D62] mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Institutional Governance Overview</span>
        </button>

        {/* Institution Banner */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-[#092D62] text-white px-2 py-0.5 rounded">
                  {scorecard?.permanent_id || institution?.permanent_id || `INST-${institutionId}`}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  {scorecard?.region || institution?.region || 'National Jurisdiction'}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  {scorecard?.state || institution?.state || 'India'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#092D62] mt-1.5">
                {scorecard?.institution_name || institution?.official_name || `Institution #${institutionId}`}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                AICTE Approved Institution | Statutory Compliance Verification Dossier
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white border border-slate-300 text-xs rounded px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#092D62]"
              >
                <option value="AY-2025-26">Academic Year: AY-2025-26</option>
                <option value="AY-2024-25">Academic Year: AY-2024-25</option>
                <option value="AY-2023-24">Academic Year: AY-2023-24</option>
              </select>

              <button
                onClick={loadInstitutionProfile}
                className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Refresh compliance evaluation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key Indicators Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
            {/* Score % */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Compliance Percentage</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-extrabold text-[#092D62]">
                  {scorecard ? `${scorecard.compliance_percentage}%` : 'N/A'}
                </span>
                {scorecard?.is_provisional && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                    PROVISIONAL
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Weighted statutory score</div>
            </div>

            {/* Assessment Coverage % */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Assessment Coverage</div>
              <div className="text-2xl font-extrabold text-blue-700 mt-0.5">
                {scorecard ? `${scorecard.assessment_coverage_pct}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {scorecard ? `${scorecard.verified_compliant_count + scorecard.partially_compliant_count + scorecard.non_compliant_count} of ${scorecard.total_applicable_requirements} mandates evaluated` : 'Incomplete'}
              </div>
            </div>

            {/* Risk Tier */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Institutional Risk Tier</div>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-extrabold border ${getRiskBadgeColor(scorecard?.risk_tier || 'Low')}`}>
                  {scorecard?.risk_tier?.toUpperCase() || 'LOW'} RISK
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {riskIndicators.length} active risk indicators
              </div>
            </div>

            {/* Outstanding CAPs */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Remediation Directives</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-orange-900">
                  {scorecard?.active_cap_count ?? caps.length}
                </span>
                {(scorecard?.overdue_cap_count ?? 0) > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                    {scorecard?.overdue_cap_count} OVERDUE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Active Corrective Action Plans</div>
            </div>
          </div>
        </div>

        {/* Coverage Integrity Warning */}
        {scorecard && scorecard.assessment_coverage_pct < 50 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Insufficient Assessment Coverage ({scorecard.assessment_coverage_pct}%):</span> In compliance with AICTE regulatory guidelines, unassessed mandates are not presumed compliant. This score is marked as provisional until a comprehensive inspection or self-disclosure audit is completed.
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'assessments'
                ? 'border-[#092D62] text-[#092D62] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Mandate Assessments ({assessments.length})
          </button>
          <button
            onClick={() => setActiveTab('caps')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'caps'
                ? 'border-[#092D62] text-[#092D62] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Corrective Action Plans ({caps.length})
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'risks'
                ? 'border-[#092D62] text-[#092D62] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Risk Intelligence Flags ({riskIndicators.length})
          </button>
          <button
            onClick={() => setActiveTab('formula')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'formula'
                ? 'border-[#092D62] text-[#092D62] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Scoring Formula Transparency
          </button>
        </div>

        {/* Tab 1: Assessments */}
        {activeTab === 'assessments' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs mt-4 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Requirement Evaluations for {selectedPeriod}
              </span>
              <span className="text-[11px] text-slate-500">
                Click Review to enter officer audit findings or upload evidence
              </span>
            </div>

            {assessments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No assessments logged for this period.</p>
                <p className="text-[11px] text-slate-400 mt-1">Initiate an assessment from the Assessment Workspace.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Score Contribution</th>
                      <th className="p-3">Reviewer Findings</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-[#092D62] whitespace-nowrap">
                          {a.requirement_id}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">
                          {a.requirement_title || 'Regulatory Mandate'}
                        </td>
                        <td className="p-3 text-slate-600">{a.requirement_weight}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getAssessmentStatusColor(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-800">
                          {a.score_contribution.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">
                          {a.reviewer_remarks || <span className="italic text-slate-400">No remarks</span>}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => setAssessmentToReview(a)}
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-[#092D62] px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer shadow-xs"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => setAssessmentToUpload(a)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            + Evidence
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Corrective Action Plans */}
        {activeTab === 'caps' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs mt-4 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Active Corrective Action Directives
              </span>
              <button
                onClick={() => navigate('/compliance/caps')}
                className="text-[11px] text-[#092D62] font-bold hover:underline flex items-center gap-1"
              >
                <span>Manage in CAP Centre</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {caps.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <AlertOctagon className="w-8 h-8 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No Corrective Action Plans active for this institution.</p>
                <p className="text-[11px] text-slate-400 mt-1">Institutional deficiencies trigger formal CAP mandates.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {caps.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#092D62] bg-slate-100 px-2 py-0.5 rounded">
                            CAP #{c.id}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            c.priority === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {c.priority} Priority
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                            Bureau: {c.responsible_bureau_code || `#${c.responsible_bureau_id}`}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 mt-1.5">{c.title}</h3>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <strong>Gap:</strong> {c.identified_gap}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          <strong>Mandate:</strong> {c.required_action}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'CLOSED' || c.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.is_overdue
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Deadline: {new Date(c.prescribed_deadline).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Risk Intelligence Flags */}
        {activeTab === 'risks' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs mt-4 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#092D62] uppercase tracking-wide">
                Multi-Bureau Risk Intelligence Indicators
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Advisory diagnostic telemetry</span>
            </div>

            {riskIndicators.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-700">No elevated regulatory risk indicators detected.</p>
                <p className="text-[11px] text-slate-400 mt-1">Institution demonstrates stable multi-bureau operational metrics.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {riskIndicators.map((ind) => (
                  <div key={ind.id} className="p-4 hover:bg-slate-50/80">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeColor(ind.severity)}`}>
                            {ind.severity.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {ind.indicator_type.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 mt-1">{ind.title}</h3>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          <strong>Recommended Review Action:</strong> {ind.recommended_review}
                        </p>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Calculation: {ind.calculation_method} | Observation: {ind.observation_period}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] font-semibold text-slate-500">Data Completeness</div>
                        <div className="text-xs font-bold text-[#092D62]">
                          {(ind.data_completeness * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Formula Transparency */}
        {activeTab === 'formula' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs mt-4 p-5">
            <h2 className="text-xs font-bold text-[#092D62] uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
              Explainable Compliance Scoring Formula
            </h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed">
              <p className="font-bold text-[#092D62] mb-1">
                Score % = [ Sum(Score_Awarded_i * Weight_i) / Sum(Weight_i) ] * 100
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 mt-2 font-sans">
                <li><strong>Score_Awarded:</strong> Compliant = 1.0 | Partially Compliant = 0.5 | Non-Compliant = 0.0</li>
                <li><strong>Weights:</strong> Critical Statutory Mandate = 1.0 | Major Standard = 0.7 | Minor Procedural = 0.4</li>
                <li><strong>Assessment Coverage %:</strong> (Assessed Applicable Requirements / Total Applicable Requirements) * 100</li>
              </ul>
            </div>

            {scorecard?.formula_breakdown && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Applicable</div>
                  <div className="text-lg font-bold text-[#092D62]">{scorecard.formula_breakdown.total_applicable}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Evaluated Mandates</div>
                  <div className="text-lg font-bold text-[#092D62]">{scorecard.formula_breakdown.assessed}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Weighted Score Sum</div>
                  <div className="text-lg font-bold text-[#092D62]">{scorecard.formula_breakdown.weighted_score_sum.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Max Possible Weight</div>
                  <div className="text-lg font-bold text-[#092D62]">{scorecard.formula_breakdown.total_possible_weight.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {assessmentToReview && (
        <ReviewAssessmentModal
          isOpen={!!assessmentToReview}
          onClose={() => setAssessmentToReview(null)}
          assessment={assessmentToReview}
          onSuccess={(updated: ComplianceAssessment) => {
            setAssessments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            loadInstitutionProfile();
          }}
        />
      )}

      {/* Upload Evidence Modal */}
      {assessmentToUpload && (
        <UploadEvidenceModal
          isOpen={!!assessmentToUpload}
          onClose={() => setAssessmentToUpload(null)}
          assessment={assessmentToUpload}
          onSuccess={() => {
            loadInstitutionProfile();
          }}
        />
      )}
    </div>
  );
};

export default InstitutionComplianceProfilePage;
