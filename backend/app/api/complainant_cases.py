from datetime import datetime, timedelta
from typing import List, Optional
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.models import Case, CaseEvent, Institution, Bureau, Complainant
from app.schemas.schemas import (
    ComplainantCaseCreate, ComplainantCaseResponse, ComplainantCaseDetailResponse
)
from app.api.complainant_auth import get_current_complainant
from app.services.audit_service import log_audit_event, record_case_event
from app.services.priority_engine import evaluate_case_priority
from app.config import settings

router = APIRouter(prefix="/complainant/cases", tags=["Complainant Grievance Tracking"])

def serialize_complainant_case(c: Case) -> dict:
    return {
        "id": c.id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.official_name if c.institution else "AICTE Approved Institution",
        "permanent_id": c.institution.permanent_id if c.institution else "N/A",
        "category": c.category,
        "subcategory": c.subcategory,
        "description": c.description,
        "date_received": c.date_received,
        "status": c.status,
        "bureau_code": c.current_bureau.code if c.current_bureau else "PGRC",
        "last_action": c.last_action,
        "last_action_date": c.last_action_date,
        "prescribed_deadline": c.prescribed_deadline,
        "created_at": c.created_at
    }

@router.get("", response_model=List[ComplainantCaseResponse])
def list_my_complaints(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve all grievances filed by the authenticated citizen.
    STRICT SCOPING: Only returns cases where Case.complainant_id matches current user.
    """
    cases = db.query(Case).filter(
        Case.complainant_id == current_complainant.id
    ).order_by(desc(Case.date_received)).all()

    return [serialize_complainant_case(c) for c in cases]

@router.get("/{case_id}", response_model=ComplainantCaseDetailResponse)
def get_my_complaint_detail(
    case_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve milestone tracking details for an owned grievance.
    ANTI-IDOR: Returns 404 if grievance does not belong to the authenticated complainant.
    """
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance record not found or access unauthorized."
        )

    data = serialize_complainant_case(case)
    # Expose only sanitized public milestone events
    data["events"] = [
        {
            "event_type": e.event_type,
            "remarks": e.remarks or "Milestone recorded by administrative bureau.",
            "timestamp": e.timestamp
        }
        for e in case.events
        if e.event_type not in ["OVERLAP_INTERNAL", "CONFLICT_INTERNAL", "BUREAU_INTERNAL_NOTE"]
    ]
    return data

@router.post("", response_model=ComplainantCaseResponse, status_code=status.HTTP_201_CREATED)
def file_complaint(
    case_in: ComplainantCaseCreate,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Submit a new institutional grievance as an authenticated citizen.
    Automatically anchors to AICTE Permanent Institution ID and links complainant_id.
    """
    inst = db.query(Institution).filter(Institution.id == case_in.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Selected technical institution not found in AICTE registry.")

    # Route public grievances to Public Grievance Redressal Cell (PGRC) by default
    pgrc_bureau = db.query(Bureau).filter(Bureau.code == "PGRC").first()
    if not pgrc_bureau:
        pgrc_bureau = db.query(Bureau).first()

    year = datetime.utcnow().year
    rand_seq = random.randint(1000, 9999)
    case_id = f"AICTE-PGRC-{year}-{rand_seq}"

    now = datetime.utcnow()
    deadline = now + timedelta(days=settings.SLA_MEDIUM_DAYS)

    # Privacy masked complainant identifier
    masked_name = f"{current_complainant.full_name[:2].upper()}*** (Citizen ID #{current_complainant.id})"

    new_case = Case(
        id=case_id,
        institution_id=case_in.institution_id,
        complainant_id=current_complainant.id,
        complainant_type=current_complainant.complainant_type or "Student",
        complainant_masked=masked_name,
        category=case_in.category,
        subcategory=case_in.subcategory,
        description=case_in.description.strip(),
        date_received=now,
        status="Pending",
        current_bureau_id=pgrc_bureau.id,
        assigned_officer_id=None,
        priority="Medium",
        priority_score=50.0,
        prescribed_deadline=deadline,
        last_action="Grievance Registered via Citizen Portal",
        last_action_date=now,
        next_action="Bureau Verification & Officer Allocation",
        overlap_review_status="None",
        action_conflict_status="None"
    )

    # Evaluate statutory priority
    prio, score, factors = evaluate_case_priority(new_case)
    new_case.priority = prio
    new_case.priority_score = score
    new_case.priority_factors = factors

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Record initial milestone event
    record_case_event(
        db=db,
        case_id=new_case.id,
        event_type="REGISTERED",
        actor_id=None,
        actor_name=current_complainant.full_name,
        remarks=f"Citizen {current_complainant.full_name} submitted grievance under category '{new_case.category}'"
    )

    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=current_complainant.full_name,
        actor_role="complainant",
        event_type="GRIEVANCE_FILED",
        entity_type="Case",
        entity_id=new_case.id,
        remarks=f"Grievance {new_case.id} filed for institution {inst.official_name}"
    )

    return serialize_complainant_case(new_case)
