from datetime import datetime, timedelta
from typing import List, Optional
import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from app.database import get_db
from app.models.models import (
    Case, CaseEvent, User, Bureau, Institution, OverlapAlert, ActionConflictAlert, Notification,
    CaseAssignment, Complainant, CaseRelationship, CaseCoordinationLink, CoordinationWorkspace
)
from app.schemas.schemas import (
    CaseResponse, CaseDetailResponse, CaseCreate, CaseUpdate, PriorityOverrideRequest,
    CaseInternalNoteRequest, CaseAssignmentRequest, CaseAssignmentResponse, UserResponse,
    CaseRelationshipResponse, CaseLinkRequest
)
from app.api.auth import get_current_user, require_role
from app.services.audit_service import log_audit_event, record_case_event
from app.services.priority_engine import evaluate_case_priority
from app.services.matching_engine import compute_similarity
from app.services.conflict_engine import check_action_conflict
from app.config import settings

router = APIRouter(prefix="/cases", tags=["Case Management"])

# Approved statutory status transitions matrix
PERMITTED_STATUS_TRANSITIONS = {
    # Approved complaint lifecycle
    "Draft": {"Submitted"},
    "Submitted": {"Under Review", "Rejected", "Under Process"},
    "Under Review": {"In Progress", "Additional Information Required", "Rejected", "Under Process"},
    "In Progress": {"Under Review", "Additional Information Required", "Resolved", "Closed", "Disposed"},
    "Additional Information Required": {"Under Review", "In Progress", "Closed", "Rejected"},
    "Resolved": {"Closed", "In Progress"},
    "Closed": {"Under Review", "In Progress"},
    "Rejected": {"Under Review"},
    # Legacy statuses for backwards compatibility with seeded cases:
    "Pending": {"Under Process", "Under Review", "In Progress", "Escalated", "Transferred", "Disposed", "Rejected"},
    "Under Process": {"In Progress", "Additional Information Required", "Under Review", "Resolved", "Disposed", "Escalated", "Transferred"},
    "Escalated": {"Under Process", "Under Review", "In Progress", "Resolved", "Disposed"},
    "Transferred": {"Under Process", "Under Review", "In Progress"},
    "Disposed": {"Under Review", "Under Process"}
}

def serialize_case(c: Case) -> dict:
    return {
        "id": c.id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.official_name if c.institution else "Unknown",
        "permanent_id": c.institution.permanent_id if c.institution else "N/A",
        "complainant_type": c.complainant_type,
        "complainant_masked": c.complainant_masked or "Redacted for Privacy",
        "title": getattr(c, "title", None) or c.category,
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
        "created_at": c.created_at,
        "complainant_id": c.complainant_id,
        "is_citizen_complaint": c.complainant_id is not None
    }

