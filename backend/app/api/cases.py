from datetime import datetime, timedelta
from typing import List, Optional
import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from app.database import get_db
from app.models.models import (
    Case, CaseEvent, User, Bureau, Institution, OverlapAlert, ActionConflictAlert, Notification
)
from app.schemas.schemas import (
    CaseResponse, CaseDetailResponse, CaseCreate, CaseUpdate, PriorityOverrideRequest
)
from app.api.auth import get_current_user, require_role
from app.services.audit_service import log_audit_event, record_case_event
from app.services.priority_engine import evaluate_case_priority
from app.services.matching_engine import compute_similarity
from app.services.conflict_engine import check_action_conflict
from app.config import settings

router = APIRouter(prefix="/cases", tags=["Case Management"])

def serialize_case(c: Case) -> dict:
    return {
        "id": c.id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.official_name if c.institution else "Unknown",
        "permanent_id": c.institution.permanent_id if c.institution else "N/A",
        "complainant_type": c.complainant_type,
        "complainant_masked": c.complainant_masked or "Redacted for Privacy",
        "category": c.category,
        "subcategory": c.subcategory,
        "description": c.description,
        "date_received": c.date_received,
        "status": c.status,
        "current_bureau_id": c.current_bureau_id,
        "bureau_code": c.current_bureau.code if c.current_bureau else "N/A",
        "assigned_officer_id": c.assigned_officer_id,
        "officer_name": c.assigned_officer.full_name if c.assigned_officer else "Unassigned",
        "priority": c.priority,
        "priority_score": c.priority_score,
        "last_action": c.last_action,
        "next_action": c.next_action,
        "last_action_date": c.last_action_date,
        "prescribed_deadline": c.prescribed_deadline,
        "expected_disposal_date": c.expected_disposal_date,
        "overlap_review_status": c.overlap_review_status,
        "action_conflict_status": c.action_conflict_status,
        "created_at": c.created_at
    }

