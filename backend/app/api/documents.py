import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import DocumentMetadata, Case, User, Complainant
from app.schemas.schemas import DocumentMetadataResponse
from app.api.auth import get_current_user
from app.services.audit_service import log_audit_event, record_case_event
from app.services import storage_service

router = APIRouter(prefix="/documents", tags=["Document & Evidence Management"])

# Backward compatibility alias for test imports
BASE_STORAGE_DIR = storage_service.get_storage_root()

MIME_TYPES = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

@router.get("/case/{case_id}", response_model=List[DocumentMetadataResponse])
def get_case_documents(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DocumentMetadata).filter(DocumentMetadata.case_id == case_id)
    
    # Restrict confidential docs
    if current_user.role not in ["super_admin", "bureau_head"]:
        query = query.filter(DocumentMetadata.access_classification != "Confidential - Bureau Head Only")
        
    docs = query.order_by(DocumentMetadata.upload_timestamp.desc()).all()
    results = []
    for d in docs:
        uploader_name = "Officer"
        if d.uploader_role == "complainant" or d.uploaded_by_complainant_id:
            comp = db.query(Complainant).filter(Complainant.id == d.uploaded_by_complainant_id).first()
            uploader_name = comp.full_name if comp else "Citizen Complainant"
        elif d.uploaded_by_id:
            uploader = db.query(User).filter(User.id == d.uploaded_by_id).first()
            if uploader:
                uploader_name = uploader.full_name

        results.append({
            "id": d.id,
            "case_id": d.case_id,
            "file_name": d.file_name,
            "original_filename": d.original_filename or d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "access_classification": d.access_classification,
            "uploaded_by_id": d.uploaded_by_id,
            "uploaded_by_name": uploader_name,
            "uploaded_by_complainant_id": d.uploaded_by_complainant_id,
            "uploader_role": d.uploader_role or "officer",
            "download_url": f"/api/documents/{d.id}/download",
            "upload_timestamp": d.upload_timestamp
        })
    return results

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allow authenticated officers to stream and download evidence and notice attachments.
    Enforces confidential document classification controls and supports both database
    BYTEA binaries and legacy filesystem documents.
    """
    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document record not found."
        )

    # Confidentiality check
    if doc.access_classification == "Confidential - Bureau Head Only" and current_user.role not in ["super_admin", "bureau_head"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Document classified as 'Confidential - Bureau Head Only'."
        )

    # Resolve document payload (database BYTEA or legacy filesystem)
    try:
        payload = storage_service.retrieve_document_payload(doc, db)
    except RuntimeError as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(err)
        )
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Physical or database binary file for '{doc.original_filename or doc.file_name}' not found."
        )

    download_filename = doc.original_filename or doc.file_name

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="DOCUMENT_DOWNLOAD",
        entity_type="DocumentMetadata",
        entity_id=str(doc.id),
        remarks=f"Officer {current_user.full_name} downloaded document '{download_filename}' for case {doc.case_id}"
    )

    return storage_service.create_download_response(payload)

@router.get("/admin/diagnostics")
def get_document_storage_diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Administrative observability and quota diagnostics.
    Reports byte counts, averages, and quota utilization without loading document contents.
    """
    if current_user.role not in ["super_admin", "bureau_head"]:
        raise HTTPException(status_code=403, detail="Access denied: Admin role required.")
    try:
        return storage_service.get_storage_diagnostics(db)
    except RuntimeError as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))

@router.post("/case/{case_id}", response_model=DocumentMetadataResponse)
async def upload_case_document(
    case_id: str,
    file_name: str = Form(...),
    category: str = Form("Official Notice"),
    access_classification: str = Form("Official Internal"),
    file_size: int = Form(102400),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")

    if file:
        try:
            file_bytes = await storage_service.read_upload_stream(file)
            doc = storage_service.store_uploaded_document(
                db=db,
                case_id=c.id,
                file_data=file_bytes,
                original_filename=file.filename or file_name,
                category=category,
                access_classification=access_classification,
                uploaded_by_id=current_user.id,
                uploaded_by_complainant_id=None,
                uploader_role="officer",
                content_type=file.content_type
            )
        except ValueError as ve:
            if "exceeds maximum permitted limit" in str(ve).lower():
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(ve))
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        except RuntimeError as err:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))
    else:
        # Form-only metadata record (legacy/seed compatibility)
        doc = DocumentMetadata(
            case_id=c.id,
            file_name=file_name,
            original_filename=file_name,
            file_size=file_size,
            file_type=file_name.split(".")[-1].lower() if "." in file_name else "pdf",
            category=category,
            access_classification=access_classification,
            uploaded_by_id=current_user.id,
            file_path=f"/secure/storage/cases/{c.id}/{file_name}",
            upload_timestamp=datetime.utcnow()
        )
        db.add(doc)

    try:
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed during document upload.")
    
    record_case_event(
        db=db,
        case_id=c.id,
        event_type="DOCUMENT_ATTACHED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        remarks=f"Attached document '{file_name}' ({category})",
        document_ref=doc.file_name
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="DOCUMENT_UPLOAD",
        entity_type="DocumentMetadata",
        entity_id=str(doc.id),
        remarks=f"Uploaded {file_name} for case {c.id} with classification {access_classification}"
    )
    
    return {
        "id": doc.id,
        "case_id": doc.case_id,
        "file_name": doc.file_name,
        "original_filename": doc.original_filename or doc.file_name,
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "category": doc.category,
        "access_classification": doc.access_classification,
        "uploaded_by_id": doc.uploaded_by_id,
        "uploaded_by_name": current_user.full_name,
        "upload_timestamp": doc.upload_timestamp
    }
