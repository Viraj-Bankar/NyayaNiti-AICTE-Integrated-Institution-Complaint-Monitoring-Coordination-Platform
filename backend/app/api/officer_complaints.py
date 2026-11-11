import os
import math
import mimetypes
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_, and_

from app.database import get_db
from app.models.models import (
    Case, CaseEvent, User, Bureau, Institution, Notification,
    CaseAssignment, Complainant, CaseRelationship, DocumentMetadata, AuditLog,
    ComplaintCategory, CaseCoordinationLink, CoordinationWorkspace
)
from app.schemas.schemas import (
    OfficerComplaintItem, OfficerComplaintListResponse,
    OfficerComplaintRejectRequest, OfficerComplaintRequestInfo,
    OfficerComplaintAcceptRequest, OfficerComplaintAssignRequest,
    OfficerComplaintLinkRequest, CaseRelationshipResponse,
    OfficerComplaintResolveRequest, OfficerComplaintCloseRequest
)
from app.api.auth import get_current_user
from app.services.audit_service import log_audit_event, record_case_event
from app.api.cases import PERMITTED_STATUS_TRANSITIONS
from app.api.documents import BASE_STORAGE_DIR
from app.services import storage_service

router = APIRouter(prefix="/officer/complaints", tags=["Officer Complaint Management"])

def verify_officer_role(current_user: User, allowed_roles: Optional[List[str]] = None) -> User:
    """Ensure authenticated caller is an officer and possesses allowed role."""
    officer_roles = ["super_admin", "bureau_head", "authorized_officer", "monitoring_officer"]
    if getattr(current_user, "role", None) not in officer_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized AICTE officers"
        )
    if allowed_roles and current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}"
        )
    return current_user

def check_status_transition(current_status: str, requested_status: str) -> None:
    """Validate requested status transition against permitted statutory state machine."""
    allowed = PERMITTED_STATUS_TRANSITIONS.get(current_status, set())
    if requested_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Statutory transition violation: Cannot move from '{current_status}' to '{requested_status}'. "
                f"Permitted transitions from '{current_status}': {sorted(list(allowed)) or 'None'}"
            )
        )

