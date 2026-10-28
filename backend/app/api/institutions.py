from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Institution, InstitutionAlias, Case, OverlapAlert, ActionConflictAlert, User
from app.schemas.schemas import InstitutionResponse, InstitutionDetailResponse, InstitutionResolveRequest
from app.api.auth import get_current_user
from app.services.identity_engine import resolve_institution_identity

router = APIRouter(prefix="/institutions", tags=["Institutions & 360 Profiles"])

@router.get("", response_model=List[InstitutionResponse])
def get_institutions(
    q: Optional[str] = Query(None, description="Search by Permanent ID, name, or city"),
    state: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Institution)
    if q:
        query = query.filter(
            (Institution.permanent_id.ilike(f"%{q}%")) |
            (Institution.official_name.ilike(f"%{q}%")) |
            (Institution.city.ilike(f"%{q}%"))
        )
    if state:
        query = query.filter(Institution.state == state)
    if region:
        query = query.filter(Institution.region == region)
        
    institutions = query.all()
    results = []
    for inst in institutions:
        total_cases = db.query(func.count(Case.id)).filter(Case.institution_id == inst.id).scalar() or 0
        pending_cases = db.query(func.count(Case.id)).filter(
            Case.institution_id == inst.id,
            Case.status.in_(["Pending", "Under Process", "Escalated"])
        ).scalar() or 0
        
        inst_dict = {
            "id": inst.id,
            "permanent_id": inst.permanent_id,
            "official_name": inst.official_name,
            "address": inst.address,
            "city": inst.city,
            "district": inst.district,
            "state": inst.state,
            "region": inst.region,
            "verification_status": inst.verification_status,
            "institution_type": inst.institution_type,
            "case_count": total_cases,
            "pending_case_count": pending_cases
        }
        results.append(inst_dict)
    return results

@router.get("/{id}", response_model=InstitutionDetailResponse)
def get_institution_360_profile(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution record not found")
        
    total_cases = db.query(func.count(Case.id)).filter(Case.institution_id == inst.id).scalar() or 0
    pending_cases = db.query(func.count(Case.id)).filter(
        Case.institution_id == inst.id,
        Case.status.in_(["Pending", "Under Process", "Escalated"])
    ).scalar() or 0
    
    # Retrieve all linked cases
    cases = db.query(Case).filter(Case.institution_id == inst.id).order_by(Case.date_received.desc()).all()
    cases_data = []
    for c in cases:
        cases_data.append({
            "id": c.id,
            "category": c.category,
            "status": c.status,
            "bureau_code": c.current_bureau.code if c.current_bureau else "N/A",
            "priority": c.priority,
            "date_received": c.date_received,
            "last_action": c.last_action,
            "prescribed_deadline": c.prescribed_deadline
        })
        
    # Retrieve overlap alerts
    overlaps = db.query(OverlapAlert).filter(OverlapAlert.institution_id == inst.id).all()
    overlaps_data = [{
        "id": o.id,
        "case_a_id": o.case_a_id,
        "case_b_id": o.case_b_id,
        "similarity_score": o.similarity_score,
        "review_status": o.review_status,
        "created_at": o.created_at
    } for o in overlaps]
    
    # Retrieve action conflicts
    conflicts = db.query(ActionConflictAlert).filter(ActionConflictAlert.institution_id == inst.id).all()
    conflicts_data = [{
        "id": cf.id,
        "case_a_id": cf.case_a_id,
        "case_b_id": cf.case_b_id,
        "conflict_type": cf.conflict_type,
        "severity": cf.severity,
        "status": cf.status,
        "created_at": cf.created_at
    } for cf in conflicts]
    
    return {
        "id": inst.id,
        "permanent_id": inst.permanent_id,
        "official_name": inst.official_name,
        "address": inst.address,
        "city": inst.city,
        "district": inst.district,
        "state": inst.state,
        "region": inst.region,
        "pincode": inst.pincode,
        "verification_status": inst.verification_status,
        "verification_evidence": inst.verification_evidence,
        "email": inst.email,
        "phone": inst.phone,
        "website": inst.website,
        "institution_type": inst.institution_type,
        "case_count": total_cases,
        "pending_case_count": pending_cases,
        "aliases": inst.aliases,
        "cases": cases_data,
        "overlap_alerts": overlaps_data,
        "action_conflicts": conflicts_data
    }

@router.post("/resolve-identity")
def test_identity_resolution(
    req: InstitutionResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes the 6-priority institutional identity resolution engine.
    """
    result = resolve_institution_identity(
        db=db,
        permanent_id=req.permanent_id,
        institution_name=req.institution_name,
        state=req.state,
        district=req.district
    )
    # Strip full SQLAlchemy object for JSON serialization
    if "institution" in result and result["institution"]:
        inst = result["institution"]
        result["matched_institution"] = {
            "id": inst.id,
            "permanent_id": inst.permanent_id,
            "official_name": inst.official_name,
            "state": inst.state,
            "district": inst.district
        }
        del result["institution"]
    return result