@router.get("", response_model=List[CaseResponse])
def list_cases(
    q: Optional[str] = Query(None, description="Search by Case ID, Institution, or Category"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    bureau_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    citizen_only: Optional[bool] = False,
    unassigned_only: Optional[bool] = False,
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
    if citizen_only:
        query = query.filter(Case.complainant_id != None)
    if unassigned_only:
        query = query.filter(Case.assigned_officer_id == None)
    if overdue_only:
        now = datetime.utcnow()
        query = query.filter(
            Case.prescribed_deadline < now,
            Case.status.in_(["Pending", "Under Process", "Escalated", "Submitted", "Under Review", "In Progress", "Additional Information Required"])
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

@router.get("/officers/available", response_model=List[UserResponse])
def get_available_officers(
    bureau_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List active officers available for grievance assignment.
    """
    query = db.query(User).filter(User.is_active == True)
    if bureau_id:
        query = query.filter(User.bureau_id == bureau_id)
    return query.order_by(User.full_name.asc()).all()

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
            "original_filename": d.original_filename or d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "access_classification": d.access_classification,
            "uploaded_by_id": d.uploaded_by_id,
            "uploaded_by_complainant_id": d.uploaded_by_complainant_id,
            "uploader_role": d.uploader_role,
            "download_url": f"/api/documents/{d.id}/download",
            "upload_timestamp": d.upload_timestamp
        }
        for d in c.documents
    ]
    
    # Assignments history
    data["assignments"] = [
        {
            "id": a.id,
            "case_id": a.case_id,
            "from_officer_id": a.from_officer_id,
            "from_officer_name": a.from_officer.full_name if a.from_officer else None,
            "to_officer_id": a.to_officer_id,
            "to_officer_name": a.to_officer.full_name if a.to_officer else "Assigned Officer",
            "assigned_by_id": a.assigned_by_id,
            "assigned_by_name": a.assigned_by.full_name if a.assigned_by else "Admin",
            "bureau_id": a.bureau_id,
            "bureau_code": a.bureau.code if a.bureau else "PGRC",
            "remarks": a.remarks,
            "assigned_at": a.assigned_at
        }
        for a in (c.assignments or [])
    ]
    
    # Complainant profile for authenticated officers
    if c.complainant_id:
        comp = db.query(Complainant).filter(Complainant.id == c.complainant_id).first()
        if comp:
            data["complainant_details"] = {
                "id": comp.id,
                "full_name": comp.full_name,
                "email": comp.email,
                "mobile": comp.mobile,
                "complainant_type": comp.complainant_type,
                "is_email_verified": comp.is_email_verified,
                "is_mobile_verified": comp.is_mobile_verified,
                "created_at": comp.created_at
            }
        else:
            data["complainant_details"] = None
    else:
        data["complainant_details"] = None

    # Linked & Consolidated matters
    relationships = db.query(CaseRelationship).filter(
        (CaseRelationship.case_a_id == c.id) | (CaseRelationship.case_b_id == c.id)
    ).all()
    
    linked_list = []
    for rel in relationships:
        other_case_id = rel.case_b_id if rel.case_a_id == c.id else rel.case_a_id
        other_case = db.query(Case).filter(Case.id == other_case_id).first()
        linked_list.append({
            "id": rel.id,
            "case_a_id": rel.case_a_id,
            "case_b_id": rel.case_b_id,
            "related_case_id": other_case_id,
            "relationship_type": rel.relationship_type,
            "status": rel.status,
            "similarity_score": rel.similarity_score,
            "title": (getattr(other_case, "title", None) or other_case.category) if other_case else "N/A",
            "institution_name": other_case.institution.official_name if (other_case and other_case.institution) else "Unknown",
            "case_status": other_case.status if other_case else "Unknown",
            "remarks": rel.review_remarks,
            "created_at": rel.created_at
        })
    data["linked_cases"] = linked_list

    # Coordination Workspaces (Phase 7)
    links = db.query(CaseCoordinationLink).filter(CaseCoordinationLink.case_id == c.id).all()
    coord_workspaces = []
    for l in links:
        ws = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == l.workspace_id).first()
        if ws:
            coord_workspaces.append({
                "workspace_id": ws.id,
                "title": ws.title,
                "status": ws.status,
                "primary_bureau_code": ws.primary_bureau.code if ws.primary_bureau else "N/A",
                "linked_at": ws.created_at.isoformat() if getattr(ws, "created_at", None) else None
            })
    data["coordination_workspaces"] = coord_workspaces

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
        # Validate against permitted statutory transitions
        allowed = PERMITTED_STATUS_TRANSITIONS.get(c.status, None)
        if allowed is not None and update_data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{c.status}' to '{update_data.status}'. Permitted next statuses: {sorted(list(allowed)) if allowed else 'None (Terminal state)'}."
            )

        prev_status = c.status
        c.status = update_data.status
        changes.append(f"Status changed to {update_data.status}")

        # Record public case event for status progression
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value=update_data.status,
            remarks=update_data.remarks or f"Status transitioned to {update_data.status}",
            is_public=True
        )

        # Citizen Notification for Complainant
        if c.complainant_id:
            notif_title = f"Complaint Status Updated: {update_data.status}"
            notif_message = f"Your complaint {c.id} status has been updated to '{update_data.status}'."
            notif_type = "STATUS_UPDATE"
            notif_severity = "Info"

            if update_data.status == "Additional Information Required":
                notif_title = "Action Required: Additional Information Requested"
                notif_message = f"AICTE PGRC has requested additional details or evidence for complaint {c.id}. Remarks: {update_data.remarks or 'Please review remarks and submit clarification.'}"
                notif_type = "INFO_REQUESTED"
                notif_severity = "High"
            elif update_data.status == "Under Review":
                notif_title = "Complaint Under Review"
                notif_message = f"Your complaint {c.id} has been taken up for official review by AICTE PGRC."
            elif update_data.status == "In Progress":
                notif_title = "Inquiry In Progress"
                notif_message = f"Your complaint {c.id} is now under active processing by designated officers."
            elif update_data.status == "Resolved":
                notif_title = "Complaint Resolved"
                notif_message = f"Your complaint {c.id} has been resolved by AICTE PGRC. Remarks: {update_data.remarks or 'Complaint resolution completed.'}"
            elif update_data.status == "Closed":
                notif_title = "Complaint Closed"
                notif_message = f"Your complaint {c.id} has been formally closed."
            elif update_data.status == "Rejected":
                notif_title = "Complaint Decision: Rejected"
                notif_message = f"Your complaint {c.id} was rejected after review. Reason: {update_data.remarks or 'Does not fall within statutory grievance purview.'}"
                notif_severity = "High"

            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type=notif_type,
                related_case_id=c.id,
                related_entity_type="Case",
                related_entity_id=c.id,
                title=notif_title,
                message=notif_message,
                severity=notif_severity,
                is_read=False,
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)
        
    if update_data.assigned_officer_id and update_data.assigned_officer_id != c.assigned_officer_id:
        new_officer = db.query(User).filter(User.id == update_data.assigned_officer_id).first()
        prev_name = c.assigned_officer.full_name if c.assigned_officer else "None"
        new_name = new_officer.full_name if new_officer else "Unknown"
        
        # Operationalize CaseAssignment record
        if new_officer:
            assignment_entry = CaseAssignment(
                case_id=c.id,
                from_officer_id=c.assigned_officer_id,
                to_officer_id=new_officer.id,
                assigned_by_id=current_user.id,
                bureau_id=new_officer.bureau_id or c.current_bureau_id,
                remarks=update_data.remarks or f"Reassigned responsibility to {new_name}",
                assigned_at=datetime.utcnow()
            )
            db.add(assignment_entry)
            
            # Send notification to newly assigned officer
            assigned_notif = Notification(
                recipient_id=new_officer.id,
                complainant_id=None,
                notification_type="CASE_ASSIGNED",
                related_case_id=c.id,
                related_entity_type="Case",
                related_entity_id=c.id,
                title="Case Allocated to You",
                message=f"Case {c.id} ({c.category}) has been assigned to you by {current_user.full_name}.",
                severity="High",
                is_read=False,
                link_url=f"/cases/{c.id}"
            )
            db.add(assigned_notif)

        record_case_event(
            db=db,
            case_id=c.id,
            event_type="ASSIGNMENT",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_name,
            new_value=new_name,
            remarks=update_data.remarks or f"Reassigned responsibility to {new_name}",
            is_public=False
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
            remarks=update_data.remarks or f"Case officially transferred from {prev_bureau} to {new_bureau_code}",
            is_public=True
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
            remarks=update_data.remarks,
            is_public=True
        )
        
    if update_data.next_action:
        c.next_action = update_data.next_action
        
    if update_data.expected_disposal_date:
        c.expected_disposal_date = update_data.expected_disposal_date
        
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    
    # Dynamic Phase 7 Trigger: Evaluate Action Conflicts on action or status mutation
    if update_data.last_action or update_data.status:
        try:
            from app.services.conflict_engine import detect_action_conflicts_for_case
            detect_action_conflicts_for_case(db, c.id)
        except Exception as e:
            print(f"Dynamic conflict check note: {e}")

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

@router.post("/{id}/notes")
def add_case_note(
    id: str,
    note: CaseInternalNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record an officer note or observation.
    Confidential internal deliberations remain strictly protected with is_public=False.
    """
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")

    event_type = "PUBLIC_NOTE" if note.is_public else "INTERNAL_NOTE"
    record_case_event(
        db=db,
        case_id=c.id,
        event_type=event_type,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        remarks=note.remarks,
        is_public=note.is_public
    )

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type=event_type,
        entity_type="Case",
        entity_id=c.id,
        remarks=note.remarks[:200]
    )

    return {
        "message": f"{'Public milestone note' if note.is_public else 'Confidential internal note'} recorded successfully.",
        "case_id": c.id,
        "is_public": note.is_public
    }

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

@router.post("/{id}/assign", response_model=CaseResponse)
def assign_case_to_officer(
    id: str,
    assign_req: CaseAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated officer intake triage and case assignment endpoint.
    Creates an immutable CaseAssignment record, logs an assignment CaseEvent,
    updates assigned officer, advances 'Submitted' status to 'Under Review',
    and dispatches a notification to the assigned officer.
    """
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")

    target_officer = db.query(User).filter(
        User.id == assign_req.to_officer_id,
        User.is_active == True
    ).first()
    if not target_officer:
        raise HTTPException(status_code=404, detail="Selected officer not found or account deactivated")

    # Permission check: super_admin, bureau_head, or authorized_officer
    if current_user.role not in ["super_admin", "bureau_head", "authorized_officer"]:
        raise HTTPException(status_code=403, detail="Unauthorized to assign cases")

    prev_officer_id = c.assigned_officer_id
    prev_name = c.assigned_officer.full_name if c.assigned_officer else "Unassigned (Intake Queue)"
    new_name = target_officer.full_name

    # Create CaseAssignment record
    assignment_entry = CaseAssignment(
        case_id=c.id,
        from_officer_id=prev_officer_id,
        to_officer_id=target_officer.id,
        assigned_by_id=current_user.id,
        bureau_id=target_officer.bureau_id or c.current_bureau_id,
        remarks=assign_req.remarks or f"Assigned to {new_name} by {current_user.full_name}",
        assigned_at=datetime.utcnow()
    )
    db.add(assignment_entry)

    # Update Case
    c.assigned_officer_id = target_officer.id
    status_changed = False
    prev_status = c.status

    # If case was in 'Submitted' (Intake Queue), automatically advance to 'Under Review'
    if c.status == "Submitted":
        c.status = "Under Review"
        status_changed = True

    c.updated_at = datetime.utcnow()

    # Record Timeline CaseEvent
    record_case_event(
        db=db,
        case_id=c.id,
        event_type="ASSIGNED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        previous_value=prev_name,
        new_value=new_name,
        remarks=assign_req.remarks or f"Assigned to {new_name} for official review",
        is_public=False
    )

    if status_changed:
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Under Review",
            remarks="Case officially accepted from Intake Queue for administrative review",
            is_public=True
        )
        if c.complainant_id:
            c_notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Complaint Under Review",
                message=f"Your complaint {c.id} has been accepted from intake and assigned for review.",
                severity="Info",
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(c_notif)

    # Audit logging
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="CASE_ASSIGNMENT",
        entity_type="Case",
        entity_id=c.id,
        previous_value=prev_name,
        new_value=new_name,
        remarks=assign_req.remarks or f"Case assigned to {new_name}"
    )

    # In-app notification for assigned officer
    off_notif = Notification(
        recipient_id=target_officer.id,
        complainant_id=None,
        notification_type="CASE_ASSIGNED",
        related_case_id=c.id,
        related_entity_type="Case",
        related_entity_id=c.id,
        title="New Case Allocated to You",
        message=f"Case {c.id} ({c.category} - {c.institution.official_name}) has been assigned to you for investigation.",
        severity="High",
        is_read=False,
        link_url=f"/cases/{c.id}"
    )
    db.add(off_notif)

    db.commit()
    db.refresh(c)
    return serialize_case(c)

@router.post("/{id}/link", response_model=CaseRelationshipResponse)
def link_case(
    id: str,
    link_req: CaseLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consolidate or link two grievances/cases into a shared cluster or lead dossier.
    Validates both cases exist, creates an active CaseRelationship record,
    writes audit and case events on both matters, and returns the relationship.
    """
    case_a = db.query(Case).filter(Case.id == id).first()
    if not case_a:
        raise HTTPException(status_code=404, detail="Primary case not found")
        
    case_b = db.query(Case).filter(Case.id == link_req.target_case_id).first()
    if not case_b:
        raise HTTPException(status_code=404, detail="Target case to link not found")
        
    if case_a.id == case_b.id:
        raise HTTPException(status_code=400, detail="Cannot link a case to itself")
        
    # Check if relationship already exists
    existing = db.query(CaseRelationship).filter(
        ((CaseRelationship.case_a_id == case_a.id) & (CaseRelationship.case_b_id == case_b.id)) |
        ((CaseRelationship.case_a_id == case_b.id) & (CaseRelationship.case_b_id == case_a.id))
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Cases are already linked as '{existing.relationship_type}'")
        
    rel = CaseRelationship(
        case_a_id=case_a.id,
        case_b_id=case_b.id,
        relationship_type=link_req.relationship_type,
        status="Active",
        reviewer_id=current_user.id,
        review_remarks=link_req.remarks or f"Consolidated by {current_user.full_name}",
        decided_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(rel)
    
    # Record timeline event on case_a
    record_case_event(
        db=db,
        case_id=case_a.id,
        event_type="LINKED_CASE",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        new_value=case_b.id,
        remarks=f"Matter linked with case {case_b.id} ({link_req.relationship_type}). Remarks: {link_req.remarks or 'Consolidated for joint review'}",
        is_public=False
    )
    
    # Record timeline event on case_b
    record_case_event(
        db=db,
        case_id=case_b.id,
        event_type="LINKED_CASE",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        new_value=case_a.id,
        remarks=f"Matter linked from case {case_a.id} ({link_req.relationship_type}). Remarks: {link_req.remarks or 'Consolidated for joint review'}",
        is_public=False
    )
    
    # Audit log
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="CASE_LINK",
        entity_type="CaseRelationship",
        entity_id=f"{case_a.id}<->{case_b.id}",
        remarks=f"Linked as {link_req.relationship_type}. {link_req.remarks or ''}"
    )
    
    db.commit()
    db.refresh(rel)
    
    return {
        "id": rel.id,
        "case_a_id": rel.case_a_id,
        "case_b_id": rel.case_b_id,
        "related_case_id": case_b.id,
        "relationship_type": rel.relationship_type,
        "status": rel.status,
        "similarity_score": rel.similarity_score,
        "title": getattr(case_b, "title", None) or case_b.category,
        "institution_name": case_b.institution.official_name if case_b.institution else "Unknown",
        "case_status": case_b.status,
        "remarks": rel.review_remarks,
        "created_at": rel.created_at
    }