# -------------------------------------------------------------------------
# Feature 1: Officer Complaint Inbox
# -------------------------------------------------------------------------
@router.get("", response_model=OfficerComplaintListResponse)
def list_officer_complaints(
    q: Optional[str] = Query(None, description="Search by complaint reference, institution name, or subject"),
    status: Optional[str] = Query(None, description="Filter by complaint status"),
    category: Optional[str] = Query(None, description="Filter by complaint category"),
    institution_id: Optional[int] = Query(None, description="Filter by institution ID"),
    unassigned_only: Optional[bool] = Query(False, description="Filter for unassigned intake grievances"),
    citizen_only: Optional[bool] = Query(True, description="Filter for citizen-lodged grievances (default: True)"),
    date_from: Optional[str] = Query(None, description="Filter complaints received on or after YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Filter complaints received on or before YYYY-MM-DD"),
    sort_by: Optional[str] = Query("date_received", description="Sort field: date_received, prescribed_deadline, priority, id"),
    order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_officer_role(current_user)

    query = db.query(Case).join(Institution, Case.institution_id == Institution.id)

    # Citizen complaint filter
    if citizen_only:
        query = query.filter(Case.complainant_id != None)

    # Search filter
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Case.id.ilike(search_term),
                Case.title.ilike(search_term),
                Case.category.ilike(search_term),
                Case.description.ilike(search_term),
                Institution.official_name.ilike(search_term),
                Institution.permanent_id.ilike(search_term)
            )
        )

    # Status filter
    if status:
        query = query.filter(Case.status == status)

    # Category filter
    if category:
        query = query.filter(Case.category == category)

    # Institution filter
    if institution_id:
        query = query.filter(Case.institution_id == institution_id)

    # Unassigned filter
    if unassigned_only:
        query = query.filter(Case.assigned_officer_id == None)

    # Date range filters
    if date_from:
        try:
            df = datetime.fromisoformat(date_from.strip())
            query = query.filter(Case.date_received >= df)
        except Exception:
            pass

    if date_to:
        try:
            dt = datetime.fromisoformat(date_to.strip())
            if len(date_to.strip()) <= 10:
                dt = dt + timedelta(days=1)
            query = query.filter(Case.date_received <= dt)
        except Exception:
            pass

    # Role-based bureau scope:
    # bureau_head and authorized_officer see complaints for their bureau or unassigned PGRC intake
    if current_user.role not in ["super_admin", "monitoring_officer"] and current_user.bureau_id:
        query = query.filter(
            or_(
                Case.current_bureau_id == current_user.bureau_id,
                and_(Case.status == "Submitted", Case.assigned_officer_id == None)
            )
        )

    # Total count
    total = query.count()

    # Sorting
    sort_map = {
        "date_received": Case.date_received,
        "prescribed_deadline": Case.prescribed_deadline,
        "priority": Case.priority_score,
        "id": Case.id
    }
    col = sort_map.get(sort_by, Case.date_received)
    query = query.order_by(asc(col) if order == "asc" else desc(col))

    # Pagination
    offset = (page - 1) * limit
    cases = query.offset(offset).limit(limit).all()
    pages = math.ceil(total / limit) if total > 0 else 1

    items: List[OfficerComplaintItem] = []
    for c in cases:
        doc_count = db.query(func.count(DocumentMetadata.id)).filter(DocumentMetadata.case_id == c.id).scalar() or 0
        items.append(
            OfficerComplaintItem(
                id=c.id,
                title=getattr(c, "title", None) or c.category,
                category=c.category,
                subcategory=c.subcategory,
                institution_id=c.institution_id,
                institution_name=c.institution.official_name if c.institution else "Unknown",
                permanent_id=c.institution.permanent_id if c.institution else "N/A",
                district=c.institution.district if c.institution else "N/A",
                state=c.institution.state if c.institution else "N/A",
                status=c.status,
                priority=c.priority,
                date_received=c.date_received,
                prescribed_deadline=c.prescribed_deadline,
                assigned_officer_id=c.assigned_officer_id,
                assigned_officer_name=c.assigned_officer.full_name if c.assigned_officer else None,
                complainant_masked=c.complainant_masked or "CIT-ANON",
                complainant_type=c.complainant_type or "Student",
                is_citizen_complaint=c.complainant_id is not None,
                documents_count=doc_count
            )
        )

    return OfficerComplaintListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )

# -------------------------------------------------------------------------
# Feature 1b: Intake Metadata (Bureaus, Categories, Rejection Reasons)
# -------------------------------------------------------------------------
@router.get("/metadata", response_model=Dict[str, Any])
def get_officer_complaints_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_officer_role(current_user)

    bureaus = db.query(Bureau).order_by(Bureau.id.asc()).all()
    categories = db.query(ComplaintCategory).filter(ComplaintCategory.is_active == True).order_by(ComplaintCategory.id.asc()).all()

    if not categories:
        from app.api.complainant_cases import CANONICAL_CATEGORIES
        cat_items = [{"id": idx + 1, "name": c, "code": c.upper().replace(" ", "_")[:20]} for idx, c in enumerate(CANONICAL_CATEGORIES)]
    else:
        cat_items = [{"id": c.id, "name": c.name, "code": c.code} for c in categories]

    statutory_rejection_reasons = [
        "Sub-judice Matter (Pending before Court of Law)",
        "Grievance does not fall under AICTE Mandate / Jurisdiction",
        "Commercial / Service Contract Dispute",
        "Anonymous / Vexatious Complaint devoid of substantiation",
        "Matter already disposed of with finality",
        "Other Statutory Ground"
    ]

    return {
        "bureaus": [{"id": b.id, "code": b.code, "name": b.name, "description": b.description} for b in bureaus],
        "categories": cat_items,
        "statutory_rejection_reasons": statutory_rejection_reasons,
        "statuses": [
            "Submitted",
            "Under Review",
            "In Progress",
            "Additional Information Required",
            "Resolved",
            "Closed",
            "Rejected"
        ]
    }

