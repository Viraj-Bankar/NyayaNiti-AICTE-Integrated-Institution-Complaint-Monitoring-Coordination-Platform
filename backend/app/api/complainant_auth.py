import os
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.models import Complainant
from app.schemas.schemas import (
    ComplainantRegister, ComplainantLogin, ComplainantResponse, ComplainantToken
)
from app.api.auth import hash_password, verify_password, create_access_token
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/complainant", tags=["Complainant Authentication"])
security = HTTPBearer(auto_error=False)

def create_complainant_token(complainant: Complainant) -> str:
    """
    Generate isolated JWT access token for complainants with strict audience and role claims.
    """
    return create_access_token(
        data={
            "sub": complainant.email,
            "complainant_id": complainant.id,
            "role": "complainant",
            "name": complainant.full_name
        },
        audience="nyayaniti-complainant",
        token_type="complainant_access"
    )

def get_current_complainant(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Complainant:
    """
    FastAPI dependency for complainant-only endpoints.
    Strictly verifies audience == 'nyayaniti-complainant' and token_type == 'complainant_access'.
    Rejects officer tokens with HTTP 403 Forbidden.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        email: str = payload.get("sub")
        token_type: str = payload.get("token_type")
        aud: str = payload.get("aud")
        role: str = payload.get("role")

        # STRICT AUDIENCE & ROLE ISOLATION: Reject officer tokens
        if role != "complainant" or token_type != "complainant_access" or aud != "nyayaniti-complainant":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Complainant portal is restricted to registered citizens."
            )

        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please login again."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    complainant = db.query(Complainant).filter(
        Complainant.email == email
    ).first()
    if complainant is None:
        raise HTTPException(status_code=401, detail="Complainant account not found")

    # Inactive / suspended account handling
    if not complainant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your complainant account has been suspended or deactivated. Please contact support."
        )

    return complainant


def _handle_registration(reg_in: ComplainantRegister, db: Session) -> Complainant:
    # 1. Validate password confirmation
    if reg_in.password != reg_in.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    # 2. Validate password complexity and length
    if len(reg_in.password) < 8 or len(reg_in.password) > 128:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 128 characters long.")

    if not (re.search(r"[A-Z]", reg_in.password) and re.search(r"[a-z]", reg_in.password) and re.search(r"\d", reg_in.password)):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one number."
        )

    # 3. Validate 10-digit Indian mobile format
    mobile_clean = reg_in.mobile.strip()
    if not re.match(r"^[6-9]\d{9}$", mobile_clean):
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit Indian mobile number.")

    clean_email = str(reg_in.email).strip().lower()

    # 4. Enforce account uniqueness
    existing_email = db.query(Complainant).filter(Complainant.email == clean_email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please login instead.")

    existing_mobile = db.query(Complainant).filter(Complainant.mobile == mobile_clean).first()
    if existing_mobile:
        raise HTTPException(status_code=400, detail="An account with this mobile number already exists. Please login instead.")

    # 5. STRICT SECURITY: Role is assigned exclusively by trusted backend logic
    new_complainant = Complainant(
        full_name=reg_in.full_name.strip(),
        email=clean_email,
        mobile=mobile_clean,
        hashed_password=hash_password(reg_in.password),
        is_active=True,
        is_email_verified=False,
        is_mobile_verified=False,
        complainant_type=reg_in.complainant_type or "Student"
    )
    db.add(new_complainant)
    db.commit()
    db.refresh(new_complainant)

    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=new_complainant.full_name,
        actor_role="complainant",
        event_type="COMPLAINANT_REGISTERED",
        entity_type="Complainant",
        entity_id=str(new_complainant.id),
        remarks=f"Public citizen registered account: {clean_email}"
    )

    return new_complainant


def _handle_login(login_in: ComplainantLogin, db: Session) -> Dict[str, Any]:
    clean_identifier = login_in.email.strip().lower()
    complainant = db.query(Complainant).filter(
        (Complainant.email == clean_identifier) | (Complainant.mobile == clean_identifier)
    ).first()

    if not complainant or not verify_password(login_in.password, complainant.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/mobile or password",
        )

    # Inactive / suspended account handling
    if not complainant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your complainant account has been suspended or deactivated. Please contact support."
        )

    token = create_complainant_token(complainant)

    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=complainant.full_name,
        actor_role="complainant",
        event_type="COMPLAINANT_LOGIN",
        entity_type="Complainant",
        entity_id=str(complainant.id),
        remarks=f"Citizen logged in: {complainant.email}"
    )

    complainant_dict = {
        "id": complainant.id,
        "full_name": complainant.full_name,
        "email": complainant.email,
        "mobile": complainant.mobile,
        "is_active": complainant.is_active,
        "is_email_verified": complainant.is_email_verified,
        "is_mobile_verified": complainant.is_mobile_verified,
        "complainant_type": complainant.complainant_type,
        "created_at": complainant.created_at.isoformat() if complainant.created_at else None
    }
    return {"access_token": token, "token_type": "bearer", "complainant": complainant_dict}


# Primary Routes (POST /api/complainant/register, POST /api/complainant/login, GET /api/complainant/me)
@router.post("/register", response_model=ComplainantResponse, status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", response_model=ComplainantResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def register_complainant(
    reg_in: ComplainantRegister,
    db: Session = Depends(get_db)
):
    return _handle_registration(reg_in, db)


@router.post("/login", response_model=ComplainantToken)
@router.post("/auth/login", response_model=ComplainantToken, include_in_schema=False)
def login_complainant(
    login_in: ComplainantLogin,
    db: Session = Depends(get_db)
):
    return _handle_login(login_in, db)


@router.get("/me", response_model=ComplainantResponse)
@router.get("/auth/me", response_model=ComplainantResponse, include_in_schema=False)
def get_current_complainant_profile(
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return current_complainant


@router.post("/demo-login", response_model=ComplainantToken)
@router.post("/auth/demo-login", response_model=ComplainantToken, include_in_schema=False)
def demo_complainant_login(db: Session = Depends(get_db)):
    """
    Dedicated development quick-switch for evaluating the complainant portal.
    Strictly disabled in production environments.
    """
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo evaluation authentication is strictly disabled in production."
        )

    complainant = db.query(Complainant).filter(Complainant.email == "student.demo@nyayaniti.gov.in").first()
    if not complainant:
        complainant = db.query(Complainant).filter(Complainant.is_active == True).first()
    if not complainant:
        raise HTTPException(status_code=404, detail="No active complainant account found. Please register an account.")

    token = create_complainant_token(complainant)

    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=complainant.full_name,
        actor_role="complainant",
        event_type="DEMO_LOGIN",
        entity_type="Complainant",
        entity_id=str(complainant.id),
        remarks=f"Demo login as citizen: {complainant.full_name}"
    )

    complainant_dict = {
        "id": complainant.id,
        "full_name": complainant.full_name,
        "email": complainant.email,
        "mobile": complainant.mobile,
        "is_active": complainant.is_active,
        "is_email_verified": complainant.is_email_verified,
        "is_mobile_verified": complainant.is_mobile_verified,
        "complainant_type": complainant.complainant_type,
        "created_at": complainant.created_at.isoformat() if complainant.created_at else None
    }
    return {"access_token": token, "token_type": "bearer", "complainant": complainant_dict}
