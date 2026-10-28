from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AuditLog, CaseEvent

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
    ip_address: str | None = "127.0.0.1"
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
        remarks=remarks,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(log)
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
    document_ref: str | None = None
) -> CaseEvent:
    event = CaseEvent(
        case_id=case_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_name=actor_name,
        previous_value=previous_value,
        new_value=new_value,
        remarks=remarks,
        document_ref=document_ref,
        timestamp=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