# -------------------------------------------------------------------------
# Feature 2: Complaint Details (Officer View)
# -------------------------------------------------------------------------
@router.get("/{id}", response_model=Dict[str, Any])
def get_officer_complaint_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_officer_role(current_user)

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    # Bureau-level authorization check: non-super_admins can inspect their bureau or intake matters
    if current_user.role not in ["super_admin", "monitoring_officer"] and current_user.bureau_id:
        if c.current_bureau_id != current_user.bureau_id and c.status != "Submitted":
            # Allow assigned officer even if bureau shifted
            if c.assigned_officer_id != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized to access complaint assigned to another bureau"
                )

    # Permission check for verified citizen details:
    # super_admin, bureau_head, or assigned officer sees full contact info; others see masked info
    can_view_pii = (
        current_user.role in ["super_admin", "bureau_head"] or
        c.assigned_officer_id == current_user.id
    )

    complainant_info = None
    if c.complainant_id and can_view_pii:
        comp = db.query(Complainant).filter(Complainant.id == c.complainant_id).first()
        if comp:
            complainant_info = {
                "id": comp.id,
                "full_name": comp.full_name,
                "email": comp.email,
                "mobile": comp.mobile,
                "complainant_type": comp.complainant_type,
                "is_email_verified": comp.is_email_verified,
                "is_mobile_verified": comp.is_mobile_verified,
                "created_at": comp.created_at
            }
    elif c.complainant_id:
        complainant_info = {
            "masked_identifier": c.complainant_masked or "CIT-ANON",
            "complainant_type": c.complainant_type,
            "pii_redacted": True
        }

    # Supporting documents
    documents = [
        {
            "id": d.id,
            "case_id": d.case_id,
            "file_name": d.file_name,
            "original_filename": d.original_filename or d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "access_classification": d.access_classification,
            "uploader_role": d.uploader_role,
            "download_url": f"/api/officer/complaints/{c.id}/documents/{d.id}/download",
            "upload_timestamp": d.upload_timestamp
        }
        for d in c.documents
    ]

    # Public timeline (events where is_public == True)
    public_events = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "actor_name": e.actor_name,
            "new_value": e.new_value,
            "remarks": e.remarks,
            "timestamp": e.timestamp
        }
        for e in c.events if e.is_public
    ]

    # Internal officer notes & audit events (is_public == False)
    internal_notes = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "actor_id": e.actor_id,
            "actor_name": e.actor_name,
            "remarks": e.remarks,
            "timestamp": e.timestamp
        }
        for e in c.events if not e.is_public
    ]

    # Linked / Consolidated cases
    relationships = db.query(CaseRelationship).filter(
        or_(CaseRelationship.case_a_id == c.id, CaseRelationship.case_b_id == c.id)
    ).all()

    linked_cases = []
    for rel in relationships:
        other_id = rel.case_b_id if rel.case_a_id == c.id else rel.case_a_id
        other_case = db.query(Case).filter(Case.id == other_id).first()
        linked_cases.append({
            "id": rel.id,
            "related_case_id": other_id,
            "relationship_type": rel.relationship_type,
            "status": rel.status,
            "similarity_score": rel.similarity_score,
            "title": getattr(other_case, "title", None) or (other_case.category if other_case else "N/A"),
            "institution_name": other_case.institution.official_name if (other_case and other_case.institution) else "Unknown",
            "case_status": other_case.status if other_case else "Unknown",
            "remarks": rel.review_remarks,
            "created_at": rel.created_at
        })

    # Assignments history
    assignments = [
        {
            "id": a.id,
            "from_officer_name": a.from_officer.full_name if a.from_officer else None,
            "to_officer_id": a.to_officer_id,
            "to_officer_name": a.to_officer.full_name if a.to_officer else "Assigned Officer",
            "assigned_by_name": a.assigned_by.full_name if a.assigned_by else "Authority",
            "bureau_code": a.bureau.code if a.bureau else "PGRC",
            "remarks": a.remarks,
            "assigned_at": a.assigned_at
        }
        for a in (c.assignments or [])
    ]

    return {
        "id": c.id,
        "title": getattr(c, "title", None) or c.category,
        "category": c.category,
        "subcategory": c.subcategory,
        "description": c.description,
        "status": c.status,
        "priority": c.priority,
        "priority_score": c.priority_score,
        "date_received": c.date_received,
        "prescribed_deadline": c.prescribed_deadline,
        "current_bureau": {
            "id": c.current_bureau.id if c.current_bureau else None,
            "code": c.current_bureau.code if c.current_bureau else "N/A",
            "name": c.current_bureau.name if c.current_bureau else "N/A"
        },
        "assigned_officer": {
            "id": c.assigned_officer.id if c.assigned_officer else None,
            "full_name": c.assigned_officer.full_name if c.assigned_officer else None,
            "role": c.assigned_officer.role if c.assigned_officer else None
        } if c.assigned_officer else None,
        "institution": {
            "id": c.institution.id if c.institution else None,
            "official_name": c.institution.official_name if c.institution else "Unknown",
            "permanent_id": c.institution.permanent_id if c.institution else "N/A",
            "district": c.institution.district if c.institution else "N/A",
            "state": c.institution.state if c.institution else "N/A",
            "region": c.institution.region if c.institution else "N/A"
        },
        "complainant": complainant_info,
        "documents": documents,
        "public_history": public_events,
        "internal_notes": internal_notes,
        "linked_cases": linked_cases,
        "assignments": assignments,
        "coordination_workspaces": [
            {
                "workspace_id": ws.id,
                "title": ws.title,
                "status": ws.status,
                "primary_bureau_code": ws.primary_bureau.code if ws.primary_bureau else "N/A",
                "linked_at": ws.created_at.isoformat() if getattr(ws, "created_at", None) else None
            }
            for l in db.query(CaseCoordinationLink).filter(CaseCoordinationLink.case_id == c.id).all()
            for ws in [db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == l.workspace_id).first()]
            if ws is not None
        ]
    }

