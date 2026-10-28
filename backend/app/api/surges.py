from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.surge_engine import analyze_complaint_surges
from app.api.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/surges", tags=["Complaint Surge Detection"])

@router.get("")
def get_complaint_surges(
    window_days: int = Query(30, description="Rolling time window in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes statistical z-score and baseline analysis to detect sudden complaint surges per institution and category.
    """
    surges = analyze_complaint_surges(db=db, window_days=window_days)
    return {
        "window_days": window_days,
        "total_surges_detected": len(surges),
        "surges": surges
    }
