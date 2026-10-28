from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.models import (
    Case, Bureau, Institution, OverlapAlert, ActionConflictAlert,
    CoordinationWorkspace, CaseEvent, Notification, User
)
from app.schemas.schemas import DashboardKpis, AlertTickerItem
from app.api.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/dashboard", tags=["Unified Dashboard & Analytics"])

@router.get("/kpis", response_model=DashboardKpis)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    now = datetime.utcnow()
    total = db.query(func.count(Case.id)).scalar() or 0
    pending = db.query(func.count(Case.id)).filter(Case.status == "Pending").scalar() or 0
    under_process = db.query(func.count(Case.id)).filter(Case.status == "Under Process").scalar() or 0
    disposed = db.query(func.count(Case.id)).filter(Case.status == "Disposed").scalar() or 0
    transferred = db.query(func.count(Case.id)).filter(Case.status == "Transferred").scalar() or 0
    
    overdue = db.query(func.count(Case.id)).filter(
        Case.prescribed_deadline < now,
        Case.status.in_(["Pending", "Under Process", "Escalated"])
    ).scalar() or 0
    
    overlaps_awaiting = db.query(func.count(OverlapAlert.id)).filter(
        OverlapAlert.review_status.in_(["New", "Under Review"])
    ).scalar() or 0
    
    conflicts_awaiting = db.query(func.count(ActionConflictAlert.id)).filter(
        ActionConflictAlert.status.in_(["Pending Review", "Clarification Requested"])
    ).scalar() or 0
    
    return {
        "total_complaints": total,
        "pending": pending,
        "under_process": under_process,
        "disposed": disposed,
        "transferred": transferred,
        "overdue": overdue,
        "potential_overlaps_awaiting_review": overlaps_awaiting,
        "action_conflicts_awaiting_review": conflicts_awaiting
    }

