from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Institution, RegulatoryRequirement, ComplianceAssessment,
    ComplianceEvidence, ComplianceScoreSnapshot, CorrectiveActionPlan,
    InstitutionalRiskIndicator, User, DocumentMetadata
)
from app.services.audit_service import log_audit_event

def is_requirement_applicable(requirement: RegulatoryRequirement, institution: Institution) -> bool:
    """
    Checks if a regulatory standard applies to a given institution based on
    type matching and applicability conditions.
    """
    if not requirement.is_active:
        return False

    types = requirement.applicable_institution_types or ["ALL"]
    if "ALL" not in types and institution.institution_type not in types:
        return False

    conds = requirement.applicability_conditions
    if conds and isinstance(conds, dict):
        if "region" in conds and institution.region != conds["region"]:
            return False
        if "state" in conds and institution.state != conds["state"]:
            return False

    return True

def create_or_get_assessment(
    db: Session,
    institution_id: int,
    requirement_id: str,
    assessment_period: str = "AY-2025-26",
    actor_user: Optional[User] = None
) -> ComplianceAssessment:
    """
    Retrieves or creates a compliance assessment record for an institution,
    linking to the current version of the regulatory requirement.
    """
    existing = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.institution_id == institution_id,
        ComplianceAssessment.requirement_id == requirement_id,
        ComplianceAssessment.assessment_period == assessment_period
    ).first()

    if existing:
        return existing

    req = db.query(RegulatoryRequirement).filter(RegulatoryRequirement.id == requirement_id).first()
    if not req:
        raise ValueError(f"Regulatory requirement '{requirement_id}' not found.")

    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise ValueError(f"Institution #{institution_id} not found.")

    # Determine initial status: if out of scope, mark NOT_APPLICABLE
    init_status = "NOT_ASSESSED"
    if not is_requirement_applicable(req, inst):
        init_status = "NOT_APPLICABLE"

    assessment = ComplianceAssessment(
        institution_id=institution_id,
        requirement_id=requirement_id,
        requirement_version=req.version,
        assessment_period=assessment_period,
        status=init_status,
        score_contribution=None,
        decision_history=[{
            "event": "ASSESSMENT_INITIALIZED",
            "status": init_status,
            "timestamp": datetime.utcnow().isoformat(),
            "actor": actor_user.username if actor_user else "SYSTEM"
        }]
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    if actor_user:
        log_audit_event(
            db=db,
            actor_id=actor_user.id,
            actor_name=actor_user.full_name,
            actor_role=actor_user.role,
            event_type="COMPLIANCE_ASSESSMENT_CREATE",
            entity_type="ComplianceAssessment",
            entity_id=str(assessment.id),
            remarks=f"Assessment initialized for {inst.official_name} under {req.id} ({assessment_period})"
        )

    return assessment

def record_assessment_review(
    db: Session,
    assessment_id: int,
    status: str,
    reviewer_remarks: str,
    reviewer_user: User,
    score_contribution: Optional[float] = None
) -> ComplianceAssessment:
    """
    Human officer review and determination on an institutional assessment.
    """
    assessment = db.query(ComplianceAssessment).filter(ComplianceAssessment.id == assessment_id).first()
    if not assessment:
        raise ValueError(f"Assessment #{assessment_id} not found.")

    valid_statuses = [
        "COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT",
        "PENDING_EVIDENCE", "UNDER_REVIEW", "NOT_APPLICABLE"
    ]
    if status not in valid_statuses:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}")

    # Compute default score contribution based on approved methodology
    if score_contribution is None:
        if status == "COMPLIANT":
            score_contribution = 1.0
        elif status == "PARTIALLY_COMPLIANT":
            score_contribution = 0.5
        elif status == "NON_COMPLIANT":
            score_contribution = 0.0
        else:
            score_contribution = None

    prev_status = assessment.status
    now = datetime.utcnow()
    assessment.status = status
    assessment.score_contribution = score_contribution
    assessment.reviewer_id = reviewer_user.id
    assessment.reviewer_remarks = reviewer_remarks
    assessment.assessed_at = now
    assessment.updated_at = now

    history = assessment.decision_history or []
    history.append({
        "event": "REVIEW_DETERMINATION",
        "previous_status": prev_status,
        "new_status": status,
        "score_contribution": score_contribution,
        "reviewer_id": reviewer_user.id,
        "reviewer_name": reviewer_user.full_name,
        "remarks": reviewer_remarks,
        "timestamp": now.isoformat()
    })
    assessment.decision_history = history

    db.commit()
    db.refresh(assessment)

    log_audit_event(
        db=db,
        actor_id=reviewer_user.id,
        actor_name=reviewer_user.full_name,
        actor_role=reviewer_user.role,
        event_type="COMPLIANCE_ASSESSMENT_DETERMINATION",
        entity_type="ComplianceAssessment",
        entity_id=str(assessment.id),
        previous_value=prev_status,
        new_value=status,
        remarks=reviewer_remarks
    )

    # Automatically recalculate and record snapshot
    calculate_institution_compliance(
        db=db,
        institution_id=assessment.institution_id,
        assessment_period=assessment.assessment_period
    )

    return assessment

