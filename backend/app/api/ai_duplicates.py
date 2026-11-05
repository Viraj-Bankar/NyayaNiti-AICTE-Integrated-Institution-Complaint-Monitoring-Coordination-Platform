"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: AI-Powered Semantic Duplicate Detection API Endpoints

Provides authenticated, role-protected endpoints for officers to inspect
semantic duplicate candidates, trigger on-demand analysis, and record
authoritative statutory verification decisions.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import User, Case, AIDuplicateRecommendation
from app.schemas.schemas import (
    AIModelStatusResponse,
    AIDuplicateAnalysisResponse,
    AIDuplicateDetailResponse,
    AIDuplicateCandidateResponse,
    OfficerDuplicateVerifyRequest,
    OfficerDuplicateVerifyResponse
)
from app.api.auth import get_current_user
from app.api.officer_complaints import verify_officer_role
from app.services.duplicate_service import get_duplicate_service

router = APIRouter(prefix="/ai", tags=["AI Duplicate Complaint Detection"])


@router.get("/model/status", response_model=AIModelStatusResponse)
def get_model_status(
    current_user: User = Depends(get_current_user)
):
    """
    Returns current health, architecture metadata, embedding parameters,
    and vector search index configuration of the duplicate detection engine.
    """
    verify_officer_role(current_user)
    service = get_duplicate_service()
    return service.get_model_status()


@router.post("/duplicates/{complaint_id}/analyze", response_model=AIDuplicateAnalysisResponse)
def analyze_complaint_duplicates(
    complaint_id: str,
    limit: int = Query(5, ge=1, le=20, description="Max candidate complaints to return"),
    min_similarity: float = Query(0.40, ge=0.0, le=1.0, description="Minimum cosine similarity retrieval cutoff"),
    include_cross_institution: bool = Query(False, description="Whether to include complaints outside source institution"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes on-demand MPNet-768 semantic candidate retrieval and SVM duplicate
    classification against active institutional dossiers.
    """
    verify_officer_role(current_user)
    service = get_duplicate_service()

    try:
        result = service.analyze_complaint(
            db=db,
            complaint_id=complaint_id,
            limit=limit,
            min_similarity=min_similarity,
            include_cross_institution=include_cross_institution
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI duplicate analysis failed: {str(e)}"
        )


@router.get("/duplicates/recommendations/pending", response_model=List[AIDuplicateCandidateResponse])
def list_pending_duplicate_recommendations(
    institution_id: Optional[int] = Query(None, description="Filter by institution"),
    tier: Optional[str] = Query(None, description="Filter by predicted tier"),
    limit: int = Query(20, ge=1, le=100, description="Maximum items"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Inbox queue: Lists all pending duplicate recommendations awaiting officer verification.
    """
    verify_officer_role(current_user)

    query = db.query(AIDuplicateRecommendation).filter(
        AIDuplicateRecommendation.verification_status == "PENDING_REVIEW"
    )

    if institution_id:
        query = query.filter(AIDuplicateRecommendation.institution_id == institution_id)
    if tier:
        query = query.filter(AIDuplicateRecommendation.predicted_tier == tier)

    recs = query.order_by(desc(AIDuplicateRecommendation.duplicate_probability)).limit(limit).all()

    results = []
    for r in recs:
        src = r.source_case
        cand = r.candidate_case
        cand_inst_name = (
            cand.institution.official_name
            if cand and cand.institution else "Unknown Institution"
        )
        results.append({
            "recommendation_id": r.id,
            "source_complaint_id": r.source_case_id,
            "candidate_complaint_id": r.candidate_case_id,
            "candidate_title": cand.title if cand else None,
            "candidate_category": cand.category if cand else "",
            "candidate_institution_id": cand.institution_id if cand else 0,
            "candidate_institution_name": cand_inst_name,
            "candidate_status": cand.status if cand else "Unknown",
            "candidate_date_received": cand.date_received if cand else r.created_at,
            "predicted_relationship": r.predicted_tier,
            "similarity_score": r.similarity_score,
            "duplicate_probability": r.duplicate_probability,
            "svm_decision": r.is_duplicate_predicted,
            "institution_match": bool(src and cand and src.institution_id == cand.institution_id),
            "category_match": bool(src and cand and src.category == cand.category),
            "matching_features": r.features or {},
            "explanation": r.explanation or "",
            "statutory_advice": r.statutory_advice or "",
            "verification_status": r.verification_status,
            "verification_reason": r.verification_reason,
            "model_version": r.model_version
        })

    return results


@router.get("/duplicates/{complaint_id}", response_model=AIDuplicateDetailResponse)
def get_complaint_duplicate_summary(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves duplicate detection overview and top candidate for a specific complaint.
    Automatically initiates analysis if none has been performed yet.
    """
    verify_officer_role(current_user)
    service = get_duplicate_service()

    try:
        return service.get_complaint_duplicates_summary(db=db, complaint_id=complaint_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve duplicate summary: {str(e)}"
        )


@router.get("/duplicates/{complaint_id}/candidates", response_model=List[AIDuplicateCandidateResponse])
def get_complaint_candidates(
    complaint_id: str,
    min_similarity: Optional[float] = Query(None, description="Filter by minimum cosine similarity"),
    tier: Optional[str] = Query(None, description="Filter by predicted tier"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    limit: int = Query(10, ge=1, le=50, description="Max candidates to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns ranked candidate duplicate complaints with similarity scores,
    calibrated SVM duplicate probabilities, and 13 explainable features.
    """
    verify_officer_role(current_user)
    service = get_duplicate_service()

    try:
        return service.get_complaint_candidates(
            db=db,
            complaint_id=complaint_id,
            min_similarity=min_similarity,
            tier=tier,
            status=status,
            limit=limit
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve duplicate candidates: {str(e)}"
        )


@router.post("/duplicates/{complaint_id}/verify", response_model=OfficerDuplicateVerifyResponse)
def verify_duplicate_recommendation(
    complaint_id: str,
    verify_in: OfficerDuplicateVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Authoritative Officer Verification:
    - CONFIRM_DUPLICATE: Confirms duplicate, optionally links dossiers in CaseRelationship.
    - MARK_RELATED: Acknowledges institutional resemblance without declaring duplicate.
    - REJECT_RECOMMENDATION: Dismisses recommendation with mandatory justification.

    AI never automatically merges or closes complaints. Officer action is mandatory.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])
    service = get_duplicate_service()

    try:
        return service.verify_duplicate_recommendation(
            db=db,
            source_complaint_id=complaint_id,
            candidate_complaint_id=verify_in.candidate_id,
            decision=verify_in.decision,
            reason=verify_in.reason,
            officer=current_user,
            link_dossier=verify_in.link_dossier
        )
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Officer duplicate verification failed: {str(e)}"
        )