@router.get("/ticker", response_model=List[AlertTickerItem])
def get_alert_ticker(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    now = datetime.utcnow()
    items = []
    
    # 1. Critical and Escalated cases
    critical_cases = db.query(Case).filter(
        (Case.priority == "Critical") | (Case.status == "Escalated"),
        Case.status.in_(["Pending", "Under Process", "Escalated"])
    ).limit(4).all()
    
    for c in critical_cases:
        items.append({
            "id": f"crit-{c.id}",
            "category": "CRITICAL ESCALATION" if c.status == "Escalated" else "CRITICAL PRIORITY",
            "related_id": c.id,
            "short_message": f"[{c.current_bureau.code if c.current_bureau else 'RB'}] {c.institution.official_name}: {c.category}",
            "severity": "Critical",
            "created_at": c.created_at,
            "link_url": f"/cases/{c.id}"
        })
        
    # 2. Overdue cases
    overdue_cases = db.query(Case).filter(
        Case.prescribed_deadline < now,
        Case.status.in_(["Pending", "Under Process", "Escalated"])
    ).order_by(Case.prescribed_deadline.asc()).limit(3).all()
    
    for c in overdue_cases:
        days_past = (now - c.prescribed_deadline).days
        items.append({
            "id": f"od-{c.id}",
            "category": "OVERDUE BREACH",
            "related_id": c.id,
            "short_message": f"Case {c.id} overdue by {days_past} days past prescribed regulatory SLA.",
            "severity": "High",
            "created_at": c.prescribed_deadline,
            "link_url": f"/cases/{c.id}"
        })
        
    # 3. Approaching Deadlines (within 4 days)
    imminent = db.query(Case).filter(
        Case.prescribed_deadline >= now,
        Case.prescribed_deadline <= (now + timedelta(days=4)),
        Case.status.in_(["Pending", "Under Process"])
    ).limit(3).all()
    
    for c in imminent:
        days_left = max(1, (c.prescribed_deadline - now).days)
        items.append({
            "id": f"imm-{c.id}",
            "category": "APPROACHING DEADLINE",
            "related_id": c.id,
            "short_message": f"Case {c.id} deadline expires in {days_left} day(s). Action required.",
            "severity": "Medium",
            "created_at": now,
            "link_url": f"/cases/{c.id}"
        })
        
    # 4. Overlap Alerts Awaiting Review
    overlaps = db.query(OverlapAlert).filter(
        OverlapAlert.review_status == "New"
    ).limit(3).all()
    
    for o in overlaps:
        inst_name = o.institution.official_name if o.institution else "Institution"
        items.append({
            "id": f"ovl-{o.id}",
            "category": "CROSS-BUREAU OVERLAP",
            "related_id": f"{o.case_a_id} ↔ {o.case_b_id}",
            "short_message": f"Overlap detected for {inst_name} ({int(o.similarity_score * 100)}% match).",
            "severity": "High",
            "created_at": o.created_at,
            "link_url": f"/overlaps"
        })
        
    # 5. Action Conflict Alerts
    conflicts = db.query(ActionConflictAlert).filter(
        ActionConflictAlert.status == "Pending Review"
    ).limit(3).all()
    
    for cf in conflicts:
        items.append({
            "id": f"cnf-{cf.id}",
            "category": "ACTION CONFLICT",
            "related_id": f"{cf.case_a_id} ↔ {cf.case_b_id}",
            "short_message": f"{cf.conflict_type}: {cf.rule_triggered}",
            "severity": cf.severity,
            "created_at": cf.created_at,
            "link_url": f"/action-conflicts"
        })
        
    return items

@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    now = datetime.utcnow()
    
    # 1. Bureau-wise case workload
    bureaus = db.query(Bureau).all()
    bureau_workload = []
    for b in bureaus:
        total = db.query(func.count(Case.id)).filter(Case.current_bureau_id == b.id).scalar() or 0
        pending = db.query(func.count(Case.id)).filter(
            Case.current_bureau_id == b.id,
            Case.status.in_(["Pending", "Under Process", "Escalated"])
        ).scalar() or 0
        disposed = db.query(func.count(Case.id)).filter(
            Case.current_bureau_id == b.id,
            Case.status == "Disposed"
        ).scalar() or 0
        bureau_workload.append({
            "bureau": b.code,
            "name": b.name,
            "total": total,
            "active": pending,
            "disposed": disposed
        })
        
    # 2. Complaint status distribution
    statuses = ["Pending", "Under Process", "Disposed", "Transferred", "Escalated"]
    status_distribution = []
    for s in statuses:
        count = db.query(func.count(Case.id)).filter(Case.status == s).scalar() or 0
        status_distribution.append({"status": s, "count": count})
        
    # 3. Priority distribution
    priorities = ["Critical", "High", "Medium", "Low"]
    priority_distribution = []
    for p in priorities:
        count = db.query(func.count(Case.id)).filter(Case.priority == p).scalar() or 0
        priority_distribution.append({"priority": p, "count": count})
        
    # 4. Overlap alerts by review status
    overlap_review_counts = (
        db.query(OverlapAlert.review_status, func.count(OverlapAlert.id))
        .group_by(OverlapAlert.review_status)
        .all()
    )
    overlap_status_data = [{"status": r[0], "count": r[1]} for r in overlap_review_counts]
    
    # 5. Case Ageing distribution (< 15 days, 15-30 days, 31-60 days, > 60 days)
    age_groups = {"< 15 Days": 0, "15 - 30 Days": 0, "31 - 60 Days": 0, "> 60 Days": 0}
    active_cases = db.query(Case).filter(Case.status.in_(["Pending", "Under Process", "Escalated"])).all()
    for c in active_cases:
        age_days = (now - c.date_received).days
        if age_days < 15:
            age_groups["< 15 Days"] += 1
        elif age_days <= 30:
            age_groups["15 - 30 Days"] += 1
        elif age_days <= 60:
            age_groups["31 - 60 Days"] += 1
        else:
            age_groups["> 60 Days"] += 1
            
    ageing_data = [{"bracket": k, "cases": v} for k, v in age_groups.items()]
    
    # 6. Monthly complaint trend (past 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_dt = now - timedelta(days=i * 30)
        m_name = month_dt.strftime("%b %Y")
        start = month_dt.replace(day=1, hour=0, minute=0, second=0)
        # Approximate end
        end = start + timedelta(days=30)
        received_count = db.query(func.count(Case.id)).filter(
            Case.date_received >= start, Case.date_received < end
        ).scalar() or 0
        disposed_count = db.query(func.count(Case.id)).filter(
            Case.status == "Disposed",
            Case.updated_at >= start, Case.updated_at < end
        ).scalar() or 0
        monthly_trend.append({
            "month": m_name,
            "received": received_count,
            "disposed": disposed_count
        })
        
    # 7. Coordination Outcomes
    coord_counts = (
        db.query(CoordinationWorkspace.status, func.count(CoordinationWorkspace.id))
        .group_by(CoordinationWorkspace.status)
        .all()
    )
    coordination_data = [{"status": r[0], "count": r[1]} for r in coord_counts]
    if not coordination_data:
        coordination_data = [{"status": "In Coordination", "count": 2}, {"status": "Completed", "count": 1}]
        
    # 8. Category Distribution
    cat_counts = (
        db.query(Case.category, func.count(Case.id))
        .group_by(Case.category)
        .order_by(func.count(Case.id).desc())
        .limit(6)
        .all()
    )
    category_data = [{"category": r[0], "count": r[1]} for r in cat_counts]
    
    return {
        "bureau_workload": bureau_workload,
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
        "overlap_status": overlap_status_data,
        "case_ageing": ageing_data,
        "monthly_trend": monthly_trend,
        "coordination_outcomes": coordination_data,
        "category_distribution": category_data
    }

@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    events = (
        db.query(CaseEvent)
        .order_by(CaseEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    results = []
    for e in events:
        c = db.query(Case).filter(Case.id == e.case_id).first()
        inst_name = c.institution.official_name if c and c.institution else "Institution"
        results.append({
            "id": e.id,
            "case_id": e.case_id,
            "institution_name": inst_name,
            "event_type": e.event_type,
            "actor_name": e.actor_name,
            "new_value": e.new_value,
            "remarks": e.remarks,
            "timestamp": e.timestamp
        })
    return results

@router.get("/upcoming-deadlines")
def get_upcoming_deadlines(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    now = datetime.utcnow()
    cases = (
        db.query(Case)
        .filter(Case.status.in_(["Pending", "Under Process", "Escalated"]))
        .order_by(Case.prescribed_deadline.asc())
        .limit(8)
        .all()
    )
    results = []
    for c in cases:
        days_rem = (c.prescribed_deadline - now).total_seconds() / 86400.0
        results.append({
            "id": c.id,
            "institution_name": c.institution.official_name if c.institution else "Unknown",
            "bureau_code": c.current_bureau.code if c.current_bureau else "N/A",
            "category": c.category,
            "priority": c.priority,
            "prescribed_deadline": c.prescribed_deadline,
            "days_remaining": round(days_rem, 1),
            "is_overdue": days_rem < 0
        })
    return results
