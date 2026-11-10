import os
import re
import uuid
import random
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.database import get_db
from app.models.models import (
    Case, CaseEvent, Institution, Bureau, Complainant,
    DocumentMetadata, Notification, ComplaintCategory, OverlapAlert
)
from app.schemas.schemas import (
    ComplainantCaseCreate, ComplainantCaseResponse, ComplainantCaseDetailResponse,
    ComplainantInstitutionItem, ComplainantCategoryItem, ComplainantDocumentResponse,
    ComplainantReceiptResponse, ComplainantNotificationItem, ComplainantCaseEventItem,
    ComplainantClarificationRequest
)
from app.api.complainant_auth import get_current_complainant
from app.services.audit_service import log_audit_event, record_case_event
from app.services.priority_engine import evaluate_case_priority
from app.services.matching_engine import compute_similarity
from app.config import settings

# Primary complaints router as requested
complaints_router = APIRouter(prefix="/complainant/complaints", tags=["Complainant Complaints"])
# Existing router kept for full backward compatibility
router = APIRouter(prefix="/complainant/cases", tags=["Complainant Cases (Legacy Alias)"])
# Directory and notifications routers
notification_router = APIRouter(prefix="/complainant/notifications", tags=["Complainant Notifications"])
citizen_directory_router = APIRouter(prefix="/complainant", tags=["Complainant Directory"])

# Storage configuration (Supports Render Persistent Disk via centralized storage service)
from app.services import storage_service

DEFAULT_STORAGE_DIR = storage_service.get_storage_root()
BASE_STORAGE_DIR = storage_service.get_storage_root()
os.makedirs(BASE_STORAGE_DIR, exist_ok=True)

# Whitelist of canonical complaint categories
CANONICAL_CATEGORIES = [
    "Academic Issues",
    "Examination and Results",
    "Admission and Enrollment",
    "Fees and Financial Issues",
    "Infrastructure and Facilities",
    "Administrative Issues",
    "Faculty and Staff Related Issues",
    "Student Welfare",
    "Harassment and Discrimination",
    "Other",
    # Statutory aliases
    "Fee Overcharging & Refund Denial",
    "Anti-Ragging Non-Compliance",
    "Faculty Irregularity & Biometric Deficit",
    "Certificate & Document Withholding",
    "Infrastructure Deficit & Lab Equipment Shortage",
    "Admission Irregularity & Capitation Fee"
]