@router.get("", response_model=List[CaseResponse])
def list_cases(
    q: Optional[str] = Query(None, description="Search by Case ID, Institution, or Category"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    bureau_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    overdue_only: Optional[bool] = False,
    sort_by: Optional[str] = "date_received",
    order: Optional[str] = "desc",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Case).join(Institution, Case.institution_id == Institution.id)
    
    if q:
        search_filter = (
            (Case.id.ilike(f"%{q}%")) |
            (Institution.official_name.ilike(f"%{q}%")) |
            (Institution.permanent_id.ilike(f"%{q}%")) |
            (Case.category.ilike(f"%{q}%")) |
            (Case.description.ilike(f"%{q}%"))
        )
        query = query.filter(search_filter)
        
    if status:
        query = query.filter(Case.status == status)
    if priority:
        query = query.filter(Case.priority == priority)
    if bureau_id:
        query = query.filter(Case.current_bureau_id == bureau_id)
    if institution_id:
        query = query.filter(Case.institution_id == institution_id)
    if overdue_only:
        now = datetime.utcnow()
        query = query.filter(
            Case.prescribed_deadline < now,
            Case.status.in_(["Pending", "Under Process", "Escalated"])
        )
        
    # Sort
    order_col = Case.date_received
    if sort_by == "prescribed_deadline":
        order_col = Case.prescribed_deadline
    elif sort_by == "priority":
        order_col = Case.priority_score
    elif sort_by == "id":
        order_col = Case.id
        
    if order == "asc":
        query = query.order_by(asc(order_col))
    else:
        query = query.order_by(desc(order_col))
        
    cases = query.offset(skip).limit(limit).all()
    return [serialize_case(c) for c in cases]

@router.get("/{id}", response_model=CaseDetailResponse)
def get_case_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")
        
    data = serialize_case(c)
    data["priority_factors"] = c.priority_factors
    data["priority_override_reason"] = c.priority_override_reason
    data["events"] = [
        {
            "id": e.id,
            "case_id": e.case_id,
            "event_type": e.event_type,
            "actor_name": e.actor_name,
            "previous_value": e.previous_value,
            "new_value": e.new_value,
            "remarks": e.remarks,
            "document_ref": e.document_ref,
            "timestamp": e.timestamp
        }
        for e in c.events
    ]
    data["documents"] = [
        {
            "id": d.id,
            "case_id": d.case_id,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "access_classification": d.access_classification,
            "uploaded_by_id": d.uploaded_by_id,
            "upload_timestamp": d.upload_timestamp
        }
        for d in c.documents
    ]
    return data

@router.post("", response_model=CaseResponse)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == case_in.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Specified Institution does not exist")
        
    bureau = db.query(Bureau).filter(Bureau.id == case_in.current_bureau_id).first()
    if not bureau:
        raise HTTPException(status_code=404, detail="Specified Bureau does not exist")
        
    # Generate official Case ID
    year = datetime.utcnow().year
    rand_seq = random.randint(1000, 9999)
    case_id = f"AICTE-{bureau.code}-{year}-{rand_seq}"
    
    # Calculate SLA Deadline
    now = datetime.utcnow()
    sla_days = 30
    if case_in.priority == "Critical":
        sla_days = settings.SLA_CRITICAL_DAYS
    elif case_in.priority == "High":
        sla_days = settings.SLA_HIGH_DAYS
    elif case_in.priority == "Low":
        sla_days = settings.SLA_LOW_DAYS
    deadline = case_in.prescribed_deadline or (now + timedelta(days=sla_days))

    # Mask complainant if student/anonymous
    masked = case_in.complainant_masked or f"CMP-IND-{random.randint(10000, 99999)}"
    
    new_case = Case(
        id=case_id,
        institution_id=case_in.institution_id,
        complainant_type=case_in.complainant_type,
        complainant_masked=masked,
        category=case_in.category,
        subcategory=case_in.subcategory,
        description=case_in.description,
        date_received=now,
        status="Pending",
        current_bureau_id=case_in.current_bureau_id,
        assigned_officer_id=case_in.assigned_officer_id,
        priority=case_in.priority or "Medium",
        priority_score=50.0,
        prescribed_deadline=deadline,
        last_action="Grievance Registered in Central AICTE Portal",
        last_action_date=now,
        next_action="Preliminary Bureau Scrutiny",
        overlap_review_status="None",
        action_conflict_status="None"
    )
    
    # Priority engine evaluation
    calculated_prio, score, factors = evaluate_case_priority(new_case)
    new_case.priority = calculated_prio
    new_case.priority_score = score
    new_case.priority_factors = factors
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Record case event
    record_case_event(
        db=db,
        case_id=new_case.id,
        event_type="CREATED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        remarks="Complaint officially registered into Central AICTE System"
    )
    
    # Scan for candidate overlaps against cases in same institution
    existing_cases = (
        db.query(Case)
        .filter(Case.institution_id == new_case.institution_id, Case.id != new_case.id)
        .all()
    )
    
    for other_c in existing_cases:
        sim_score, model_name, evidence = compute_similarity(
            new_case.description,
            other_c.description,
            new_case.category,
            other_c.category
        )
        if sim_score >= settings.OVERLAP_REVIEW_THRESHOLD:
            # Create Overlap Alert
            alert = OverlapAlert(
                case_a_id=other_c.id,
                case_b_id=new_case.id,
                institution_id=inst.id,
                similarity_score=sim_score,
                model_name=model_name,
                evidence_summary=evidence,
                review_status="New"
            )
            db.add(alert)
            new_case.overlap_review_status = "New"
            other_c.overlap_review_status = "Under Review" if other_c.overlap_review_status == "None" else other_c.overlap_review_status
            
            # Create in-app Notification
            notif = Notification(
                notification_type="OVERLAP_DETECTED",
                related_case_id=new_case.id,
                related_entity_type="OverlapAlert",
                related_entity_id=str(alert.id),
                title="Cross-Bureau Overlap Candidate Detected",
                message=f"Case {new_case.id} ({bureau.code}) exhibits {int(sim_score*100)}% semantic similarity with {other_c.id} ({other_c.current_bureau.code if other_c.current_bureau else 'RB'}).",
                severity="High",
                link_url=f"/overlaps"
            )
            db.add(notif)
            
        # Check action conflicts
        conflict = check_action_conflict(new_case, other_c)
        if conflict:
            cf_alert = ActionConflictAlert(
                case_a_id=other_c.id,
                case_b_id=new_case.id,
                institution_id=inst.id,
                conflict_type=conflict["conflict_type"],
                rule_triggered=conflict["rule_triggered"],
                severity=conflict["severity"],
                evidence=conflict["evidence"],
                status="Pending Review"
            )
            db.add(cf_alert)
            new_case.action_conflict_status = "Pending Review"
            other_c.action_conflict_status = "Pending Review"
            
    db.commit()
    db.refresh(new_case)
    return serialize_case(new_case)

@router.patch("/{id}", response_model=CaseResponse)
def update_case(
    id: str,
    update_data: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")
        
    changes = []
    
    if update_data.status and update_data.status != c.status:
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=c.status,
            new_value=update_data.status,
            remarks=update_data.remarks or f"Status transitioned to {update_data.status}"
        )
        c.status = update_data.status
        changes.append(f"Status changed to {update_data.status}")
        
    if update_data.assigned_officer_id and update_data.assigned_officer_id != c.assigned_officer_id:
        new_officer = db.query(User).filter(User.id == update_data.assigned_officer_id).first()
        prev_name = c.assigned_officer.full_name if c.assigned_officer else "None"
        new_name = new_officer.full_name if new_officer else "Unknown"
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="ASSIGNMENT",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_name,
            new_value=new_name,
            remarks=update_data.remarks or f"Reassigned responsibility to {new_name}"
        )
        c.assigned_officer_id = update_data.assigned_officer_id
        changes.append(f"Officer assigned to {new_name}")
        
    if update_data.current_bureau_id and update_data.current_bureau_id != c.current_bureau_id:
        new_bureau = db.query(Bureau).filter(Bureau.id == update_data.current_bureau_id).first()
        prev_bureau = c.current_bureau.code if c.current_bureau else "N/A"
        new_bureau_code = new_bureau.code if new_bureau else "N/A"
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="TRANSFERRED",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_bureau,
            new_value=new_bureau_code,
            remarks=update_data.remarks or f"Case officially transferred from {prev_bureau} to {new_bureau_code}"
        )
        c.current_bureau_id = update_data.current_bureau_id
        c.status = "Transferred"
        changes.append(f"Transferred to {new_bureau_code}")
        
    if update_data.last_action:
        c.last_action = update_data.last_action
        c.last_action_date = datetime.utcnow()
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="ACTION_TAKEN",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            new_value=update_data.last_action,
            remarks=update_data.remarks
        )
        
    if update_data.next_action:
        c.next_action = update_data.next_action
        
    if update_data.expected_disposal_date:
        c.expected_disposal_date = update_data.expected_disposal_date
        
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="CASE_UPDATE",
        entity_type="Case",
        entity_id=c.id,
        remarks="; ".join(changes) if changes else "Case fields updated"
    )
    
    return serialize_case(c)