def calculate_institution_compliance(
    db: Session,
    institution_id: int,
    assessment_period: str = "AY-2025-26"
) -> Dict[str, Any]:
    """
    Explainable, weighted mathematical compliance calculation as approved:
    Compliance Percentage = (Weighted score of verified applicable / Total weight of verified applicable) * 100
    Coverage Percentage = (Assessed Applicable / Total Applicable) * 100
    """
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise ValueError(f"Institution #{institution_id} not found.")

    # 1. Fetch all active regulatory requirements
    all_reqs = db.query(RegulatoryRequirement).filter(RegulatoryRequirement.is_active == True).all()

    # Filter applicable requirements
    applicable_reqs = [r for r in all_reqs if is_requirement_applicable(r, inst)]
    applicable_req_ids = {r.id: r for r in applicable_reqs}
    total_applicable = len(applicable_reqs)

    # 2. Fetch all assessments for this institution & period
    assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.institution_id == institution_id,
        ComplianceAssessment.assessment_period == assessment_period
    ).all()
    assess_by_req = {a.requirement_id: a for a in assessments}

    verified_weight_total = 0.0
    verified_score_total = 0.0

    compliant_count = 0
    partially_compliant_count = 0
    non_compliant_count = 0
    pending_evidence_count = 0
    under_review_count = 0
    not_assessed_count = 0
    not_applicable_count = 0

    calculation_items = []

    for req in applicable_reqs:
        a = assess_by_req.get(req.id)
        status = a.status if a else "NOT_ASSESSED"
        w = float(req.weight or 1.0)

        if status == "COMPLIANT":
            compliant_count += 1
            verified_weight_total += w
            verified_score_total += (w * 1.0)
            calculation_items.append({"requirement_id": req.id, "weight": w, "multiplier": 1.0, "status": status})
        elif status == "PARTIALLY_COMPLIANT":
            partially_compliant_count += 1
            verified_weight_total += w
            verified_score_total += (w * 0.5)
            calculation_items.append({"requirement_id": req.id, "weight": w, "multiplier": 0.5, "status": status})
        elif status == "NON_COMPLIANT":
            non_compliant_count += 1
            verified_weight_total += w
            verified_score_total += 0.0
            calculation_items.append({"requirement_id": req.id, "weight": w, "multiplier": 0.0, "status": status})
        elif status == "PENDING_EVIDENCE":
            pending_evidence_count += 1
        elif status == "UNDER_REVIEW":
            under_review_count += 1
        elif status == "NOT_APPLICABLE":
            not_applicable_count += 1
        else:
            not_assessed_count += 1

    # Handled non-applicable exclusion from denominator
    effective_applicable_count = total_applicable - not_applicable_count
    evaluated_count = compliant_count + partially_compliant_count + non_compliant_count + pending_evidence_count + under_review_count
    verified_count = compliant_count + partially_compliant_count + non_compliant_count

    # Calculate compliance %
    if verified_weight_total > 0.0:
        compliance_pct = round((verified_score_total / verified_weight_total) * 100.0, 1)
    else:
        compliance_pct = 0.0

    # Calculate assessment coverage %
    if effective_applicable_count > 0:
        coverage_pct = round((evaluated_count / effective_applicable_count) * 100.0, 1)
    else:
        coverage_pct = 100.0 if total_applicable == 0 else 0.0

    is_provisional = coverage_pct < 50.0

    # Risk Tier assignment based on verified compliance & coverage
    if coverage_pct == 0.0:
        risk_tier = "MODERATE_RISK"  # Unassessed baseline
    elif compliance_pct >= 85.0 and not is_provisional:
        risk_tier = "LOW_RISK"
    elif compliance_pct >= 65.0:
        risk_tier = "MODERATE_RISK"
    elif compliance_pct >= 40.0:
        risk_tier = "HIGH_RISK"
    else:
        risk_tier = "CRITICAL_RISK"

    # CAP Counts
    active_caps = db.query(func.count(CorrectiveActionPlan.id)).filter(
        CorrectiveActionPlan.institution_id == institution_id,
        CorrectiveActionPlan.status.in_(["PROPOSED", "ASSIGNED", "IN_PROGRESS", "EVIDENCE_SUBMITTED", "UNDER_REVIEW", "REOPENED", "OVERDUE"])
    ).scalar() or 0

    now = datetime.utcnow()
    overdue_caps = db.query(func.count(CorrectiveActionPlan.id)).filter(
        CorrectiveActionPlan.institution_id == institution_id,
        CorrectiveActionPlan.prescribed_deadline < now,
        CorrectiveActionPlan.status.in_(["PROPOSED", "ASSIGNED", "IN_PROGRESS", "OVERDUE", "REOPENED"])
    ).scalar() or 0

    active_risk_indicators = db.query(func.count(InstitutionalRiskIndicator.id)).filter(
        InstitutionalRiskIndicator.institution_id == institution_id,
        InstitutionalRiskIndicator.status == "ACTIVE"
    ).scalar() or 0

    breakdown = {
        "formula": "(Verified Weighted Score / Verified Applicable Weight) * 100",
        "verified_weighted_score": round(verified_score_total, 2),
        "verified_applicable_weight": round(verified_weight_total, 2),
        "weighted_score_sum": round(verified_score_total, 2),
        "total_possible_weight": round(verified_weight_total, 2),
        "calculation_items": calculation_items,
        "coverage_formula": "(Evaluated Applicable Requirements / Effective Applicable Requirements) * 100",
        "evaluated_requirements": evaluated_count,
        "assessed": evaluated_count,
        "effective_applicable_requirements": effective_applicable_count,
        "total_applicable": effective_applicable_count
    }

    # Store Snapshot
    snapshot = ComplianceScoreSnapshot(
        institution_id=institution_id,
        assessment_period=assessment_period,
        compliance_percentage=compliance_pct,
        assessment_coverage_pct=coverage_pct,
        total_applicable_requirements=effective_applicable_count,
        verified_compliant_count=compliant_count,
        partially_compliant_count=partially_compliant_count,
        non_compliant_count=non_compliant_count,
        unassessed_count=not_assessed_count,
        pending_evidence_count=pending_evidence_count,
        risk_tier=risk_tier,
        calculation_version="v1.0.0",
        formula_breakdown=breakdown,
        calculated_at=now
    )
    db.add(snapshot)
    db.commit()

    return {
        "institution_id": inst.id,
        "institution_name": inst.official_name,
        "permanent_id": inst.permanent_id,
        "region": inst.region,
        "state": inst.state,
        "assessment_period": assessment_period,
        "compliance_percentage": compliance_pct,
        "assessment_coverage_pct": coverage_pct,
        "is_provisional": is_provisional,
        "risk_tier": risk_tier,
        "total_applicable_requirements": effective_applicable_count,
        "verified_compliant_count": compliant_count,
        "partially_compliant_count": partially_compliant_count,
        "non_compliant_count": non_compliant_count,
        "unassessed_count": not_assessed_count,
        "pending_evidence_count": pending_evidence_count,
        "not_applicable_count": not_applicable_count,
        "active_cap_count": active_caps,
        "overdue_cap_count": overdue_caps,
        "active_risk_indicator_count": active_risk_indicators,
        "calculated_at": now.isoformat(),
        "formula_breakdown": breakdown
    }