# Magic bytes mapping for content inspection
MAGIC_BYTES = {
    "pdf": [b"%PDF"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "docx": [b"PK\x03\x04"]  # Zip container header for docx
}

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream"
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def serialize_complainant_case(c: Case) -> dict:
    return {
        "id": c.id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.official_name if c.institution else "AICTE Approved Institution",
        "permanent_id": c.institution.permanent_id if c.institution else "N/A",
        "title": getattr(c, "title", None) or c.category,
        "category": c.category,
        "subcategory": c.subcategory,
        "description": c.description,
        "date_received": c.date_received,
        "status": c.status,
        "priority": getattr(c, "priority", "Medium"),
        "bureau_code": c.current_bureau.code if c.current_bureau else "PGRC",
        "last_action": c.last_action,
        "last_action_date": c.last_action_date,
        "prescribed_deadline": c.prescribed_deadline,
        "created_at": c.created_at
    }


def validate_file_content(contents: bytes, ext: str):
    """
    Validate that file contents begin with valid magic bytes matching the file extension.
    """
    ext = ext.lower()
    if ext not in MAGIC_BYTES:
        return True  # If no magic bytes defined, skip
    expected_headers = MAGIC_BYTES[ext]
    for header in expected_headers:
        if contents.startswith(header):
            return True
    return False


# -------------------------------------------------------------------------
# 1. Institution Directory (Complainant Scoped)
# -------------------------------------------------------------------------
def _list_complainant_institutions(
    q: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    query = db.query(Institution)
    if q:
        search_term = q.strip()
        search_filter = (
            (Institution.permanent_id.ilike(f"%{search_term}%")) |
            (Institution.official_name.ilike(f"%{search_term}%")) |
            (Institution.city.ilike(f"%{search_term}%"))
        )
        query = query.filter(search_filter)
    if state:
        query = query.filter(Institution.state == state)

    return query.limit(100).all()

@complaints_router.get("/institutions", response_model=List[ComplainantInstitutionItem])
def get_complaint_institutions(
    q: Optional[str] = Query(None, description="Search by Permanent ID, name, or city"),
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_complainant_institutions(q=q, state=state, db=db, current_complainant=current_complainant)

@router.get("/institutions", response_model=List[ComplainantInstitutionItem])
@citizen_directory_router.get("/institutions", response_model=List[ComplainantInstitutionItem])
def list_complainant_institutions_alias(
    q: Optional[str] = Query(None, description="Search by Permanent ID, name, or city"),
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_complainant_institutions(q=q, state=state, db=db, current_complainant=current_complainant)


# -------------------------------------------------------------------------
# 2. Configurable Grievance Categories
# -------------------------------------------------------------------------
def _list_complainant_categories(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    categories = db.query(ComplaintCategory).filter(
        ComplaintCategory.is_active == True
    ).order_by(ComplaintCategory.id.asc()).all()

    if not categories:
        # Fallback to statutory seeded categories
        from app.seed_data import seed_complaint_categories
        seed_complaint_categories(db)
        categories = db.query(ComplaintCategory).filter(
            ComplaintCategory.is_active == True
        ).order_by(ComplaintCategory.id.asc()).all()

    return categories

@complaints_router.get("/categories", response_model=List[ComplainantCategoryItem])
def get_complaint_categories(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_complainant_categories(db=db, current_complainant=current_complainant)

@router.get("/categories", response_model=List[ComplainantCategoryItem])
@citizen_directory_router.get("/categories", response_model=List[ComplainantCategoryItem])
def list_complainant_categories_alias(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_complainant_categories(db=db, current_complainant=current_complainant)


# -------------------------------------------------------------------------
# 3. List Complainant's Grievances (Scoped, Paginated, Filtered, Sorted)
# -------------------------------------------------------------------------
def _list_my_complaints(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    category: Optional[str] = None,
    sort_order: str = "desc",
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve complaints belonging strictly to the logged-in citizen.
    Supports pagination, filtering by status and category, sorting by date, and text search.
    Zero internal officer notes are exposed.
    """
    query = db.query(Case).filter(Case.complainant_id == current_complainant.id)

    if status and status.strip().lower() != "all":
        query = query.filter(Case.status.ilike(status.strip()))

    if category and category.strip().lower() != "all":
        query = query.filter(Case.category.ilike(category.strip()))

    if q:
        term = q.strip()
        query = query.filter(
            or_(
                Case.id.ilike(f"%{term}%"),
                Case.title.ilike(f"%{term}%"),
                Case.category.ilike(f"%{term}%"),
                Case.description.ilike(f"%{term}%")
            )
        )

    # Sort order
    if sort_order.lower() == "asc":
        query = query.order_by(asc(Case.date_received))
    else:
        query = query.order_by(desc(Case.date_received))

    cases = query.offset(skip).limit(limit).all()
    return [serialize_complainant_case(c) for c in cases]

@complaints_router.get("", response_model=List[ComplainantCaseResponse])
def list_complaints(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. Submitted, Under Process, Disposed)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort by submission timestamp"),
    q: Optional[str] = Query(None, description="Search query across reference ID, title, category, description"),
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_my_complaints(
        skip=skip, limit=limit, status=status, category=category,
        sort_order=sort_order, q=q, db=db, current_complainant=current_complainant
    )

@router.get("", response_model=List[ComplainantCaseResponse])
def list_my_complaints_alias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    sort_order: str = "desc",
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _list_my_complaints(
        skip=skip, limit=limit, status=status, category=category,
        sort_order=sort_order, q=q, db=db, current_complainant=current_complainant
    )


# -------------------------------------------------------------------------
# 4. Grievance Detail & Permitted Public Status History
# -------------------------------------------------------------------------
def _get_my_complaint_detail(
    complaint_id: str,
    db: Session,
    current_complainant: Complainant
):
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    data = serialize_complainant_case(case)

    # Expose only sanitized public milestone events
    data["events"] = [
        {
            "id": getattr(e, "id", None),
            "event_type": e.event_type,
            "previous_value": e.previous_value,
            "new_value": e.new_value,
            "remarks": e.remarks or "Milestone recorded by administrative bureau.",
            "timestamp": e.timestamp
        }
        for e in case.events
        if getattr(e, "is_public", True) is True and e.event_type not in [
            "OVERLAP_INTERNAL", "CONFLICT_INTERNAL", "BUREAU_INTERNAL_NOTE",
            "INTERNAL_NOTE", "INTERNAL_OBSERVATION", "ASSIGNMENT"
        ]
    ]

    # Expose citizen-accessible documents
    docs = db.query(DocumentMetadata).filter(
        DocumentMetadata.case_id == case.id,
        or_(
            DocumentMetadata.uploaded_by_complainant_id == current_complainant.id,
            DocumentMetadata.access_classification == "Public"
        )
    ).order_by(DocumentMetadata.upload_timestamp.desc()).all()

    data["documents"] = [
        {
            "id": d.id,
            "case_id": d.case_id,
            "file_name": d.file_name,
            "original_filename": d.original_filename or d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "upload_timestamp": d.upload_timestamp
        }
        for d in docs
    ]

    return data

@complaints_router.get("/{complaint_id}", response_model=ComplainantCaseDetailResponse)
def get_complaint_detail(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_my_complaint_detail(complaint_id, db, current_complainant)

@router.get("/{case_id}", response_model=ComplainantCaseDetailResponse)
def get_my_complaint_detail_alias(
    case_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_my_complaint_detail(case_id, db, current_complainant)


# -------------------------------------------------------------------------
# 5. Complaint Status History Timeline
# -------------------------------------------------------------------------
def _get_complaint_history(
    complaint_id: str,
    db: Session,
    current_complainant: Complainant
):
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    public_events = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "previous_value": e.previous_value,
            "new_value": e.new_value,
            "remarks": e.remarks or "Milestone recorded by administrative bureau.",
            "timestamp": e.timestamp
        }
        for e in case.events
        if getattr(e, "is_public", True) is True and e.event_type not in [
            "OVERLAP_INTERNAL", "CONFLICT_INTERNAL", "BUREAU_INTERNAL_NOTE",
            "INTERNAL_NOTE", "INTERNAL_OBSERVATION", "ASSIGNMENT"
        ]
    ]

    return sorted(public_events, key=lambda x: x["timestamp"])

@complaints_router.get("/{complaint_id}/history", response_model=List[ComplainantCaseEventItem])
def get_complaint_history(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve the citizen-visible status progression timeline.
    Strictly filters out internal officer deliberations and verifies ownership.
    """
    return _get_complaint_history(complaint_id, db, current_complainant)

@router.get("/{case_id}/history", response_model=List[ComplainantCaseEventItem])
def get_case_history_alias(
    case_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_complaint_history(case_id, db, current_complainant)


# -------------------------------------------------------------------------
# 6. File / Submit a New Complaint
# -------------------------------------------------------------------------
def _file_complaint(
    case_in: ComplainantCaseCreate,
    db: Session,
    current_complainant: Complainant
):
    # 1. Institution Existence & Active-Status Validation
    inst = db.query(Institution).filter(Institution.id == case_in.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Selected technical institution not found in AICTE registry.")
    if getattr(inst, "verification_status", None) in ("Deregistered", "Defunct"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected institution is currently inactive or deregistered in AICTE registry."
        )

    # 2. Category Validation
    cat_record = db.query(ComplaintCategory).filter(
        (ComplaintCategory.name == case_in.category) | (ComplaintCategory.code == case_in.category)
    ).first()
    if not cat_record and case_in.category not in CANONICAL_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid complaint category '{case_in.category}'. Please select an approved statutory category."
        )

    # 3. Duplicate Submission Safeguard (5-minute identical submission window)
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    recent_dup = db.query(Case).filter(
        Case.complainant_id == current_complainant.id,
        Case.institution_id == case_in.institution_id,
        Case.category == case_in.category,
        Case.description == case_in.description.strip(),
        Case.date_received >= five_min_ago
    ).first()
    if recent_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate complaint detected. An identical complaint has already been submitted under reference {recent_dup.id} within the last 5 minutes."
        )

    pgrc_bureau = db.query(Bureau).filter(Bureau.code == "PGRC").first()
    if not pgrc_bureau:
        pgrc_bureau = db.query(Bureau).first()

    # 4. Generate unique, non-sequential public reference number
    year = datetime.utcnow().year
    case_id = None
    for _ in range(15):
        rand_seq = random.randint(1000, 9999)
        candidate_id = f"AICTE-PGRC-{year}-{rand_seq}"
        if not db.query(Case).filter(Case.id == candidate_id).first():
            case_id = candidate_id
            break
    if not case_id:
        case_id = f"AICTE-PGRC-{year}-{uuid.uuid4().hex[:6].upper()}"

    now = datetime.utcnow()
    sla_days = cat_record.sla_days if cat_record else settings.SLA_MEDIUM_DAYS
    deadline = now + timedelta(days=sla_days)

    masked_name = f"{current_complainant.full_name[:2].upper()}*** (Citizen ID #{current_complainant.id})"
    title = (case_in.title or f"{case_in.category} - {inst.official_name}").strip()

    # 5. Create Complaint with initial status 'Submitted'
    new_case = Case(
        id=case_id,
        institution_id=case_in.institution_id,
        complainant_id=current_complainant.id,
        complainant_type=current_complainant.complainant_type or "Student",
        complainant_masked=masked_name,
        title=title,
        category=case_in.category,
        subcategory=case_in.subcategory,
        description=case_in.description.strip(),
        date_received=now,
        status="Submitted",
        current_bureau_id=pgrc_bureau.id,
        assigned_officer_id=None,
        priority="Medium",
        priority_score=50.0,
        prescribed_deadline=deadline,
        last_action="Grievance Lodged in Central AICTE Portal",
        last_action_date=now,
        next_action="Bureau Verification & Officer Allocation",
        overlap_review_status="None",
        action_conflict_status="None"
    )

    # 6. Evaluate statutory priority score
    prio, score, factors = evaluate_case_priority(new_case)
    new_case.priority = prio
    new_case.priority_score = score
    new_case.priority_factors = factors

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # 7. Record initial status history event (Publicly visible)
    record_case_event(
        db=db,
        case_id=new_case.id,
        event_type="SUBMITTED",
        actor_id=None,
        actor_name=current_complainant.full_name,
        remarks=f"Citizen {current_complainant.full_name} submitted grievance under category '{new_case.category}'"
    )

    # 8. Statutory audit logging
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

    # 9. AI Candidate Overlap Scan against same institution
    try:
        existing_cases = (
            db.query(Case)
            .filter(Case.institution_id == new_case.institution_id, Case.id != new_case.id)
            .all()
        )
        for other_c in existing_cases:
            sim_score, model_name, evidence = compute_similarity(
                new_case.description,
                other_c.description,
                new_case.category,
                other_c.category
            )
            if sim_score >= settings.OVERLAP_REVIEW_THRESHOLD:
                alert = OverlapAlert(
                    case_a_id=other_c.id,
                    case_b_id=new_case.id,
                    institution_id=inst.id,
                    similarity_score=sim_score,
                    model_name=model_name,
                    evidence_summary=evidence,
                    review_status="New"
                )
                db.add(alert)
                new_case.overlap_review_status = "New"
                other_c.overlap_review_status = "New"
        db.commit()
    except Exception as e:
        print(f"Overlap scan note: {e}")

    # 10. Citizen confirmation notification
    try:
        notif = Notification(
            recipient_id=None,
            complainant_id=current_complainant.id,
            notification_type="STATUS_UPDATE",
            related_case_id=new_case.id,
            title="Grievance Lodged Successfully",
            message=f"Your grievance {new_case.id} regarding '{new_case.title}' has been submitted to AICTE PGRC.",
            severity="Info",
            is_read=False,
            link_url=f"/complainant/cases/{new_case.id}"
        )
        db.add(notif)
        
        # 11. Internal officer intake alert for PGRC bureau
        officer_notif = Notification(
            recipient_id=None,
            complainant_id=None,
            notification_type="NEW_GRIEVANCE_SUBMITTED",
            related_case_id=new_case.id,
            related_entity_type="Case",
            related_entity_id=new_case.id,
            title="New Grievance Awaiting Intake Scrutiny",
            message=f"Grievance {new_case.id} submitted for {inst.official_name} under '{new_case.category}'. Awaiting officer allocation.",
            severity="Medium",
            is_read=False,
            link_url=f"/cases/{new_case.id}"
        )
        db.add(officer_notif)
        db.commit()
    except Exception as e:
        print(f"Notification creation note: {e}")

    return serialize_complainant_case(new_case)

@complaints_router.post("", response_model=ComplainantCaseResponse, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    case_in: ComplainantCaseCreate,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Submit a new institutional grievance as an authenticated citizen.
    Automatically anchors to AICTE Permanent Institution ID, generates a collision-safe
    public reference number, runs priority & overlap scans, and records statutory status history.
    """
    return _file_complaint(case_in, db, current_complainant)

@router.post("", response_model=ComplainantCaseResponse, status_code=status.HTTP_201_CREATED)
def file_complaint_alias(
    case_in: ComplainantCaseCreate,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _file_complaint(case_in, db, current_complainant)


# -------------------------------------------------------------------------
# 7. Secure Supporting Evidence Upload & Download
# -------------------------------------------------------------------------
async def _upload_complainant_document(
    complaint_id: str,
    file: UploadFile,
    category: str,
    db: Session,
    current_complainant: Complainant
):
    # Path traversal protection on reference ID
    if not re.match(r"^[A-Za-z0-9\-_]+$", complaint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid complaint reference identifier."
        )

    # 1. Ownership check (Anti-IDOR)
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    # 2. Read contents with real-time stream size enforcement
    try:
        contents = await storage_service.read_upload_stream(file)
    except ValueError as ve:
        if "exceeds maximum permitted limit" in str(ve).lower():
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=str(ve)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    # 3. Comprehensive upload validation and unified transactional storage (BYTEA or Filesystem)
    try:
        doc = storage_service.store_uploaded_document(
            db=db,
            case_id=case.id,
            file_data=contents,
            original_filename=file.filename or "evidence.pdf",
            category=category,
            access_classification="Public",
            uploaded_by_id=None,
            uploaded_by_complainant_id=current_complainant.id,
            uploader_role="complainant",
            content_type=file.content_type
        )
    except ValueError as ve:
        if "exceeds maximum permitted limit" in str(ve).lower():
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=str(ve)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    try:
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database transaction failed during document upload."
        )

    # 9. Case event & audit log
    evidence_name = doc.original_filename or doc.file_name
    record_case_event(
        db=db,
        case_id=case.id,
        event_type="DOCUMENT_ATTACHED",
        actor_id=None,
        actor_name=current_complainant.full_name,
        remarks=f"Complainant attached supporting evidence '{evidence_name}' ({category})",
        document_ref=doc.file_name
    )

    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=current_complainant.full_name,
        actor_role="complainant",
        event_type="DOCUMENT_UPLOAD",
        entity_type="DocumentMetadata",
        entity_id=str(doc.id),
        remarks=f"Citizen uploaded evidence {evidence_name} for complaint {case.id}"
    )

    return doc

@complaints_router.post("/{complaint_id}/documents", response_model=ComplainantDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_complaint_document(
    complaint_id: str,
    file: UploadFile = File(...),
    category: str = Form("Complainant Evidence"),
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return await _upload_complainant_document(complaint_id, file, category, db, current_complainant)

@router.post("/{case_id}/documents", response_model=ComplainantDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_complainant_document_alias(
    case_id: str,
    file: UploadFile = File(...),
    category: str = Form("Complainant Evidence"),
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return await _upload_complainant_document(case_id, file, category, db, current_complainant)


# -------------------------------------------------------------------------
# 8. List & Download Grievance Evidence Documents
# -------------------------------------------------------------------------
def _get_complainant_documents(
    complaint_id: str,
    db: Session,
    current_complainant: Complainant
):
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    docs = db.query(DocumentMetadata).filter(
        DocumentMetadata.case_id == complaint_id,
        or_(
            DocumentMetadata.uploaded_by_complainant_id == current_complainant.id,
            DocumentMetadata.access_classification == "Public"
        )
    ).order_by(DocumentMetadata.upload_timestamp.desc()).all()

    return docs

@complaints_router.get("/{complaint_id}/documents", response_model=List[ComplainantDocumentResponse])
def get_complaint_documents(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_complainant_documents(complaint_id, db, current_complainant)

@router.get("/{case_id}/documents", response_model=List[ComplainantDocumentResponse])
def get_complainant_documents_alias(
    case_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_complainant_documents(case_id, db, current_complainant)


@complaints_router.get("/{complaint_id}/documents/{document_id}/download")
@router.get("/{complaint_id}/documents/{document_id}/download")
def download_complaint_document(
    complaint_id: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Securely download an evidentiary document.
    Enforces ownership and safe attachment response headers without exposing file system paths.
    """
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Complaint record not found or access unauthorized.")

    doc = db.query(DocumentMetadata).filter(
        DocumentMetadata.id == document_id,
        DocumentMetadata.case_id == complaint_id,
        or_(
            DocumentMetadata.uploaded_by_complainant_id == current_complainant.id,
            DocumentMetadata.access_classification == "Public"
        )
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Requested document not found or access unauthorized.")

    payload = storage_service.retrieve_document_payload(doc, db)

    if not payload:
        raise HTTPException(status_code=404, detail="Stored document file could not be retrieved.")

    return storage_service.create_download_response(payload)


# -------------------------------------------------------------------------
# 9. Official Acknowledgment Receipt
# -------------------------------------------------------------------------
def _get_complainant_receipt(
    complaint_id: str,
    db: Session,
    current_complainant: Complainant
):
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    inst = case.institution
    address_str = f"{inst.address}, {inst.city}, {inst.state}" if inst else "N/A"
    if inst and inst.pincode:
        address_str += f" - {inst.pincode}"

    return {
        "case_id": case.id,
        "complainant_name": current_complainant.full_name,
        "complainant_email": current_complainant.email,
        "complainant_mobile": current_complainant.mobile,
        "complainant_type": current_complainant.complainant_type or "Student",
        "institution_name": inst.official_name if inst else "AICTE Institution",
        "permanent_id": inst.permanent_id if inst else "N/A",
        "institution_address": address_str,
        "title": getattr(case, "title", None) or case.category,
        "category": case.category,
        "subcategory": case.subcategory,
        "description": case.description,
        "date_received": case.date_received,
        "prescribed_deadline": case.prescribed_deadline,
        "status": case.status,
        "priority": getattr(case, "priority", "Medium"),
        "bureau_name": case.current_bureau.name if case.current_bureau else "Public Grievance Redressal Cell",
        "tracking_url": f"/complainant/cases/{case.id}"
    }

@complaints_router.get("/{complaint_id}/receipt", response_model=ComplainantReceiptResponse)
def get_complaint_receipt(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_complainant_receipt(complaint_id, db, current_complainant)

@router.get("/{case_id}/receipt", response_model=ComplainantReceiptResponse)
def get_complainant_receipt_alias(
    case_id: str,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _get_complainant_receipt(case_id, db, current_complainant)


# -------------------------------------------------------------------------
# 10. Citizen Notifications
# -------------------------------------------------------------------------
@notification_router.get("", response_model=List[ComplainantNotificationItem])
@citizen_directory_router.get("/notifications", response_model=List[ComplainantNotificationItem])
def get_complainant_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve real-time milestone notifications for the authenticated citizen.
    """
    query = db.query(Notification).filter(
        Notification.complainant_id == current_complainant.id
    ).order_by(Notification.created_at.desc())

    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.limit(50).all()


@notification_router.patch("/{id}/read")
@citizen_directory_router.patch("/notifications/{id}/read")
def mark_complainant_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Mark citizen notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.complainant_id == current_complainant.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": notif.id}


@notification_router.patch("/mark-all-read")
@citizen_directory_router.patch("/notifications/mark-all-read")
def mark_all_complainant_notifications_read(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Mark all unread notifications for the authenticated citizen as read.
    """
    unread = db.query(Notification).filter(
        Notification.complainant_id == current_complainant.id,
        Notification.is_read == False
    ).all()
    for n in unread:
        n.is_read = True
    db.commit()
    return {"message": "All notifications marked as read", "count": len(unread)}


@notification_router.get("/unread-count")
@citizen_directory_router.get("/notifications/unread-count")
def get_complainant_unread_notif_count(
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Retrieve real-time unread notification count.
    """
    count = db.query(Notification).filter(
        Notification.complainant_id == current_complainant.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


# -------------------------------------------------------------------------
# 11. Additional Information / Clarification Submission Workflow
# -------------------------------------------------------------------------
def _submit_complaint_clarification(
    complaint_id: str,
    req: ComplainantClarificationRequest,
    db: Session,
    current_complainant: Complainant
):
    """
    Enable citizens to respond to an officer's information request.
    Validates ownership, ensures case is in 'Additional Information Required',
    transitions case back to 'Under Review', creates public case event,
    records audit log, and alerts assigned officers.
    """
    # 1. Anti-IDOR ownership verification
    case = db.query(Case).filter(
        Case.id == complaint_id,
        Case.complainant_id == current_complainant.id
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint record not found or access unauthorized."
        )

    # 2. Permitted status verification
    if case.status != "Additional Information Required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clarification can only be submitted when complaint status is 'Additional Information Required'. Current status: '{case.status}'."
        )

    # 3. Optional supplementary document validation
    doc_ref = None
    if req.document_id:
        doc = db.query(DocumentMetadata).filter(
            DocumentMetadata.id == req.document_id,
            DocumentMetadata.case_id == case.id
        ).first()
        if doc:
            doc_ref = doc.original_filename or doc.file_name

    # 4. Record public case event
    record_case_event(
        db=db,
        case_id=case.id,
        event_type="CLARIFICATION_SUBMITTED",
        actor_id=None,
        actor_name=current_complainant.full_name,
        previous_value="Additional Information Required",
        new_value="Under Review",
        remarks=f"Citizen Clarification: {req.response_text}",
        document_ref=doc_ref,
        is_public=True
    )

    # 5. Transition status to Under Review
    case.status = "Under Review"
    case.last_action = "Complainant submitted requested additional information"
    case.last_action_date = datetime.utcnow()
    case.next_action = "Bureau Re-evaluation of Submitted Clarification"
    case.updated_at = datetime.utcnow()

    # 6. Audit logging
    log_audit_event(
        db=db,
        actor_id=None,
        actor_name=current_complainant.full_name,
        actor_role="complainant",
        event_type="CLARIFICATION_SUBMITTED",
        entity_type="Case",
        entity_id=case.id,
        previous_value="Additional Information Required",
        new_value="Under Review",
        remarks=req.response_text[:300]
    )

    # 7. Notify assigned officer / bureau
    notif = Notification(
        recipient_id=case.assigned_officer_id,
        complainant_id=None,
        notification_type="STATUS_UPDATE",
        related_case_id=case.id,
        related_entity_type="Case",
        related_entity_id=case.id,
        title=f"Clarification Provided: {case.id}",
        message=f"Citizen {current_complainant.full_name} submitted additional clarification for complaint {case.id}.",
        severity="Medium",
        link_url=f"/cases/{case.id}"
    )
    db.add(notif)
    db.commit()
    db.refresh(case)

    return serialize_complainant_case(case)


@complaints_router.post("/{complaint_id}/clarification", response_model=ComplainantCaseResponse)
def submit_clarification(
    complaint_id: str,
    req: ComplainantClarificationRequest,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    """
    Submit citizen explanation and supplementary document in response to an
    administrative information request ('Additional Information Required').
    """
    return _submit_complaint_clarification(complaint_id, req, db, current_complainant)


@router.post("/{case_id}/clarification", response_model=ComplainantCaseResponse)
def submit_clarification_alias(
    case_id: str,
    req: ComplainantClarificationRequest,
    db: Session = Depends(get_db),
    current_complainant: Complainant = Depends(get_current_complainant)
):
    return _submit_complaint_clarification(case_id, req, db, current_complainant)

