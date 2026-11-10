from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Institution, ComplianceAssessment, CorrectiveActionPlan,
    Case, ActionConflictAlert, InstitutionalRiskIndicator, User
)
from app.services.surge_engine import analyze_complaint_surges
from app.services.audit_service import log_audit_event

def evaluate_institution_risk_indicators(
    db: Session,
    institution_id: int
) -> List[Dict[str, Any]]:
    """
    Synthesizes multi-dimensional, explainable institutional risk indicators.
    Advisory Only: Early-warning signals for administrative prioritization.
    Never automatically imposes regulatory penalties or adverse legal findings.
    """
    now = datetime.utcnow()
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise ValueError(f"Institution #{institution_id} not found.")

    indicators = []

    # 1. Chronic Non-Compliance Gaps (>= 2 NON_COMPLIANT assessments)
    non_compliant_assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.institution_id == institution_id,
        ComplianceAssessment.status == "NON_COMPLIANT"
    ).all()

    if len(non_compliant_assessments) >= 2:
        req_ids = [a.requirement_id for a in non_compliant_assessments]
        indicators.append({
            "indicator_type": "IND-GAP-CHRONIC",
            "severity": "CRITICAL" if len(non_compliant_assessments) >= 3 else "HIGH",
            "title": f"Chronic Statutory Non-Compliance ({len(non_compliant_assessments)} Standards Failed)",
            "supporting_evidence": {
                "failed_standards_count": len(non_compliant_assessments),
                "requirement_ids": req_ids,
                "assessment_ids": [a.id for a in non_compliant_assessments]
            },
            "observation_period": "Current Academic Assessment Cycle",
            "calculation_method": "Count of official NON_COMPLIANT review determinations >= 2",
            "data_completeness": 1.0,
            "recommended_review": "Convene joint Bureau review hearing and mandate immediate Corrective Action Plan."
        })

    # 2. Overdue Corrective Action Plans
    overdue_caps = db.query(CorrectiveActionPlan).filter(
        CorrectiveActionPlan.institution_id == institution_id,
        CorrectiveActionPlan.status.in_(["OVERDUE", "PROPOSED", "ASSIGNED", "IN_PROGRESS", "REOPENED"]),
        CorrectiveActionPlan.prescribed_deadline < now
    ).all()

    if len(overdue_caps) > 0:
        max_overdue_days = max([(now - cap.prescribed_deadline).days for cap in overdue_caps])
        severity = "CRITICAL" if max_overdue_days > 15 or len(overdue_caps) >= 2 else "HIGH"
        indicators.append({
            "indicator_type": "IND-CAP-OVERDUE",
            "severity": severity,
            "title": f"Overdue Corrective Action Directives ({len(overdue_caps)} Delinquent)",
            "supporting_evidence": {
                "overdue_count": len(overdue_caps),
                "cap_ids": [c.id for c in overdue_caps],
                "max_delay_days": max_overdue_days
            },
            "observation_period": "All Active Directives",
            "calculation_method": f"Active CAPs with deadline prior to current UTC timestamp (max breach {max_overdue_days} days)",
            "data_completeness": 1.0,
            "recommended_review": "Issue regulatory show-cause inquiry for failure to remediate statutory gaps."
        })

    # 3. Grievance SLA Underperformance (Adherence < 60% over 90 days)
    ninety_days_ago = now - timedelta(days=90)
    disposed_cases = db.query(Case).filter(
        Case.institution_id == institution_id,
        Case.status.in_(["Disposed", "Resolved", "Closed"]),
        Case.updated_at >= ninety_days_ago
    ).all()

    if len(disposed_cases) >= 3:
        adherent = [c for c in disposed_cases if c.updated_at and c.prescribed_deadline and c.updated_at <= c.prescribed_deadline]
        adherence_pct = (len(adherent) / len(disposed_cases)) * 100.0
        if adherence_pct < 60.0:
            indicators.append({
                "indicator_type": "IND-SLA-FAIL",
                "severity": "HIGH" if adherence_pct < 40.0 else "MODERATE",
                "title": f"Substandard Grievance SLA Adherence ({round(adherence_pct, 1)}%)",
                "supporting_evidence": {
                    "total_disposed_90d": len(disposed_cases),
                    "on_time_disposals": len(adherent),
                    "adherence_pct": round(adherence_pct, 1)
                },
                "observation_period": "Rolling 90 Days",
                "calculation_method": "(Disposed within Prescribed Deadline / Total Disposed Cases) * 100",
                "data_completeness": 0.95,
                "recommended_review": "Request institutional ombudsman workload audit and internal grievance mechanism review."
            })

    # 4. Active Complaint Surge Signals (Z >= 2.0)
    surges = analyze_complaint_surges(db=db, window_days=30)
    inst_surges = [s for s in surges if s["institution_id"] == institution_id and s["z_score"] >= 2.0]

    for s in inst_surges:
        indicators.append({
            "indicator_type": "IND-SURGE-SPIKE",
            "severity": "CRITICAL" if s["z_score"] >= 3.0 else "HIGH",
            "title": f"Abnormal Complaint Surge: {s['category']} (z = {s['z_score']})",
            "supporting_evidence": {
                "category": s["category"],
                "current_count": s["current_count"],
                "historical_mean": s["historical_mean"],
                "z_score": s["z_score"],
                "related_case_ids": s["related_case_ids"]
            },
            "observation_period": "Rolling 30 Days",
            "calculation_method": s["detection_method"],
            "data_completeness": 1.0,
            "recommended_review": "Deploy rapid inter-bureau inquiry team to assess systemic operational irregularities."
        })

    # 5. Stale Inter-Bureau Action Conflicts (> 72 hours)
    seventy_two_hours_ago = now - timedelta(hours=72)
    stale_conflicts = db.query(ActionConflictAlert).filter(
        ActionConflictAlert.institution_id == institution_id,
        ActionConflictAlert.status == "Pending Review",
        ActionConflictAlert.created_at <= seventy_two_hours_ago
    ).all()

    if len(stale_conflicts) > 0:
        indicators.append({
            "indicator_type": "IND-CONFLICT-STALE",
            "severity": "HIGH",
            "title": f"Unresolved Inter-Bureau Directives ({len(stale_conflicts)} Conflicting Actions)",
            "supporting_evidence": {
                "conflict_ids": [cf.id for cf in stale_conflicts],
                "conflict_types": [cf.conflict_type for cf in stale_conflicts],
                "pending_hours": int((now - stale_conflicts[0].created_at).total_seconds() / 3600)
            },
            "observation_period": "Open Proceedings",
            "calculation_method": "Active ActionConflictAlerts in 'Pending Review' > 72 hours",
            "data_completeness": 1.0,
            "recommended_review": "Refer to Member Secretary for executive reconciliation of contradictory bureau orders."
        })

    # 6. Sensitive Grievance Category Hotspots (>= 5 complaints in sensitive areas)
    sensitive_categories = ["Harassment and Discrimination", "Fees and Financial Issues", "Faculty and Staff Related Issues"]
    hotspot_counts = (
        db.query(Case.category, func.count(Case.id))
        .filter(
            Case.institution_id == institution_id,
            Case.category.in_(sensitive_categories)
        )
        .group_by(Case.category)
        .all()
    )

    for cat_name, cnt in hotspot_counts:
        if cnt >= 5:
            indicators.append({
                "indicator_type": "IND-CAT-HOTSPOT",
                "severity": "CRITICAL" if "Harassment" in cat_name else "HIGH",
                "title": f"Recurring Category Hotspot: {cat_name} ({cnt} Cases Logged)",
                "supporting_evidence": {
                    "category": cat_name,
                    "case_count": cnt
                },
                "observation_period": "Historical Cumulative Registry",
                "calculation_method": f"Total grievances logged in sensitive domain '{cat_name}' >= 5",
                "data_completeness": 1.0,
                "recommended_review": "Direct immediate regional director inspection on statutory norms."
            })

    # Persist and synchronize indicators in database
    db.query(InstitutionalRiskIndicator).filter(
        InstitutionalRiskIndicator.institution_id == institution_id,
        InstitutionalRiskIndicator.status == "ACTIVE"
    ).delete(synchronize_session=False)

    persisted = []
    for ind in indicators:
        rec = InstitutionalRiskIndicator(
            institution_id=institution_id,
            indicator_type=ind["indicator_type"],
            severity=ind["severity"],
            title=ind["title"],
            supporting_evidence=ind["supporting_evidence"],
            observation_period=ind["observation_period"],
            calculation_method=ind["calculation_method"],
            data_completeness=ind["data_completeness"],
            recommended_review=ind["recommended_review"],
            status="ACTIVE",
            detected_at=now
        )
        db.add(rec)
        persisted.append(ind)

    db.commit()
    return persisted

