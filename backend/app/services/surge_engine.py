from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Case, Institution, SurgeAlert
from app.config import settings

def analyze_complaint_surges(db: Session, window_days: int = 30) -> List[Dict[str, Any]]:
    """
    Statistical and Rule-based Complaint Surge Detection Engine.
    Detects unusual surges in grievances per institution and category.
    """
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)
    historical_start = now - timedelta(days=window_days * 4)  # 120 days historical
    
    # 1. Count cases in current window per institution and category
    current_counts = (
        db.query(
            Case.institution_id,
            Case.category,
            func.count(Case.id).label("current_count")
        )
        .filter(Case.date_received >= window_start)
        .group_by(Case.institution_id, Case.category)
        .all()
    )
    
    surge_reports = []
    
    for inst_id, cat, cur_count in current_counts:
        # Check historical counts in 3 prior 30-day buckets
        historical_buckets = []
        for i in range(1, 4):
            b_start = now - timedelta(days=window_days * (i + 1))
            b_end = now - timedelta(days=window_days * i)
            count = (
                db.query(func.count(Case.id))
                .filter(
                    Case.institution_id == inst_id,
                    Case.category == cat,
                    Case.date_received >= b_start,
                    Case.date_received < b_end
                )
                .scalar() or 0
            )
            historical_buckets.append(count)
            
        mean = float(sum(historical_buckets)) / len(historical_buckets)
        variance = sum((x - mean) ** 2 for x in historical_buckets) / len(historical_buckets)
        std_dev = variance ** 0.5
        
        # Calculate z-score or fallback rule
        is_surge = False
        method = "Threshold Rule"
        z_score = 0.0
        
        if std_dev > 0.4 and len(historical_buckets) >= 3:
            z_score = (cur_count - mean) / std_dev
            method = "Z-Score Statistical Baseline"
            if z_score >= settings.SURGE_Z_SCORE_THRESHOLD and cur_count >= settings.SURGE_MIN_COMPLAINT_COUNT:
                is_surge = True
        else:
            # Deterministic threshold rule
            if cur_count >= settings.SURGE_MIN_COMPLAINT_COUNT and (cur_count >= (mean * 2.0) or mean == 0):
                is_surge = True
                z_score = float(cur_count)  # illustrative
                method = "Configurable Count Threshold Rule (Limited Baseline)"
                
        if is_surge:
            # Get related case IDs
            related_cases = (
                db.query(Case.id)
                .filter(
                    Case.institution_id == inst_id,
                    Case.category == cat,
                    Case.date_received >= window_start
                )
                .all()
            )
            case_ids = [c[0] for c in related_cases]
            inst = db.query(Institution).filter(Institution.id == inst_id).first()
            
            surge_reports.append({
                "institution_id": inst_id,
                "institution_name": inst.official_name if inst else "Unknown",
                "permanent_id": inst.permanent_id if inst else "N/A",
                "category": cat,
                "current_count": cur_count,
                "historical_mean": round(mean, 2),
                "historical_std": round(std_dev, 2),
                "z_score": round(z_score, 2),
                "detection_method": method,
                "time_window_days": window_days,
                "related_case_ids": case_ids,
                "note": "Surge detection triggers administrative inquiry; it does not establish proof of wrongdoing."
            })
            
    return surge_reports
