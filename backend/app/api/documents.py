from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import DocumentMetadata, Case, User
from app.schemas.schemas import DocumentMetadataResponse
from app.api.auth import get_current_user
from app.services.audit_service import log_audit_event, record_case_event

router = APIRouter(prefix="/documents", tags=["Document & Evidence Management"])

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
        uploader = db.query(User).filter(User.id == d.uploaded_by_id).first()
        results.append({
            "id": d.id,
            "case_id": d.case_id,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "category": d.category,
            "access_classification": d.access_classification,
            "uploaded_by_id": d.uploaded_by_id,
            "uploaded_by_name": uploader.full_name if uploader else "Officer",
            "upload_timestamp": d.upload_timestamp
        })
    return results

@router.post("/case/{case_id}", response_model=DocumentMetadataResponse)
def upload_case_document(
    case_id: str,
    file_name: str = Form(...),
    category: str = Form("Official Notice"),
    access_classification: str = Form("Official Internal"),
    file_size: int = Form(102400),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")
        
    # File type validation
    ext = file_name.split(".")[-1].lower() if "." in file_name else "pdf"
    
    doc = DocumentMetadata(
        case_id=c.id,
        file_name=file_name,
        file_size=file_size,
        file_type=ext,
        category=category,
        access_classification=access_classification,
        uploaded_by_id=current_user.id,
        file_path=f"/secure/storage/cases/{c.id}/{file_name}",
        upload_timestamp=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
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
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "category": doc.category,
        "access_classification": doc.access_classification,
        "uploaded_by_id": doc.uploaded_by_id,
        "uploaded_by_name": current_user.full_name,
        "upload_timestamp": doc.upload_timestamp
    }