# -------------------------------------------------------------------------
# Feature 3: Review & Validation Operations
# -------------------------------------------------------------------------
@router.post("/{id}/start-review")
def start_complaint_review(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Commence formal preliminary scrutiny on a freshly submitted complaint.
    Transitions status from 'Submitted' to 'Under Review'.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "Under Review":
        return {"message": "Preliminary scrutiny is already underway", "id": c.id, "status": c.status}

    check_status_transition(c.status, "Under Review")

    try:
        prev_status = c.status
        c.status = "Under Review"
        c.last_action = "Preliminary Scrutiny Commenced by Council Officer"
        c.last_action_date = datetime.utcnow()
        c.updated_at = datetime.utcnow()

        # Public milestone
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Under Review",
            remarks="Complaint accepted from intake and entered formal preliminary review",
            is_public=True,
            commit=False
        )

        # Citizen notification
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Complaint Under Review",
                message=f"Your complaint {c.id} has been accepted for formal preliminary review by AICTE PGRC.",
                severity="Info",
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="REVIEW_STARTED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="Under Review",
            remarks=f"Review initiated by {current_user.full_name}",
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Review started successfully", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start review: {str(e)}")

@router.post("/{id}/accept")
def accept_complaint(
    id: str,
    accept_req: OfficerComplaintAcceptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accept complaint into active inquiry docket ('In Progress').
    Optionally updates priority or re-routes bureau.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "In Progress":
        return {"message": "Complaint is already accepted into active inquiry docket", "id": c.id, "status": c.status}

    check_status_transition(c.status, "In Progress")

    try:
        prev_status = c.status
        c.status = "In Progress"
        c.last_action = "Complaint Admitted for Formal Inquiry"
        c.last_action_date = datetime.utcnow()

        if accept_req.priority and accept_req.priority in ["Critical", "High", "Medium", "Low"]:
            c.priority = accept_req.priority

        if accept_req.target_bureau_id:
            target_bureau = db.query(Bureau).filter(Bureau.id == accept_req.target_bureau_id).first()
            if target_bureau:
                c.current_bureau_id = target_bureau.id

        c.updated_at = datetime.utcnow()

        # Public milestone
        public_msg = accept_req.remarks or "Complaint validated and officially admitted for formal inquiry."
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="In Progress",
            remarks=public_msg,
            is_public=True,
            commit=False
        )

        # Citizen notification
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Inquiry In Progress",
                message=f"Your complaint {c.id} has been admitted for formal investigation by AICTE.",
                severity="Info",
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="COMPLAINT_ACCEPTED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="In Progress",
            remarks=accept_req.remarks or "Complaint accepted",
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Complaint accepted for inquiry", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to accept complaint: {str(e)}")

