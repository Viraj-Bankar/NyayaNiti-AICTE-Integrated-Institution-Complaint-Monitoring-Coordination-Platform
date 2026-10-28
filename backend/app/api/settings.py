from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Bureau, SystemConfiguration
from app.schemas.schemas import UserResponse, UserCreate
from app.api.auth import get_current_user, require_role, hash_password
from app.services.audit_service import log_audit_event
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Admin Settings & System Management"])

@router.get("/users", response_model=List[UserResponse])
def list_system_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head"]))
):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_system_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin"]))
):
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")
        
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        designation=user_in.designation,
        role=user_in.role,
        bureau_id=user_in.bureau_id,
        hashed_password=hash_password(user_in.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="USER_CREATED",
        entity_type="User",
        entity_id=str(new_user.id),
        remarks=f"Created user {new_user.username} with role {new_user.role}"
    )
    return new_user

@router.patch("/users/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="USER_STATUS_TOGGLED",
        entity_type="User",
        entity_id=str(user.id),
        remarks=f"Active status changed to {user.is_active}"
    )
    return {"message": "User status updated", "user_id": user.id, "is_active": user.is_active}

@router.get("/thresholds")
def get_system_thresholds(
    current_user: User = Depends(get_current_user)
):
    return {
        "overlap_high_threshold": settings.OVERLAP_HIGH_THRESHOLD,
        "overlap_review_threshold": settings.OVERLAP_REVIEW_THRESHOLD,
        "rapidfuzz_name_threshold": settings.RAPIDFUZZ_NAME_SIMILARITY_THRESHOLD,
        "surge_z_score_threshold": settings.SURGE_Z_SCORE_THRESHOLD,
        "surge_min_complaints": settings.SURGE_MIN_COMPLAINT_COUNT,
        "sla_days_critical": settings.SLA_CRITICAL_DAYS,
        "sla_days_high": settings.SLA_HIGH_DAYS,
        "sla_days_medium": settings.SLA_MEDIUM_DAYS,
        "sla_days_low": settings.SLA_LOW_DAYS
    }

@router.post("/thresholds")
def update_system_thresholds(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin"]))
):
    if "overlap_high_threshold" in payload:
        settings.OVERLAP_HIGH_THRESHOLD = float(payload["overlap_high_threshold"])
    if "overlap_review_threshold" in payload:
        settings.OVERLAP_REVIEW_THRESHOLD = float(payload["overlap_review_threshold"])
    if "rapidfuzz_name_threshold" in payload:
        settings.RAPIDFUZZ_NAME_SIMILARITY_THRESHOLD = float(payload["rapidfuzz_name_threshold"])
    if "surge_z_score_threshold" in payload:
        settings.SURGE_Z_SCORE_THRESHOLD = float(payload["surge_z_score_threshold"])
        
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="SYSTEM_CONFIGURATION_UPDATE",
        entity_type="SystemConfiguration",
        entity_id="THRESHOLDS",
        remarks=f"Updated thresholds: {payload}"
    )
    return {"status": "success", "updated_thresholds": payload}
