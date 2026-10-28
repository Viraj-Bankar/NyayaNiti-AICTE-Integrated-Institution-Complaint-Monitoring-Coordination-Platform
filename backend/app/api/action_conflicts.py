from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import ActionConflictAlert, Case, Institution, User
from app.schemas.schemas import ActionConflictAlertResponse, ActionConflictReviewRequest
from app.api.auth import get_current_user, require_role
from app.api.cases import serialize_case
from app.services.audit_service import log_audit_event, record_case_event

router = APIRouter(prefix="/action-conflicts", tags=["Action Conflict Detection & Review"])

@router.get("", response_model=List[ActionConflictAlertResponse])
def list_action_conflicts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActionConflictAlert).order_by(ActionConflictAlert.created_at.desc())
    if status:
        query = query.filter(ActionConflictAlert.status == status)
    if severity:
        query = query.filter(ActionConflictAlert.severity == severity)
    if institution_id:
        query = query.filter(ActionConflictAlert.institution_id == institution_id)
        
    alerts = query.all()
    results = []
    for cf in alerts:
        case_a = db.query(Case).filter(Case.id == cf.case_a_id).first()
        case_b = db.query(Case).filter(Case.id == cf.case_b_id).first()
        inst = cf.institution
        results.append({
            "id": cf.id,
            "case_a_id": cf.case_a_id,
            "case_b_id": cf.case_b_id,
            "institution_id": cf.institution_id,
            "institution_name": inst.official_name if inst else "Unknown",
            "conflict_type": cf.conflict_type,
            "rule_triggered": cf.rule_triggered,
            "severity": cf.severity,
            "evidence": cf.evidence,
            "status": cf.status,
            "reviewer_id": cf.reviewer_id,
            "resolution_notes": cf.resolution_notes,
            "reconciled_action": cf.reconciled_action,
            "created_at": cf.created_at,
            "case_a": serialize_case(case_a) if case_a else None,
            "case_b": serialize_case(case_b) if case_b else None,
        })
    return results

@router.get("/{id}", response_model=ActionConflictAlertResponse)
def get_action_conflict_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cf = db.query(ActionConflictAlert).filter(ActionConflictAlert.id == id).first()
    if not cf:
        raise HTTPException(status_code=404, detail="Action conflict record not found")
        
    case_a = db.query(Case).filter(Case.id == cf.case_a_id).first()
    case_b = db.query(Case).filter(Case.id == cf.case_b_id).first()
    inst = cf.institution
    return {
        "id": cf.id,
        "case_a_id": cf.case_a_id,
        "case_b_id": cf.case_b_id,
        "institution_id": cf.institution_id,
        "institution_name": inst.official_name if inst else "Unknown",
        "conflict_type": cf.conflict_type,
        "rule_triggered": cf.rule_triggered,
        "severity": cf.severity,
        "evidence": cf.evidence,
        "status": cf.status,
        "reviewer_id": cf.reviewer_id,
        "resolution_notes": cf.resolution_notes,
        "reconciled_action": cf.reconciled_action,
        "created_at": cf.created_at,
        "case_a": serialize_case(case_a) if case_a else None,
        "case_b": serialize_case(case_b) if case_b else None,
    }

@router.post("/{id}/review")
def review_action_conflict(
    id: int,
    review_in: ActionConflictReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    """
    Review action conflict:
    Preserves original action records while recording reconciled action decisions as new events.
    """
    cf = db.query(ActionConflictAlert).filter(ActionConflictAlert.id == id).first()
    if not cf:
        raise HTTPException(status_code=404, detail="Action conflict record not found")
        
    cf.reviewer_id = current_user.id
    cf.resolution_notes = review_in.resolution_notes
    cf.updated_at = datetime.utcnow()
    
    if review_in.decision == "CONFIRM_CONFLICT":
        cf.status = "Confirmed Conflict"
    elif review_in.decision == "RESOLVE":
        cf.status = "Resolved"
        cf.reconciled_action = review_in.reconciled_action
        
        # Add new event to both cases reflecting the reconciled order without destroying historical action logs
        if review_in.reconciled_action:
            record_case_event(
                db=db,
                case_id=cf.case_a_id,
                event_type="CONFLICT_RECONCILED",
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                new_value=review_in.reconciled_action,
                remarks=f"Inter-Bureau Action Conflict reconciled by {current_user.full_name}. Decision: {review_in.resolution_notes}"
            )
            record_case_event(
                db=db,
                case_id=cf.case_b_id,
                event_type="CONFLICT_RECONCILED",
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                new_value=review_in.reconciled_action,
                remarks=f"Inter-Bureau Action Conflict reconciled by {current_user.full_name}. Decision: {review_in.resolution_notes}"
            )
    elif review_in.decision == "REFER_TO_BUREAU_HEAD":
        cf.status = "Referred to Bureau Head"
    elif review_in.decision == "REQUEST_CLARIFICATION":
        cf.status = "Clarification Requested"
    elif review_in.decision == "REJECT_CONFLICT":
        cf.status = "Rejected"
        
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="ACTION_CONFLICT_DECISION",
        entity_type="ActionConflictAlert",
        entity_id=str(cf.id),
        new_value=cf.status,
        remarks=f"{review_in.resolution_notes} | Reconciled: {review_in.reconciled_action or 'N/A'}"
    )
    
    return {"message": f"Action conflict review recorded: {cf.status}", "alert_id": cf.id}
