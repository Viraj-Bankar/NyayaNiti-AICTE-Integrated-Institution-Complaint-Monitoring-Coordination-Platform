import os
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.models import User
from app.schemas.schemas import UserLogin, Token, UserResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    audience: str = "nyayaniti-officer",
    token_type: str = "officer_access"
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "aud": audience,
        "token_type": token_type
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
        username: str = payload.get("sub")
        token_type = payload.get("token_type")
        aud = payload.get("aud")
        role = payload.get("role")
        
        # STRICT ISOLATION: Prevent complainant tokens from accessing internal officer endpoints
        if role == "complainant" or token_type == "complainant_access" or aud == "nyayaniti-complainant":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Complainant credentials cannot access internal administrative officer endpoints."
            )
        
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except HTTPException:
        raise
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
        
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
        username: str = payload.get("sub")
        token_type = payload.get("token_type")
        aud = payload.get("aud")
        role = payload.get("role")
        
        if role == "complainant" or token_type == "complainant_access" or aud == "nyayaniti-complainant":
            return None
            
        if not username:
            return None
        return db.query(User).filter(User.username == username, User.is_active == True).first()
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
        
    token = create_access_token(
        data={"sub": user.username, "role": user.role, "bureau_id": user.bureau_id},
        audience="nyayaniti-officer",
        token_type="officer_access"
    )
    
    log_audit_event(
        db=db,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role,
        event_type="LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        remarks=f"User {user.username} successfully authenticated via credentials"
    )
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "designation": user.designation,
        "role": user.role,
        "bureau_id": user.bureau_id,
        "bureau_code": user.bureau.code if user.bureau else None
    }
    return {"access_token": token, "token_type": "bearer", "user": user_dict}

@router.post("/demo-login/{role}", response_model=Token)
def demo_login(role: str, db: Session = Depends(get_db)):
    """
    Dedicated development quick-switch for administrative evaluation.
    Allowed roles: 'super_admin', 'authorized_officer', 'bureau_head', 'monitoring_officer'
    Strictly disabled in production environments to prevent privilege escalation and unauthorized admin access.
    """
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo evaluation authentication is strictly disabled in production. Official officers must authenticate via /api/auth/login with assigned credentials."
        )

    valid_roles = ["super_admin", "authorized_officer", "bureau_head", "monitoring_officer"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid demo role. Allowed: {valid_roles}")
        
    user = db.query(User).filter(User.role == role, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No active demo account found for role {role}")
        
    token = create_access_token(
        data={"sub": user.username, "role": user.role, "bureau_id": user.bureau_id},
        audience="nyayaniti-officer",
        token_type="officer_access"
    )
    
    log_audit_event(
        db=db,
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role,
        event_type="LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        remarks=f"Demo fast-switch login as {role} ({user.full_name})"
    )
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "designation": user.designation,
        "role": user.role,
        "bureau_id": user.bureau_id,
        "bureau_code": user.bureau.code if user.bureau else None
    }
    return {"access_token": token, "token_type": "bearer", "user": user_dict}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