@router.post("/{id}/override-priority", response_model=CaseResponse)
def override_case_priority(
    id: str,
    override: PriorityOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")
        
    prev_priority = c.priority
    c.priority = override.new_priority
    c.priority_override_reason = override.reason
    c.updated_at = datetime.utcnow()
    
    record_case_event(
        db=db,
        case_id=c.id,
        event_type="PRIORITY_OVERRIDE",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        previous_value=prev_priority,
        new_value=override.new_priority,
        remarks=f"Administrative Priority Override: {override.reason}"
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="PRIORITY_OVERRIDE",
        entity_type="Case",
        entity_id=c.id,
        previous_value=prev_priority,
        new_value=override.new_priority,
        remarks=override.reason
    )
    
    db.commit()
    db.refresh(c)
    return serialize_case(c)

@router.post("/{id}/escalate", response_model=CaseResponse)
def escalate_case(
    id: str,
    reason: str = Query(..., description="Justification for administrative escalation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")
        
    prev_status = c.status
    c.status = "Escalated"
    c.priority = "Critical"
    c.updated_at = datetime.utcnow()
    
    record_case_event(
        db=db,
        case_id=c.id,
        event_type="ESCALATED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        previous_value=prev_status,
        new_value="Escalated",
        remarks=f"Case officially escalated: {reason}"
    )
    
    # Broadcast notification to Bureau Head & Super Admin
    notif = Notification(
        notification_type="ESCALATION",
        related_case_id=c.id,
        related_entity_type="Case",
        related_entity_id=c.id,
        title="Immediate Escalation Notice",
        message=f"Case {c.id} ({c.institution.official_name}) has been escalated to Critical Priority. Reason: {reason}",
        severity="Critical",
        link_url=f"/cases/{c.id}"
    )
    db.add(notif)
    db.commit()
    db.refresh(c)
    return serialize_case(c)