@router.post("/{id}/reject")
def reject_complaint(
    id: str,
    reject_req: OfficerComplaintRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject complaint from redressal docket under statutory non-admissibility grounds.
    Requires mandatory statutory reason and detailed justification.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "Rejected":
        return {"message": "Complaint is already marked as rejected", "id": c.id, "status": c.status}

    check_status_transition(c.status, "Rejected")

    try:
        prev_status = c.status
        c.status = "Rejected"
        c.last_action = f"Grievance Rejected: {reject_req.statutory_reason}"
        c.last_action_date = datetime.utcnow()
        c.updated_at = datetime.utcnow()

        full_rejection_text = f"[Statutory Basis: {reject_req.statutory_reason}] {reject_req.remarks.strip()}"

        # Public milestone
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Rejected",
            remarks=full_rejection_text,
            is_public=True,
            commit=False
        )

        # Citizen notification with high severity
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Complaint Decision: Rejected",
                message=f"Your complaint {c.id} was rejected after statutory scrutiny. Basis: {reject_req.statutory_reason}. Details: {reject_req.remarks}",
                severity="High",
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="COMPLAINT_REJECTED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="Rejected",
            remarks=full_rejection_text,
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Complaint rejected with statutory order", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reject complaint: {str(e)}")

@router.post("/{id}/request-info")
def request_additional_information(
    id: str,
    info_req: OfficerComplaintRequestInfo,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request clarification or supporting documentary proof from the citizen.
    Transitions status to 'Additional Information Required'.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "Additional Information Required":
        return {"message": "Clarification request is already pending with citizen", "id": c.id, "status": c.status}

    check_status_transition(c.status, "Additional Information Required")

    try:
        prev_status = c.status
        c.status = "Additional Information Required"
        c.last_action = "Additional Information Requested from Complainant"
        c.last_action_date = datetime.utcnow()
        c.updated_at = datetime.utcnow()

        public_remarks = f"Council Query: {info_req.query_details.strip()}"
        if info_req.required_documents:
            public_remarks += f" | Required Evidence: {info_req.required_documents.strip()}"
        public_remarks += f" (Response window: {info_req.deadline_days} days)"

        # Public milestone
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Additional Information Required",
            remarks=public_remarks,
            is_public=True,
            commit=False
        )

        # Citizen notification with high severity
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="INFO_REQUESTED",
                related_case_id=c.id,
                title="Action Required: Additional Information Requested",
                message=f"AICTE Council has requested additional information regarding complaint {c.id}: {info_req.query_details}",
                severity="High",
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="CLARIFICATION_REQUESTED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="Additional Information Required",
            remarks=info_req.query_details,
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Clarification request issued to complainant", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to issue clarification request: {str(e)}")

