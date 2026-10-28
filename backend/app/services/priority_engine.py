from datetime import datetime
from typing import Dict, Any, Tuple
from app.models.models import Case

CATEGORY_WEIGHTS = {
    "ragging": 45,
    "harassment": 45,
    "mental health": 40,
    "safety": 35,
    "fraudulent degree": 35,
    "unapproved course": 30,
    "ghost faculty": 30,
    "faculty salary non-payment": 25,
    "fee overcharging": 25,
    "capitation fee": 25,
    "infrastructure deficiency": 20,
    "admission irregularity": 20,
    "document withholding": 15,
    "general administrative": 10
}

def evaluate_case_priority(case: Case) -> Tuple[str, float, Dict[str, Any]]:
    """
    Transparent, explainable multi-factor scoring engine for complaint priority.
    Returns: (priority_str, score, factors_dict)
    """
    factors = []
    base_score = 15.0  # Base institutional baseline
    
    # 1. Category Regulatory Severity
    cat_lower = (case.category or "").lower()
    cat_score = 15
    matched_rule = "Standard Regulatory Issue"
    for keyword, weight in CATEGORY_WEIGHTS.items():
        if keyword in cat_lower:
            if weight > cat_score:
                cat_score = weight
                matched_rule = f"Statutory Sensitivity: {keyword.title()}"
                
    base_score += cat_score
    factors.append({
        "factor": "Category Statutory Urgency",
        "detail": f"{case.category} ({matched_rule})",
        "points": cat_score
    })
    
    # 2. Prescribed Deadline & Ageing Factor
    now = datetime.utcnow()
    deadline = case.prescribed_deadline or now
    days_remaining = (deadline - now).total_seconds() / 86400.0
    
    deadline_points = 0
    if days_remaining < 0:
        overdue_days = int(abs(days_remaining))
        deadline_points = min(40, 25 + (overdue_days * 2))
        factors.append({
            "factor": "Prescribed SLA Breach",
            "detail": f"Overdue by {overdue_days} days past prescribed deadline",
            "points": deadline_points
        })
    elif days_remaining <= 3:
        deadline_points = 25
        factors.append({
            "factor": "Imminent SLA Deadline",
            "detail": f"Expires within {round(days_remaining, 1)} days",
            "points": deadline_points
        })
    elif days_remaining <= 7:
        deadline_points = 15
        factors.append({
            "factor": "Approaching SLA Deadline",
            "detail": f"Expires in {int(days_remaining)} days",
            "points": deadline_points
        })
    else:
        deadline_points = 5
        factors.append({
            "factor": "Active SLA Window",
            "detail": f"{int(days_remaining)} days remaining",
            "points": deadline_points
        })
    base_score += deadline_points

    # 3. Case Status / Escalation Factor
    status_points = 0
    if case.status == "Escalated":
        status_points = 25
        factors.append({
            "factor": "Administrative Escalation",
            "detail": "Case officially escalated to Bureau Head",
            "points": status_points
        })
    elif case.status == "Pending":
        status_points = 10
        factors.append({
            "factor": "Unprocessed Queue",
            "detail": "Pending initial bureau allocation and action",
            "points": status_points
        })
    base_score += status_points

    # 4. Overlap & Conflict Signals
    cross_points = 0
    if case.action_conflict_status in ["Pending Review", "Confirmed Conflict"]:
        cross_points += 15
        factors.append({
            "factor": "Inter-Bureau Action Conflict",
            "detail": f"Active conflict alert ({case.action_conflict_status}) requires reconciliation",
            "points": 15
        })
    if case.overlap_review_status in ["Coordination Required", "Confirmed Related"]:
        cross_points += 10
        factors.append({
            "factor": "Cross-Bureau Overlap",
            "detail": "Requires coordinated handling across bureaus",
            "points": 10
        })
    base_score += cross_points

    # Calculate final score (bounded 0 - 100)
    final_score = min(100.0, max(0.0, base_score))
    
    # Priority Tiers
    if final_score >= 80.0:
        priority = "Critical"
    elif final_score >= 60.0:
        priority = "High"
    elif final_score >= 35.0:
        priority = "Medium"
    else:
        priority = "Low"
        
    factors_summary = {
        "final_score": round(final_score, 1),
        "evaluated_at": now.isoformat(),
        "days_to_deadline": round(days_remaining, 1),
        "factor_breakdown": factors
    }
    
    return priority, final_score, factors_summary
