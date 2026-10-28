from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    OverlapAlert, Case, Institution, User, Bureau,
    CoordinationWorkspace, CoordinationParticipant, CaseCoordinationLink
)
from app.schemas.schemas import OverlapAlertResponse, OverlapReviewRequest
from app.api.auth import get_current_user, require_role
from app.api.cases import serialize_case
from app.services.matching_engine import compute_similarity, get_model_info
from app.services.audit_service import log_audit_event, record_case_event
from app.config import settings

router = APIRouter(prefix="/overlaps", tags=["AI Overlap Detection & Review"])

@router.get("/model-info")
def get_ai_model_status():
    return get_model_info()

@router.get("", response_model=List[OverlapAlertResponse])
def list_overlap_alerts(
    status: Optional[str] = None,
    min_similarity: Optional[float] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(OverlapAlert).order_by(OverlapAlert.similarity_score.desc())
    if status:
        query = query.filter(OverlapAlert.review_status == status)
    if min_similarity:
        query = query.filter(OverlapAlert.similarity_score >= min_similarity)
    if institution_id:
        query = query.filter(OverlapAlert.institution_id == institution_id)
        
    alerts = query.all()
    results = []
    for a in alerts:
        case_a = db.query(Case).filter(Case.id == a.case_a_id).first()
        case_b = db.query(Case).filter(Case.id == a.case_b_id).first()
        inst = a.institution
        results.append({
            "id": a.id,
            "case_a_id": a.case_a_id,
            "case_b_id": a.case_b_id,
            "institution_id": a.institution_id,
            "institution_name": inst.official_name if inst else "Unknown",
            "permanent_id": inst.permanent_id if inst else "N/A",
            "similarity_score": a.similarity_score,
            "model_name": a.model_name,
            "evidence_summary": a.evidence_summary,
            "review_status": a.review_status,
            "reviewer_id": a.reviewer_id,
            "review_notes": a.review_notes,
            "decision": a.decision,
            "created_at": a.created_at,
            "case_a": serialize_case(case_a) if case_a else None,
            "case_b": serialize_case(case_b) if case_b else None,
        })
    return results

@router.get("/{id}", response_model=OverlapAlertResponse)
def get_overlap_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = db.query(OverlapAlert).filter(OverlapAlert.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Overlap alert not found")
        
    case_a = db.query(Case).filter(Case.id == a.case_a_id).first()
    case_b = db.query(Case).filter(Case.id == a.case_b_id).first()
    inst = a.institution
    return {
        "id": a.id,
        "case_a_id": a.case_a_id,
        "case_b_id": a.case_b_id,
        "institution_id": a.institution_id,
        "institution_name": inst.official_name if inst else "Unknown",
        "permanent_id": inst.permanent_id if inst else "N/A",
        "similarity_score": a.similarity_score,
        "model_name": a.model_name,
        "evidence_summary": a.evidence_summary,
        "review_status": a.review_status,
        "reviewer_id": a.reviewer_id,
        "review_notes": a.review_notes,
        "decision": a.decision,
        "created_at": a.created_at,
        "case_a": serialize_case(case_a) if case_a else None,
        "case_b": serialize_case(case_b) if case_b else None,
    }

@router.post("/{id}/review")
def review_overlap_decision(
    id: int,
    review_in: OverlapReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    """
    Implements Features 11 & 12: Review candidate overlap pairs with explicit choices:
    - COORDINATE: Designate coordination owner, identify bureaus, launch workspace while preserving case identities.
    - PROCEED_SEPARATELY: Require justification, preserve relation, keep separate tracks.
    - REJECT: Mark as unrelated or false positive.
    """
    alert = db.query(OverlapAlert).filter(OverlapAlert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Overlap alert not found")
        
    case_a = db.query(Case).filter(Case.id == alert.case_a_id).first()
    case_b = db.query(Case).filter(Case.id == alert.case_b_id).first()
    
    alert.reviewer_id = current_user.id
    alert.review_notes = review_in.review_notes
    alert.decision = review_in.decision
    alert.updated_at = datetime.utcnow()
    
    if review_in.decision == "COORDINATE":
        alert.review_status = "Coordination Required"
        if case_a:
            case_a.overlap_review_status = "Coordination Required"
        if case_b:
            case_b.overlap_review_status = "Coordination Required"
            
        # Create or link to a Coordination Workspace
        lead_officer_id = review_in.coordination_owner_id or current_user.id
        lead_bureau_id = review_in.designated_lead_bureau_id or (case_a.current_bureau_id if case_a else 1)
        sec_bureau_id = case_b.current_bureau_id if case_b else None
        
        inst_name = alert.institution.official_name if alert.institution else "Institution"
        workspace = CoordinationWorkspace(
            title=f"Joint Case Coordination: {inst_name}",
            institution_id=alert.institution_id,
            primary_bureau_id=lead_bureau_id,
            secondary_bureau_id=sec_bureau_id,
            coordination_owner_id=lead_officer_id,
            status="In Coordination",
            justification=review_in.review_notes
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
        alert.coordination_workspace_id = workspace.id
        
        # Link both cases
        db.add(CaseCoordinationLink(workspace_id=workspace.id, case_id=alert.case_a_id))
        db.add(CaseCoordinationLink(workspace_id=workspace.id, case_id=alert.case_b_id))
        
        # Add participants
        db.add(CoordinationParticipant(workspace_id=workspace.id, officer_id=lead_officer_id, bureau_id=lead_bureau_id, role="Lead Coordinator"))
        if case_b and case_b.assigned_officer_id and case_b.assigned_officer_id != lead_officer_id:
            db.add(CoordinationParticipant(workspace_id=workspace.id, officer_id=case_b.assigned_officer_id, bureau_id=case_b.current_bureau_id, role="Participant Officer"))
            
        record_case_event(
            db=db,
            case_id=alert.case_a_id,
            event_type="COORDINATION_INITIATED",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            remarks=f"Cross-Bureau Coordination launched with {alert.case_b_id}. Workspace #{workspace.id}. Notes: {review_in.review_notes}"
        )
        record_case_event(
            db=db,
            case_id=alert.case_b_id,
            event_type="COORDINATION_INITIATED",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            remarks=f"Cross-Bureau Coordination launched with {alert.case_a_id}. Workspace #{workspace.id}. Notes: {review_in.review_notes}"
        )
        
    elif review_in.decision == "PROCEED_SEPARATELY":
        alert.review_status = "Resolved"
        if case_a:
            case_a.overlap_review_status = "Resolved"
        if case_b:
            case_b.overlap_review_status = "Resolved"
            
        record_case_event(
            db=db,
            case_id=alert.case_a_id,
            event_type="PROCEED_SEPARATELY",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            remarks=f"Reviewed against {alert.case_b_id}. Decided to proceed separately. Justification: {review_in.review_notes}"
        )
        record_case_event(
            db=db,
            case_id=alert.case_b_id,
            event_type="PROCEED_SEPARATELY",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            remarks=f"Reviewed against {alert.case_a_id}. Decided to proceed separately. Justification: {review_in.review_notes}"
        )
        
    elif review_in.decision == "REJECT":
        alert.review_status = "Rejected"
        if case_a and case_a.overlap_review_status == "New":
            case_a.overlap_review_status = "None"
        if case_b and case_b.overlap_review_status == "New":
            case_b.overlap_review_status = "None"
            
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="OVERLAP_REVIEW_DECISION",
        entity_type="OverlapAlert",
        entity_id=str(alert.id),
        new_value=review_in.decision,
        remarks=review_in.review_notes
    )
    
    return {"message": f"Overlap decision recorded: {review_in.decision}", "alert_id": alert.id}

@router.post("/scan-all")
def trigger_full_cross_bureau_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    """
    Executes cross-bureau candidate generation and similarity evaluation across all active complaints.
    """
    institutions = db.query(Institution).all()
    created_count = 0
    
    for inst in institutions:
        cases = db.query(Case).filter(Case.institution_id == inst.id).all()
        if len(cases) < 2:
            continue
            
        for i in range(len(cases)):
            for j in range(i + 1, len(cases)):
                c1 = cases[i]
                c2 = cases[j]
                
                # Check if alert already exists
                existing = db.query(OverlapAlert).filter(
                    ((OverlapAlert.case_a_id == c1.id) & (OverlapAlert.case_b_id == c2.id)) |
                    ((OverlapAlert.case_a_id == c2.id) & (OverlapAlert.case_b_id == c1.id))
                ).first()
                
                if existing:
                    continue
                    
                score, model_name, evidence = compute_similarity(
                    c1.description, c2.description, c1.category, c2.category
                )
                
                if score >= settings.OVERLAP_REVIEW_THRESHOLD:
                    new_alert = OverlapAlert(
                        case_a_id=c1.id,
                        case_b_id=c2.id,
                        institution_id=inst.id,
                        similarity_score=score,
                        model_name=model_name,
                        evidence_summary=evidence,
                        review_status="New"
                    )
                    db.add(new_alert)
                    created_count += 1
                    
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="SYSTEM_SCAN",
        entity_type="OverlapAlert",
        entity_id="ALL",
        remarks=f"Cross-Bureau AI scan executed; {created_count} candidate overlap pairs identified"
    )
    
    return {
        "status": "success",
        "new_overlaps_detected": created_count,
        "model": get_model_info()
    }