# -------------------------------------------------------------------------
# Feature 4 & 5: Officer Assignment & Reassignment
# -------------------------------------------------------------------------
@router.post("/{id}/assign")
def assign_officer_to_complaint(
    id: str,
    assign_req: OfficerComplaintAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign or reassign an officer to conduct investigation on the complaint.
    Operationalizes immutable CaseAssignment and dispatches officer alert.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    target_officer = db.query(User).filter(
        User.id == assign_req.to_officer_id,
        User.is_active == True
    ).first()
    if not target_officer:
        raise HTTPException(status_code=404, detail="Target officer not found or account deactivated")

    # Verify target officer role
    if target_officer.role not in ["super_admin", "bureau_head", "authorized_officer"]:
        raise HTTPException(
            status_code=400,
            detail="Target user does not possess case investigation permissions"
        )

    try:
        prev_officer_id = c.assigned_officer_id
        prev_name = c.assigned_officer.full_name if c.assigned_officer else "Unassigned (Intake Queue)"
        new_name = target_officer.full_name

        # Create immutable CaseAssignment record
        assignment_entry = CaseAssignment(
            case_id=c.id,
            from_officer_id=prev_officer_id,
            to_officer_id=target_officer.id,
            assigned_by_id=current_user.id,
            bureau_id=assign_req.bureau_id or target_officer.bureau_id or c.current_bureau_id,
            remarks=assign_req.remarks or f"Assigned to {new_name} by {current_user.full_name}",
            assigned_at=datetime.utcnow()
        )
        db.add(assignment_entry)

        # Update Case
        c.assigned_officer_id = target_officer.id
        if assign_req.bureau_id:
            c.current_bureau_id = assign_req.bureau_id

        status_changed = False
        prev_status = c.status
        if c.status == "Submitted":
            c.status = "Under Review"
            status_changed = True

        c.updated_at = datetime.utcnow()

        # Timeline event
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="ASSIGNED",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_name,
            new_value=new_name,
            remarks=assign_req.remarks or f"Assigned to {new_name} for official investigation",
            is_public=False,
            commit=False
        )

        if status_changed:
            record_case_event(
                db=db,
                case_id=c.id,
                event_type="STATUS_CHANGE",
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                previous_value=prev_status,
                new_value="Under Review",
                remarks="Complaint officially allocated from intake and entered preliminary review",
                is_public=True,
                commit=False
            )
            if c.complainant_id:
                c_notif = Notification(
                    recipient_id=None,
                    complainant_id=c.complainant_id,
                    notification_type="STATUS_UPDATE",
                    related_case_id=c.id,
                    title="Complaint Allocated for Review",
                    message=f"Your complaint {c.id} has been allocated to an investigating officer.",
                    severity="Info",
                    link_url=f"/complainant/cases/{c.id}"
                )
                db.add(c_notif)

        # In-app notification for assigned officer
        off_notif = Notification(
            recipient_id=target_officer.id,
            complainant_id=None,
            notification_type="CASE_ASSIGNED",
            related_case_id=c.id,
            title="Grievance Allocated to You",
            message=f"Grievance {c.id} ({c.category} - {c.institution.official_name}) has been allocated to you by {current_user.full_name}.",
            severity="High",
            is_read=False,
            link_url=f"/cases/{c.id}"
        )
        db.add(off_notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="CASE_ASSIGNMENT" if not prev_officer_id else "CASE_REASSIGNMENT",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_name,
            new_value=new_name,
            remarks=assign_req.remarks or f"Assigned to {new_name}",
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {
            "message": f"Officer assigned successfully to {new_name}",
            "id": c.id,
            "assigned_officer_id": target_officer.id,
            "assigned_officer_name": new_name,
            "status": c.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign officer: {str(e)}")

# -------------------------------------------------------------------------
# Feature 4: Complaint-to-Case Integration (Consolidation / Linkage)
# -------------------------------------------------------------------------
@router.post("/{id}/link-case", response_model=CaseRelationshipResponse)
def link_complaint_to_case(
    id: str,
    link_req: OfficerComplaintLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consolidate or link two grievances/cases into a shared dossier.
    Maintains zero duplication while preserving individual citizen ownership.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])

    case_a = db.query(Case).filter(Case.id == id).first()
    if not case_a:
        raise HTTPException(status_code=404, detail="Primary complaint record not found")

    case_b = db.query(Case).filter(Case.id == link_req.target_case_id).first()
    if not case_b:
        raise HTTPException(status_code=404, detail="Target case to link not found")

    if case_a.id == case_b.id:
        raise HTTPException(status_code=400, detail="Cannot link a case to itself")

    # Check for existing relationship
    existing = db.query(CaseRelationship).filter(
        or_(
            and_(CaseRelationship.case_a_id == case_a.id, CaseRelationship.case_b_id == case_b.id),
            and_(CaseRelationship.case_a_id == case_b.id, CaseRelationship.case_b_id == case_a.id)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"Cases are already linked as '{existing.relationship_type}'")

    try:
        rel = CaseRelationship(
            case_a_id=case_a.id,
            case_b_id=case_b.id,
            relationship_type=link_req.relationship_type,
            status="Active",
            reviewer_id=current_user.id,
            review_remarks=link_req.remarks or f"Consolidated by {current_user.full_name}",
            decided_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(rel)

        # Internal case events on both matters
        record_case_event(
            db=db,
            case_id=case_a.id,
            event_type="LINKED_CASE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            new_value=case_b.id,
            remarks=f"Matter linked with {case_b.id} ({link_req.relationship_type}). Remarks: {link_req.remarks or 'Consolidated for joint inquiry'}",
            is_public=False,
            commit=False
        )

        record_case_event(
            db=db,
            case_id=case_b.id,
            event_type="LINKED_CASE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            new_value=case_a.id,
            remarks=f"Matter linked from {case_a.id} ({link_req.relationship_type}). Remarks: {link_req.remarks or 'Consolidated for joint inquiry'}",
            is_public=False,
            commit=False
        )

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="CASE_LINKED",
            entity_type="CaseRelationship",
            entity_id=f"{case_a.id}<->{case_b.id}",
            remarks=f"Linked as {link_req.relationship_type}. {link_req.remarks or ''}",
            commit=False
        )

        db.commit()
        db.refresh(rel)

        return CaseRelationshipResponse(
            id=rel.id,
            case_a_id=rel.case_a_id,
            case_b_id=rel.case_b_id,
            related_case_id=case_b.id,
            relationship_type=rel.relationship_type,
            status=rel.status,
            similarity_score=rel.similarity_score,
            title=getattr(case_b, "title", None) or case_b.category,
            institution_name=case_b.institution.official_name if case_b.institution else "Unknown",
            case_status=case_b.status,
            remarks=rel.review_remarks,
            created_at=rel.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to link cases: {str(e)}")

# -------------------------------------------------------------------------
# Feature 6: Resolution and Closure Operations
# -------------------------------------------------------------------------
@router.post("/{id}/resolve")
def resolve_complaint(
    id: str,
    resolve_req: OfficerComplaintResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Formally resolve an active complaint docket.
    Transitions status from 'In Progress' to 'Resolved' and dispatches resolution directive notification.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head", "authorized_officer"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "Resolved":
        return {"message": "Complaint is already marked as resolved", "id": c.id, "status": c.status}

    check_status_transition(c.status, "Resolved")

    try:
        prev_status = c.status
        c.status = "Resolved"
        c.last_action = "Formal Resolution Directive Issued by Council"
        c.last_action_date = datetime.utcnow()
        c.updated_at = datetime.utcnow()

        public_msg = resolve_req.resolution_findings.strip()
        if resolve_req.action_taken:
            public_msg += f" | Action Enforced: {resolve_req.action_taken.strip()}"

        # Public milestone
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Resolved",
            remarks=public_msg,
            is_public=True,
            commit=False
        )

        # Citizen notification
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Complaint Decision: Resolved",
                message=f"Your complaint {c.id} has been formally resolved by AICTE PGRC. Findings: {resolve_req.resolution_findings}",
                severity="Info",
                is_read=False,
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="COMPLAINT_RESOLVED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="Resolved",
            remarks=public_msg,
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Complaint formally resolved", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to resolve complaint: {str(e)}")

@router.post("/{id}/close")
def close_complaint(
    id: str,
    close_req: Optional[OfficerComplaintCloseRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Formally close a resolved or evaluated complaint docket.
    Transitions status to 'Closed'.
    """
    verify_officer_role(current_user, ["super_admin", "bureau_head"])

    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if c.status == "Closed":
        return {"message": "Complaint is already closed", "id": c.id, "status": c.status}

    check_status_transition(c.status, "Closed")

    try:
        prev_status = c.status
        c.status = "Closed"
        c.last_action = "Complaint Docket Formally Closed"
        c.last_action_date = datetime.utcnow()
        c.updated_at = datetime.utcnow()

        closure_text = (close_req.closure_remarks.strip() if (close_req and close_req.closure_remarks) else "Grievance redressal process completed and matter closed.")

        # Public milestone
        record_case_event(
            db=db,
            case_id=c.id,
            event_type="STATUS_CHANGE",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            previous_value=prev_status,
            new_value="Closed",
            remarks=closure_text,
            is_public=True,
            commit=False
        )

        # Citizen notification
        if c.complainant_id:
            notif = Notification(
                recipient_id=None,
                complainant_id=c.complainant_id,
                notification_type="STATUS_UPDATE",
                related_case_id=c.id,
                title="Complaint Closed",
                message=f"Your complaint {c.id} has been formally closed by AICTE.",
                severity="Info",
                is_read=False,
                link_url=f"/complainant/cases/{c.id}"
            )
            db.add(notif)

        # Security audit
        log_audit_event(
            db=db,
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            event_type="COMPLAINT_CLOSED",
            entity_type="Case",
            entity_id=c.id,
            previous_value=prev_status,
            new_value="Closed",
            remarks=closure_text,
            commit=False
        )

        db.commit()
        db.refresh(c)
        return {"message": "Complaint docket closed", "id": c.id, "status": c.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to close complaint: {str(e)}")

# -------------------------------------------------------------------------
# Feature 7: Secure Document Streaming & Access Controls
# -------------------------------------------------------------------------
@router.get("/{id}/documents/{document_id}/download")
def download_complaint_document(
    id: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stream attached evidence securely to authorized officers without public URL exposure.
    Enforces document classification levels (e.g. Confidential - Bureau Head Only).
    """
    verify_officer_role(current_user)

    doc = db.query(DocumentMetadata).filter(
        DocumentMetadata.id == document_id,
        DocumentMetadata.case_id == id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document metadata record not found for this complaint")

    # Confidentiality check
    if doc.access_classification == "Confidential - Bureau Head Only":
        if current_user.role not in ["super_admin", "bureau_head"]:
            raise HTTPException(
                status_code=403,
                detail="Access restricted: Document is classified as Confidential - Bureau Head Only"
            )

    # Resolve document payload (database BYTEA or legacy filesystem)
    try:
        payload = storage_service.retrieve_document_payload(doc, db)
    except RuntimeError as err:
        raise HTTPException(status_code=500, detail=str(err))

    if not payload:
        raise HTTPException(status_code=404, detail="Document file missing from storage repository")

    return storage_service.create_download_response(payload)

