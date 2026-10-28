import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Case, Bureau, Institution, OverlapAlert, ActionConflictAlert, CoordinationWorkspace, User
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/reports", tags=["Reports & Management Analytics"])

@router.get("/bureau-summary")
def get_bureau_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    bureaus = db.query(Bureau).all()
    results = []
    
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
        overdue = db.query(func.count(Case.id)).filter(
            Case.current_bureau_id == b.id,
            Case.prescribed_deadline < now,
            Case.status.in_(["Pending", "Under Process", "Escalated"])
        ).scalar() or 0
        
        # Period-based disposal ratio
        disposal_ratio = round((disposed / total * 100.0), 1) if total > 0 else 0.0
        
        # Ageing calculation
        cases = db.query(Case).filter(Case.current_bureau_id == b.id).all()
        ages = [(now - c.date_received).days for c in cases]
        median_age = round(sum(ages) / len(ages), 1) if ages else 0.0
        
        results.append({
            "bureau_id": b.id,
            "bureau_code": b.code,
            "bureau_name": b.name,
            "total_cases": total,
            "pending_workload": pending,
            "disposed_cases": disposed,
            "overdue_cases": overdue,
            "disposal_rate_pct": disposal_ratio,
            "disposal_metric_definition": "Period-Based Ratio: (Total Disposed in Registry / Total Cases Logged) * 100",
            "average_age_days": median_age
        })
    return results

@router.get("/region-summary")
def get_region_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    regions = db.query(Institution.region).distinct().all()
    results = []
    
    for (r_name,) in regions:
        if not r_name:
            continue
        inst_ids = [i[0] for i in db.query(Institution.id).filter(Institution.region == r_name).all()]
        case_count = db.query(func.count(Case.id)).filter(Case.institution_id.in_(inst_ids)).scalar() or 0
        pending = db.query(func.count(Case.id)).filter(
            Case.institution_id.in_(inst_ids),
            Case.status.in_(["Pending", "Under Process", "Escalated"])
        ).scalar() or 0
        disposed = db.query(func.count(Case.id)).filter(
            Case.institution_id.in_(inst_ids),
            Case.status == "Disposed"
        ).scalar() or 0
        overlaps = db.query(func.count(OverlapAlert.id)).filter(
            OverlapAlert.institution_id.in_(inst_ids)
        ).scalar() or 0
        
        results.append({
            "region": r_name,
            "institution_count": len(inst_ids),
            "total_cases": case_count,
            "pending_cases": pending,
            "disposed_cases": disposed,
            "overlap_alerts_count": overlaps
        })
    return results

@router.get("/export/cases-csv")
def export_cases_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    """
    Exports official complaint registry to CSV format with full metadata and SLA tracking.
    """
    cases = db.query(Case).order_by(Case.date_received.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Header
    writer.writerow([
        "Case ID",
        "Institution Name",
        "AICTE Permanent ID",
        "Region",
        "State",
        "Category",
        "Complainant Type",
        "Status",
        "Bureau",
        "Priority",
        "Date Received",
        "Prescribed Deadline",
        "Last Action",
        "Next Action",
        "Overlap Review Status",
        "Action Conflict Status"
    ])
    
    for c in cases:
        inst = c.institution
        bureau = c.current_bureau
        writer.writerow([
            c.id,
            inst.official_name if inst else "N/A",
            inst.permanent_id if inst else "N/A",
            inst.region if inst else "N/A",
            inst.state if inst else "N/A",
            c.category,
            c.complainant_type,
            c.status,
            bureau.code if bureau else "N/A",
            c.priority,
            c.date_received.strftime("%Y-%m-%d %H:%M:%S") if c.date_received else "",
            c.prescribed_deadline.strftime("%Y-%m-%d") if c.prescribed_deadline else "",
            c.last_action or "",
            c.next_action or "",
            c.overlap_review_status,
            c.action_conflict_status
        ])
        
    output.seek(0)
    filename = f"nyayaniti_cases_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
