import io
import csv
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import (
    RegulatoryRequirement, RegulatoryRequirementVersion, ComplianceAssessment,
    ComplianceEvidence, CorrectiveActionPlan, InstitutionalRiskIndicator,
    ComplianceScoreSnapshot, Institution, Bureau, User, DocumentMetadata, Case
)
from app.schemas.schemas import (
    RegulatoryRequirementCreate, RegulatoryRequirementUpdate,
    RegulatoryRequirementResponse, RegulatoryRequirementVersionResponse,
    ComplianceAssessmentCreate, ComplianceAssessmentReviewRequest,
    ComplianceAssessmentResponse, ComplianceEvidenceCreate,
    ComplianceEvidenceReviewRequest, ComplianceEvidenceResponse,
    CAPCreate, CAPUpdate, CAPEvidenceSubmit, CAPVerifyRequest, CAPReopenRequest,
    CAPResponse, InstitutionalRiskIndicatorResponse, InstitutionScorecardResponse,
    ExecutiveGovernanceResponse, GrievancePerformanceResponse
)
from app.api.auth import get_current_user, require_role
from app.services.audit_service import log_audit_event
from app.services.compliance_engine import (
    create_or_get_assessment, record_assessment_review,
    calculate_institution_compliance, is_requirement_applicable
)
from app.services.cap_service import (
    create_cap, update_cap_status, submit_cap_completion_evidence,
    verify_and_close_cap, reopen_cap, scan_overdue_caps
)
from app.services.risk_intelligence_service import evaluate_institution_risk_indicators
from app.services.grievance_analytics_service import (
    get_institution_grievance_performance, get_executive_governance_analytics
)

router = APIRouter(prefix="/compliance", tags=["Automated Institutional Compliance & Regulatory Analytics"])

# =========================================================================
# 1. REGULATORY REQUIREMENTS CATALOGUE
# =========================================================================

@router.get("/requirements", response_model=List[RegulatoryRequirementResponse])
def list_regulatory_requirements(
    institution_type: Optional[str] = None,
    bureau_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RegulatoryRequirement)
    if is_active is not None:
        query = query.filter(RegulatoryRequirement.is_active == is_active)
    if bureau_id:
        query = query.filter(RegulatoryRequirement.responsible_bureau_id == bureau_id)

    reqs = query.order_by(RegulatoryRequirement.id.asc()).all()
    results = []
    for r in reqs:
        # Client-side / in-memory check for institution type if specified
        if institution_type and "ALL" not in (r.applicable_institution_types or []):
            if institution_type not in (r.applicable_institution_types or []):
                continue
        r_dict = {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category_code": r.category_code,
            "regulatory_source": r.regulatory_source,
            "source_reference_url": r.source_reference_url,
            "applicable_institution_types": r.applicable_institution_types,
            "applicability_conditions": r.applicability_conditions,
            "weight": r.weight,
            "default_evidence_requirements": r.default_evidence_requirements,
            "responsible_bureau_id": r.responsible_bureau_id,
            "responsible_bureau_code": r.responsible_bureau.code if r.responsible_bureau else None,
            "effective_date": r.effective_date,
            "review_date": r.review_date,
            "version": r.version,
            "is_active": r.is_active,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        }
        results.append(r_dict)
    return results

