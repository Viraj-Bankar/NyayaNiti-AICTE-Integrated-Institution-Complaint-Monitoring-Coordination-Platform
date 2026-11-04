import re
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AuditLog, CaseEvent

def sanitize_log_text(text: str | None) -> str | None:
    """
    Sanitize log text to guarantee no passwords, JWT tokens, Bearer strings,
    or secret keys are stored in audit logs or case events.
    """
    if not text:
        return text
    # Mask Bearer tokens & JWTs
    sanitized = re.sub(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*', 'Bearer [REDACTED_TOKEN]', text)
    sanitized = re.sub(r'eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+', '[REDACTED_JWT]', sanitized)
    sanitized = re.sub(r'(password|token|secret|access_token|refresh_token)\s*[:=]\s*[^\s,]+', r'\1: [REDACTED]', sanitized, flags=re.IGNORECASE)
    return sanitized

def log_audit_event(
    db: Session,
    actor_id: int | None,
    actor_name: str,
    actor_role: str,
    event_type: str,
    entity_type: str,
    entity_id: str,
    previous_value: str | None = None,
    new_value: str | None = None,
    remarks: str | None = None,
    ip_address: str | None = "127.0.0.1",
    commit: bool = True
) -> AuditLog:
    log = AuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        previous_value=previous_value,
        new_value=new_value,
        remarks=sanitize_log_text(remarks),
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    if commit:
        db.commit()
        db.refresh(log)
    return log

def record_case_event(
    db: Session,
    case_id: str,
    event_type: str,
    actor_id: int | None,
    actor_name: str,
    previous_value: str | None = None,
    new_value: str | None = None,
    remarks: str | None = None,
    document_ref: str | None = None,
    is_public: bool = True,
    commit: bool = True
) -> CaseEvent:
    event = CaseEvent(
        case_id=case_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_name=actor_name,
        previous_value=previous_value,
        new_value=new_value,
        remarks=sanitize_log_text(remarks),
        document_ref=document_ref,
        is_public=is_public,
        timestamp=datetime.utcnow()
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    return event