@router.post("/requirements", response_model=RegulatoryRequirementResponse, status_code=status.HTTP_201_CREATED)
def create_regulatory_requirement(
    payload: RegulatoryRequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head"]))
):
    existing = db.query(RegulatoryRequirement).filter(RegulatoryRequirement.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Requirement with ID '{payload.id}' already exists.")

    bureau = db.query(Bureau).filter(Bureau.id == payload.responsible_bureau_id).first()
    if not bureau:
        raise HTTPException(status_code=404, detail=f"Bureau #{payload.responsible_bureau_id} not found.")

    req = RegulatoryRequirement(
        id=payload.id,
        title=payload.title,
        description=payload.description,
        category_code=payload.category_code,
        regulatory_source=payload.regulatory_source,
        source_reference_url=payload.source_reference_url,
        applicable_institution_types=payload.applicable_institution_types,
        applicability_conditions=payload.applicability_conditions,
        weight=payload.weight,
        default_evidence_requirements=payload.default_evidence_requirements,
        responsible_bureau_id=payload.responsible_bureau_id,
        effective_date=payload.effective_date or datetime.utcnow(),
        review_date=payload.review_date,
        version=1,
        is_active=True,
        created_by_id=current_user.id
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Record initial Version 1 snapshot
    ver = RegulatoryRequirementVersion(
        requirement_id=req.id,
        version_number=1,
        title=req.title,
        description=req.description,
        weight=req.weight,
        regulatory_source=req.regulatory_source,
        changes_summary="Initial statutory promulgation",
        promulgated_by_id=current_user.id
    )
    db.add(ver)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="REGULATORY_REQUIREMENT_CREATE",
        entity_type="RegulatoryRequirement",
        entity_id=req.id,
        remarks=f"Created requirement {req.id}: {req.title}"
    )

    return req

@router.get("/requirements/{id}", response_model=RegulatoryRequirementResponse)
def get_regulatory_requirement(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(RegulatoryRequirement).filter(RegulatoryRequirement.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Requirement '{id}' not found.")

    versions = db.query(RegulatoryRequirementVersion).filter(
        RegulatoryRequirementVersion.requirement_id == id
    ).order_by(RegulatoryRequirementVersion.version_number.desc()).all()

    req_dict = {
        "id": req.id,
        "title": req.title,
        "description": req.description,
        "category_code": req.category_code,
        "regulatory_source": req.regulatory_source,
        "source_reference_url": req.source_reference_url,
        "applicable_institution_types": req.applicable_institution_types,
        "applicability_conditions": req.applicability_conditions,
        "weight": req.weight,
        "default_evidence_requirements": req.default_evidence_requirements,
        "responsible_bureau_id": req.responsible_bureau_id,
        "responsible_bureau_code": req.responsible_bureau.code if req.responsible_bureau else None,
        "effective_date": req.effective_date,
        "review_date": req.review_date,
        "version": req.version,
        "is_active": req.is_active,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
        "versions": versions
    }
    return req_dict

@router.patch("/requirements/{id}", response_model=RegulatoryRequirementResponse)
def update_regulatory_requirement(
    id: str,
    payload: RegulatoryRequirementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head"]))
):
    req = db.query(RegulatoryRequirement).filter(RegulatoryRequirement.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Requirement '{id}' not found.")

    version_increment = False
    if payload.changes_summary or payload.title or payload.description or payload.weight:
        version_increment = True

    if payload.title is not None:
        req.title = payload.title
    if payload.description is not None:
        req.description = payload.description
    if payload.category_code is not None:
        req.category_code = payload.category_code
    if payload.regulatory_source is not None:
        req.regulatory_source = payload.regulatory_source
    if payload.source_reference_url is not None:
        req.source_reference_url = payload.source_reference_url
    if payload.applicable_institution_types is not None:
        req.applicable_institution_types = payload.applicable_institution_types
    if payload.applicability_conditions is not None:
        req.applicability_conditions = payload.applicability_conditions
    if payload.weight is not None:
        req.weight = payload.weight
    if payload.default_evidence_requirements is not None:
        req.default_evidence_requirements = payload.default_evidence_requirements
    if payload.responsible_bureau_id is not None:
        req.responsible_bureau_id = payload.responsible_bureau_id
    if payload.review_date is not None:
        req.review_date = payload.review_date
    if payload.is_active is not None:
        req.is_active = payload.is_active

    if version_increment:
        req.version += 1
        ver = RegulatoryRequirementVersion(
            requirement_id=req.id,
            version_number=req.version,
            title=req.title,
            description=req.description,
            weight=req.weight,
            regulatory_source=req.regulatory_source,
            changes_summary=payload.changes_summary or "Statutory update promulgated by Bureau Head",
            promulgated_by_id=current_user.id
        )
        db.add(ver)

    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="REGULATORY_REQUIREMENT_UPDATE",
        entity_type="RegulatoryRequirement",
        entity_id=req.id,
        remarks=f"Updated requirement {req.id} (Version {req.version})"
    )

    return req

# =========================================================================
# 2. COMPLIANCE ASSESSMENTS LIFECYCLE
# =========================================================================

@router.get("/assessments", response_model=List[ComplianceAssessmentResponse])
def list_compliance_assessments(
    institution_id: Optional[int] = None,
    assessment_period: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplianceAssessment)
    if institution_id:
        query = query.filter(ComplianceAssessment.institution_id == institution_id)
    if assessment_period:
        query = query.filter(ComplianceAssessment.assessment_period == assessment_period)
    if status_filter:
        query = query.filter(ComplianceAssessment.status == status_filter)

    assessments = query.order_by(ComplianceAssessment.id.asc()).all()
    results = []
    for a in assessments:
        results.append({
            "id": a.id,
            "institution_id": a.institution_id,
            "institution_name": a.institution.official_name if a.institution else None,
            "requirement_id": a.requirement_id,
            "requirement_title": a.requirement.title if a.requirement else None,
            "requirement_weight": a.requirement.weight if a.requirement else 1.0,
            "requirement_version": a.requirement_version,
            "assessment_period": a.assessment_period,
            "status": a.status,
            "score_contribution": a.score_contribution,
            "reviewer_id": a.reviewer_id,
            "reviewer_name": a.reviewer.full_name if a.reviewer else None,
            "reviewer_remarks": a.reviewer_remarks,
            "assessed_at": a.assessed_at,
            "decision_history": a.decision_history,
            "created_at": a.created_at,
            "updated_at": a.updated_at,
            "evidences": a.evidences
        })
    return results

@router.post("/assessments", response_model=ComplianceAssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_compliance_assessment(
    payload: ComplianceAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    try:
        assessment = create_or_get_assessment(
            db=db,
            institution_id=payload.institution_id,
            requirement_id=payload.requirement_id,
            assessment_period=payload.assessment_period,
            actor_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": assessment.id,
        "institution_id": assessment.institution_id,
        "institution_name": assessment.institution.official_name if assessment.institution else None,
        "requirement_id": assessment.requirement_id,
        "requirement_title": assessment.requirement.title if assessment.requirement else None,
        "requirement_weight": assessment.requirement.weight if assessment.requirement else 1.0,
        "requirement_version": assessment.requirement_version,
        "assessment_period": assessment.assessment_period,
        "status": assessment.status,
        "score_contribution": assessment.score_contribution,
        "reviewer_id": assessment.reviewer_id,
        "reviewer_name": assessment.reviewer.full_name if assessment.reviewer else None,
        "reviewer_remarks": assessment.reviewer_remarks,
        "assessed_at": assessment.assessed_at,
        "decision_history": assessment.decision_history,
        "created_at": assessment.created_at,
        "updated_at": assessment.updated_at,
        "evidences": assessment.evidences
    }

@router.get("/assessments/{id}", response_model=ComplianceAssessmentResponse)
def get_compliance_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = db.query(ComplianceAssessment).filter(ComplianceAssessment.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail=f"Assessment #{id} not found.")

    return {
        "id": a.id,
        "institution_id": a.institution_id,
        "institution_name": a.institution.official_name if a.institution else None,
        "requirement_id": a.requirement_id,
        "requirement_title": a.requirement.title if a.requirement else None,
        "requirement_weight": a.requirement.weight if a.requirement else 1.0,
        "requirement_version": a.requirement_version,
        "assessment_period": a.assessment_period,
        "status": a.status,
        "score_contribution": a.score_contribution,
        "reviewer_id": a.reviewer_id,
        "reviewer_name": a.reviewer.full_name if a.reviewer else None,
        "reviewer_remarks": a.reviewer_remarks,
        "assessed_at": a.assessed_at,
        "decision_history": a.decision_history,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
        "evidences": a.evidences
    }

@router.post("/assessments/{id}/review", response_model=ComplianceAssessmentResponse)
def review_compliance_assessment(
    id: int,
    payload: ComplianceAssessmentReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    try:
        assessment = record_assessment_review(
            db=db,
            assessment_id=id,
            status=payload.status,
            reviewer_remarks=payload.reviewer_remarks,
            reviewer_user=current_user,
            score_contribution=payload.score_contribution
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": assessment.id,
        "institution_id": assessment.institution_id,
        "institution_name": assessment.institution.official_name if assessment.institution else None,
        "requirement_id": assessment.requirement_id,
        "requirement_title": assessment.requirement.title if assessment.requirement else None,
        "requirement_weight": assessment.requirement.weight if assessment.requirement else 1.0,
        "requirement_version": assessment.requirement_version,
        "assessment_period": assessment.assessment_period,
        "status": assessment.status,
        "score_contribution": assessment.score_contribution,
        "reviewer_id": assessment.reviewer_id,
        "reviewer_name": assessment.reviewer.full_name if assessment.reviewer else None,
        "reviewer_remarks": assessment.reviewer_remarks,
        "assessed_at": assessment.assessed_at,
        "decision_history": assessment.decision_history,
        "created_at": assessment.created_at,
        "updated_at": assessment.updated_at,
        "evidences": assessment.evidences
    }

@router.post("/assessments/{id}/evidence", response_model=ComplianceEvidenceResponse)
def attach_assessment_evidence(
    id: int,
    payload: ComplianceEvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assessment = db.query(ComplianceAssessment).filter(ComplianceAssessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment #{id} not found.")

    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == payload.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document #{payload.document_id} not found.")

    evidence = ComplianceEvidence(
        assessment_id=id,
        institution_id=assessment.institution_id,
        document_id=payload.document_id,
        evidence_type=payload.evidence_type,
        verification_status="SUBMITTED",
        verification_remarks=payload.remarks,
        submitted_by_role="officer",
        submitted_by_id=current_user.id
    )
    db.add(evidence)

    # Transition assessment status to UNDER_REVIEW if it was PENDING_EVIDENCE
    if assessment.status in ["NOT_ASSESSED", "PENDING_EVIDENCE"]:
        assessment.status = "UNDER_REVIEW"
        assessment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(evidence)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COMPLIANCE_EVIDENCE_ATTACHED",
        entity_type="ComplianceEvidence",
        entity_id=str(evidence.id),
        remarks=f"Evidence {payload.evidence_type} attached to Assessment #{id}"
    )

    return {
        "id": evidence.id,
        "assessment_id": evidence.assessment_id,
        "institution_id": evidence.institution_id,
        "document_id": evidence.document_id,
        "document_name": doc.original_filename or doc.file_name,
        "file_type": doc.file_type,
        "evidence_type": evidence.evidence_type,
        "verification_status": evidence.verification_status,
        "verified_by_id": evidence.verified_by_id,
        "verified_by_name": evidence.verified_by.full_name if evidence.verified_by else None,
        "verification_remarks": evidence.verification_remarks,
        "rejection_reason": evidence.rejection_reason,
        "submitted_by_role": evidence.submitted_by_role,
        "submitted_at": evidence.submitted_at,
        "verified_at": evidence.verified_at
    }

@router.get("/evidence", response_model=List[ComplianceEvidenceResponse])
def list_compliance_evidences(
    institution_id: Optional[int] = None,
    assessment_id: Optional[int] = None,
    verification_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplianceEvidence)
    if institution_id:
        query = query.filter(ComplianceEvidence.institution_id == institution_id)
    if assessment_id:
        query = query.filter(ComplianceEvidence.assessment_id == assessment_id)
    if verification_status:
        query = query.filter(ComplianceEvidence.verification_status == verification_status)

    evidences = query.order_by(ComplianceEvidence.submitted_at.desc()).all()
    results = []
    for e in evidences:
        doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == e.document_id).first()
        results.append({
            "id": e.id,
            "assessment_id": e.assessment_id,
            "institution_id": e.institution_id,
            "document_id": e.document_id,
            "document_name": (doc.original_filename or doc.file_name) if doc else None,
            "file_type": doc.file_type if doc else None,
            "evidence_type": e.evidence_type,
            "verification_status": e.verification_status,
            "verified_by_id": e.verified_by_id,
            "verified_by_name": e.verified_by.full_name if e.verified_by else None,
            "verification_remarks": e.verification_remarks,
            "rejection_reason": e.rejection_reason,
            "submitted_by_role": e.submitted_by_role,
            "submitted_at": e.submitted_at,
            "verified_at": e.verified_at
        })
    return results

@router.post("/evidence/{id}/review", response_model=ComplianceEvidenceResponse)
def review_compliance_evidence(
    id: int,
    payload: ComplianceEvidenceReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    evidence = db.query(ComplianceEvidence).filter(ComplianceEvidence.id == id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail=f"Evidence #{id} not found.")

    status_val = payload.status or payload.verification_status
    if not status_val or status_val not in ["VERIFIED", "REJECTED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Status must be VERIFIED, REJECTED, or PENDING.")

    evidence.verification_status = status_val
    evidence.verification_remarks = payload.verification_remarks
    if payload.rejection_reason:
        evidence.rejection_reason = payload.rejection_reason
    evidence.verified_by_id = current_user.id
    evidence.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(evidence)

    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == evidence.document_id).first()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COMPLIANCE_EVIDENCE_REVIEWED",
        entity_type="ComplianceEvidence",
        entity_id=str(evidence.id),
        remarks=f"Evidence #{evidence.id} reviewed as {payload.status} by {current_user.full_name}"
    )

    return {
        "id": evidence.id,
        "assessment_id": evidence.assessment_id,
        "institution_id": evidence.institution_id,
        "document_id": evidence.document_id,
        "document_name": (doc.original_filename or doc.file_name) if doc else None,
        "file_type": doc.file_type if doc else None,
        "evidence_type": evidence.evidence_type,
        "verification_status": evidence.verification_status,
        "verified_by_id": evidence.verified_by_id,
        "verified_by_name": evidence.verified_by.full_name if evidence.verified_by else None,
        "verification_remarks": evidence.verification_remarks,
        "rejection_reason": evidence.rejection_reason,
        "submitted_by_role": evidence.submitted_by_role,
        "submitted_at": evidence.submitted_at,
        "verified_at": evidence.verified_at
    }

# =========================================================================
# 3. CORRECTIVE ACTION PLANS (CAP)
# =========================================================================

@router.get("/caps", response_model=List[CAPResponse])
def list_corrective_action_plans(
    institution_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_officer_id: Optional[int] = None,
    bureau_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CorrectiveActionPlan)
    if institution_id:
        query = query.filter(CorrectiveActionPlan.institution_id == institution_id)
    if status_filter:
        query = query.filter(CorrectiveActionPlan.status == status_filter)
    if assigned_officer_id:
        query = query.filter(CorrectiveActionPlan.assigned_officer_id == assigned_officer_id)
    if bureau_id:
        query = query.filter(CorrectiveActionPlan.responsible_bureau_id == bureau_id)

    caps = query.order_by(CorrectiveActionPlan.prescribed_deadline.asc()).all()
    now = datetime.utcnow()
    results = []
    for c in caps:
        days_rem = round((c.prescribed_deadline - now).total_seconds() / 86400.0, 1)
        is_overdue = days_rem < 0 and c.status not in ["VERIFIED", "CLOSED", "CANCELLED"]
        results.append({
            "id": c.id,
            "institution_id": c.institution_id,
            "institution_name": c.institution.official_name if c.institution else None,
            "assessment_id": c.assessment_id,
            "related_case_id": c.related_case_id,
            "title": c.title,
            "identified_gap": c.identified_gap,
            "required_action": c.required_action,
            "responsible_bureau_id": c.responsible_bureau_id,
            "responsible_bureau_code": c.responsible_bureau.code if c.responsible_bureau else None,
            "assigned_officer_id": c.assigned_officer_id,
            "assigned_officer_name": c.assigned_officer.full_name if c.assigned_officer else None,
            "priority": c.priority,
            "status": c.status,
            "prescribed_deadline": c.prescribed_deadline,
            "completion_evidence_doc_id": c.completion_evidence_doc_id,
            "verification_officer_id": c.verification_officer_id,
            "verification_officer_name": c.verification_officer.full_name if c.verification_officer else None,
            "verification_remarks": c.verification_remarks,
            "closure_decision": c.closure_decision,
            "closed_at": c.closed_at,
            "reopen_reason": c.reopen_reason,
            "is_overdue": is_overdue,
            "days_remaining": days_rem,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })
    return results

@router.post("/caps", response_model=CAPResponse, status_code=status.HTTP_201_CREATED)
def create_corrective_action_plan(
    payload: CAPCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    try:
        cap = create_cap(
            db=db,
            institution_id=payload.institution_id,
            title=payload.title,
            identified_gap=payload.identified_gap,
            required_action=payload.required_action,
            responsible_bureau_id=payload.responsible_bureau_id,
            assigned_officer_id=payload.assigned_officer_id,
            prescribed_deadline=payload.prescribed_deadline,
            creator_user=current_user,
            assessment_id=payload.assessment_id,
            related_case_id=payload.related_case_id,
            priority=payload.priority
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    now = datetime.utcnow()
    days_rem = round((cap.prescribed_deadline - now).total_seconds() / 86400.0, 1)

    return {
        "id": cap.id,
        "institution_id": cap.institution_id,
        "institution_name": cap.institution.official_name if cap.institution else None,
        "assessment_id": cap.assessment_id,
        "related_case_id": cap.related_case_id,
        "title": cap.title,
        "identified_gap": cap.identified_gap,
        "required_action": cap.required_action,
        "responsible_bureau_id": cap.responsible_bureau_id,
        "responsible_bureau_code": cap.responsible_bureau.code if cap.responsible_bureau else None,
        "assigned_officer_id": cap.assigned_officer_id,
        "assigned_officer_name": cap.assigned_officer.full_name if cap.assigned_officer else None,
        "priority": cap.priority,
        "status": cap.status,
        "prescribed_deadline": cap.prescribed_deadline,
        "completion_evidence_doc_id": cap.completion_evidence_doc_id,
        "verification_officer_id": cap.verification_officer_id,
        "verification_officer_name": None,
        "verification_remarks": cap.verification_remarks,
        "closure_decision": cap.closure_decision,
        "closed_at": cap.closed_at,
        "reopen_reason": cap.reopen_reason,
        "is_overdue": False,
        "days_remaining": days_rem,
        "created_at": cap.created_at,
        "updated_at": cap.updated_at
    }

@router.get("/caps/{id}", response_model=CAPResponse)
def get_corrective_action_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == id).first()
    if not cap:
        raise HTTPException(status_code=404, detail=f"CAP #{id} not found.")

    now = datetime.utcnow()
    days_rem = round((cap.prescribed_deadline - now).total_seconds() / 86400.0, 1)
    is_overdue = days_rem < 0 and cap.status not in ["VERIFIED", "CLOSED", "CANCELLED"]

    return {
        "id": cap.id,
        "institution_id": cap.institution_id,
        "institution_name": cap.institution.official_name if cap.institution else None,
        "assessment_id": cap.assessment_id,
        "related_case_id": cap.related_case_id,
        "title": cap.title,
        "identified_gap": cap.identified_gap,
        "required_action": cap.required_action,
        "responsible_bureau_id": cap.responsible_bureau_id,
        "responsible_bureau_code": cap.responsible_bureau.code if cap.responsible_bureau else None,
        "assigned_officer_id": cap.assigned_officer_id,
        "assigned_officer_name": cap.assigned_officer.full_name if cap.assigned_officer else None,
        "priority": cap.priority,
        "status": cap.status,
        "prescribed_deadline": cap.prescribed_deadline,
        "completion_evidence_doc_id": cap.completion_evidence_doc_id,
        "verification_officer_id": cap.verification_officer_id,
        "verification_officer_name": cap.verification_officer.full_name if cap.verification_officer else None,
        "verification_remarks": cap.verification_remarks,
        "closure_decision": cap.closure_decision,
        "closed_at": cap.closed_at,
        "reopen_reason": cap.reopen_reason,
        "is_overdue": is_overdue,
        "days_remaining": days_rem,
        "created_at": cap.created_at,
        "updated_at": cap.updated_at
    }

@router.patch("/caps/{id}", response_model=CAPResponse)
def update_corrective_action_plan(
    id: int,
    payload: CAPUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == id).first()
    if not cap:
        raise HTTPException(status_code=404, detail=f"CAP #{id} not found.")

    if payload.status and payload.status != cap.status:
        try:
            update_cap_status(db=db, cap_id=id, new_status=payload.status, actor_user=current_user, remarks=payload.remarks)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    if payload.title:
        cap.title = payload.title
    if payload.required_action:
        cap.required_action = payload.required_action
    if payload.priority:
        cap.priority = payload.priority

    cap.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cap)

    return get_corrective_action_plan(id=id, db=db, current_user=current_user)

@router.post("/caps/{id}/submit-evidence", response_model=CAPResponse)
def submit_cap_evidence(
    id: int,
    payload: CAPEvidenceSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        cap = submit_cap_completion_evidence(
            db=db,
            cap_id=id,
            document_id=payload.completion_evidence_doc_id,
            remarks=payload.remarks,
            actor_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return get_corrective_action_plan(id=id, db=db, current_user=current_user)

@router.post("/caps/{id}/verify", response_model=CAPResponse)
def verify_cap(
    id: int,
    payload: CAPVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    try:
        cap = verify_and_close_cap(
            db=db,
            cap_id=id,
            verification_remarks=payload.verification_remarks,
            closure_decision=payload.closure_decision,
            reviewer_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return get_corrective_action_plan(id=id, db=db, current_user=current_user)

@router.post("/caps/{id}/reopen", response_model=CAPResponse)
def reopen_closed_cap(
    id: int,
    payload: CAPReopenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head"]))
):
    try:
        cap = reopen_cap(
            db=db,
            cap_id=id,
            reopen_reason=payload.reopen_reason,
            authorizer_user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return get_corrective_action_plan(id=id, db=db, current_user=current_user)

@router.post("/caps/scan-overdue")
def trigger_cap_overdue_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    res = scan_overdue_caps(db=db)
    return {
        "status": "COMPLETED",
        "timestamp": datetime.utcnow().isoformat(),
        **res
    }

# =========================================================================
# 4. SCORECARDS, RISK INTELLIGENCE & GOVERNANCE ANALYTICS
# =========================================================================

@router.get("/institutions/{id}/scorecard", response_model=InstitutionScorecardResponse)
def get_institution_compliance_scorecard(
    id: int,
    assessment_period: str = "AY-2025-26",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        scorecard = calculate_institution_compliance(
            db=db,
            institution_id=id,
            assessment_period=assessment_period
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return scorecard

@router.get("/institutions/{id}/risk", response_model=List[InstitutionalRiskIndicatorResponse])
def get_institution_risk_indicators(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        indicators = evaluate_institution_risk_indicators(db=db, institution_id=id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    inst = db.query(Institution).filter(Institution.id == id).first()
    results = []
    for ind in indicators:
        results.append({
            "id": 1,
            "institution_id": id,
            "institution_name": inst.official_name if inst else None,
            "indicator_type": ind["indicator_type"],
            "severity": ind["severity"],
            "title": ind["title"],
            "supporting_evidence": ind["supporting_evidence"],
            "observation_period": ind["observation_period"],
            "calculation_method": ind["calculation_method"],
            "data_completeness": ind["data_completeness"],
            "recommended_review": ind["recommended_review"],
            "status": "ACTIVE",
            "detected_at": datetime.utcnow()
        })
    return results

@router.get("/institutions/{id}/grievance-performance", response_model=GrievancePerformanceResponse)
def get_institution_grievance_metrics(
    id: int,
    observation_days: int = Query(90, ge=15, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_institution_grievance_performance(db=db, institution_id=id, observation_days=observation_days)

@router.get("/analytics/executive", response_model=ExecutiveGovernanceResponse)
def get_executive_governance_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    return get_executive_governance_analytics(db=db)

# =========================================================================
# 5. COMPLIANCE REGISTRY REPORT EXPORT
# =========================================================================

@router.get("/reports/export")
def export_compliance_registry_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "monitoring_officer"]))
):
    """
    Exports official institutional compliance register to CSV format.
    """
    institutions = db.query(Institution).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Institution ID",
        "Permanent ID",
        "Official Name",
        "Region",
        "State",
        "Institution Type",
        "Compliance Score %",
        "Assessment Coverage %",
        "Risk Tier",
        "Active CAPs",
        "Overdue CAPs",
        "Total Grievances",
        "Evaluation Timestamp"
    ])

    now = datetime.utcnow()
    for inst in institutions:
        card = calculate_institution_compliance(db=db, institution_id=inst.id, assessment_period="AY-2025-26")
        total_cases = db.query(func.count(Case.id)).filter(Case.institution_id == inst.id).scalar() or 0

        writer.writerow([
            inst.id,
            inst.permanent_id,
            inst.official_name,
            inst.region,
            inst.state,
            inst.institution_type,
            card["compliance_percentage"],
            card["assessment_coverage_pct"],
            card["risk_tier"],
            card["active_cap_count"],
            card["overdue_cap_count"],
            total_cases,
            now.strftime("%Y-%m-%d %H:%M:%S")
        ])

    output.seek(0)
    filename = f"nyayaniti_compliance_registry_{now.strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
