from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    CorrectiveActionPlan, Institution, Bureau, User, DocumentMetadata,
    ComplianceAssessment, Case, Notification
)
from app.services.audit_service import log_audit_event
from app.services.escalation_service import create_deduplicated_notification

VALID_STATUS_TRANSITIONS = {
    "PROPOSED": ["ASSIGNED", "CANCELLED"],
    "ASSIGNED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["EVIDENCE_SUBMITTED", "OVERDUE", "CANCELLED"],
    "OVERDUE": ["EVIDENCE_SUBMITTED", "CANCELLED"],
    "EVIDENCE_SUBMITTED": ["UNDER_REVIEW"],
    "UNDER_REVIEW": ["VERIFIED", "REJECTED"],
    "REJECTED": ["IN_PROGRESS", "OVERDUE"],
    "VERIFIED": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"],
    "CANCELLED": []
}

def create_cap(
    db: Session,
    institution_id: int,
    title: str,
    identified_gap: str,
    required_action: str,
    responsible_bureau_id: int,
    assigned_officer_id: int,
    prescribed_deadline: datetime,
    creator_user: User,
    assessment_id: Optional[int] = None,
    related_case_id: Optional[str] = None,
    priority: str = "Medium"
) -> CorrectiveActionPlan:
    """
    Creates a new Corrective Action Plan directive issued to an institution.
    """
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise ValueError(f"Institution #{institution_id} not found.")

    bureau = db.query(Bureau).filter(Bureau.id == responsible_bureau_id).first()
    if not bureau:
        raise ValueError(f"Bureau #{responsible_bureau_id} not found.")

    officer = db.query(User).filter(User.id == assigned_officer_id).first()
    if not officer:
        raise ValueError(f"Officer #{assigned_officer_id} not found.")

    cap = CorrectiveActionPlan(
        institution_id=institution_id,
        assessment_id=assessment_id,
        related_case_id=related_case_id,
        title=title,
        identified_gap=identified_gap,
        required_action=required_action,
        responsible_bureau_id=responsible_bureau_id,
        assigned_officer_id=assigned_officer_id,
        priority=priority,
        status="PROPOSED",
        prescribed_deadline=prescribed_deadline,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(cap)
    db.commit()
    db.refresh(cap)

    log_audit_event(
        db=db,
        actor_id=creator_user.id,
        actor_name=creator_user.full_name,
        actor_role=creator_user.role,
        event_type="CAP_CREATED",
        entity_type="CorrectiveActionPlan",
        entity_id=str(cap.id),
        remarks=f"CAP #{cap.id} issued for {inst.official_name}: '{title}'"
    )

    # Notify Assigned Officer
    create_deduplicated_notification(
        db=db,
        recipient_id=assigned_officer_id,
        notification_type="CAP_ASSIGNED",
        title=f"New Corrective Action Plan Assigned: {title}",
        message=f"You have been designated monitoring officer for CAP #{cap.id} ({inst.official_name}). Deadline: {prescribed_deadline.strftime('%Y-%m-%d')}.",
        severity="High" if priority in ["Critical", "High"] else "Medium",
        related_entity_type="CorrectiveActionPlan",
        related_entity_id=str(cap.id),
        link_url=f"/compliance/caps?id={cap.id}"
    )

    return cap

def update_cap_status(
    db: Session,
    cap_id: int,
    new_status: str,
    actor_user: User,
    remarks: Optional[str] = None
) -> CorrectiveActionPlan:
    """
    Validates and executes a formal state transition on a CAP.
    """
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == cap_id).first()
    if not cap:
        raise ValueError(f"CAP #{cap_id} not found.")

    allowed = VALID_STATUS_TRANSITIONS.get(cap.status, [])
    if new_status not in allowed:
        raise ValueError(f"Invalid transition from '{cap.status}' to '{new_status}'. Allowed: {', '.join(allowed) or 'None'}")

    prev_status = cap.status
    now = datetime.utcnow()
    cap.status = new_status
    cap.updated_at = now

    if remarks:
        cap.verification_remarks = f"[{new_status}] {remarks}"

    db.commit()
    db.refresh(cap)

    log_audit_event(
        db=db,
        actor_id=actor_user.id,
        actor_name=actor_user.full_name,
        actor_role=actor_user.role,
        event_type="CAP_STATUS_CHANGE",
        entity_type="CorrectiveActionPlan",
        entity_id=str(cap.id),
        previous_value=prev_status,
        new_value=new_status,
        remarks=remarks or f"Transitioned from {prev_status} to {new_status}"
    )

    return cap

def submit_cap_completion_evidence(
    db: Session,
    cap_id: int,
    document_id: int,
    remarks: str,
    actor_user: User
) -> CorrectiveActionPlan:
    """
    Submits remediation proof document for an active CAP.
    Transitions status: IN_PROGRESS / OVERDUE -> EVIDENCE_SUBMITTED -> UNDER_REVIEW.
    """
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == cap_id).first()
    if not cap:
        raise ValueError(f"CAP #{cap_id} not found.")

    if cap.status == "CLOSED":
        raise ValueError(f"Cannot submit completion evidence for CAP #{cap_id} because it is already CLOSED. The directive must be formally reopened before resubmission.")

    doc = db.query(DocumentMetadata).filter(DocumentMetadata.id == document_id).first()
    if not doc:
        raise ValueError(f"Evidence document #{document_id} not found.")

    now = datetime.utcnow()
    cap.completion_evidence_doc_id = document_id
    cap.status = "UNDER_REVIEW"  # Direct entry to scrutiny
    cap.verification_remarks = f"Evidence submitted by {actor_user.full_name}: {remarks}"
    cap.updated_at = now

    db.commit()
    db.refresh(cap)

    log_audit_event(
        db=db,
        actor_id=actor_user.id,
        actor_name=actor_user.full_name,
        actor_role=actor_user.role,
        event_type="CAP_EVIDENCE_SUBMITTED",
        entity_type="CorrectiveActionPlan",
        entity_id=str(cap.id),
        remarks=f"Remediation evidence doc #{document_id} submitted: {remarks}"
    )

    # Notify monitoring officer
    create_deduplicated_notification(
        db=db,
        recipient_id=cap.assigned_officer_id,
        notification_type="CAP_EVIDENCE_UNDER_REVIEW",
        title=f"Evidence Submitted for CAP #{cap.id}",
        message=f"Remediation proof uploaded for '{cap.title}'. Scrutiny and verification required.",
        severity="Medium",
        related_entity_type="CorrectiveActionPlan",
        related_entity_id=str(cap.id),
        link_url=f"/compliance/caps?id={cap.id}"
    )

    return cap

def verify_and_close_cap(
    db: Session,
    cap_id: int,
    verification_remarks: str,
    closure_decision: str,
    reviewer_user: User
) -> CorrectiveActionPlan:
    """
    Authoritative verification and formal closure of a CAP.
    Anti-Self-Certification: Instituted party cannot self-certify; requires verified reviewer.
    """
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == cap_id).first()
    if not cap:
        raise ValueError(f"CAP #{cap_id} not found.")

    if cap.status not in ["UNDER_REVIEW", "EVIDENCE_SUBMITTED", "VERIFIED"]:
        raise ValueError(f"Cannot verify CAP in status '{cap.status}'. Must be UNDER_REVIEW or EVIDENCE_SUBMITTED.")

    now = datetime.utcnow()
    cap.status = "CLOSED"
    cap.verification_officer_id = reviewer_user.id
    cap.verification_remarks = verification_remarks
    cap.closure_decision = closure_decision
    cap.closed_at = now
    cap.updated_at = now

    db.commit()
    db.refresh(cap)

    log_audit_event(
        db=db,
        actor_id=reviewer_user.id,
        actor_name=reviewer_user.full_name,
        actor_role=reviewer_user.role,
        event_type="CAP_VERIFIED_AND_CLOSED",
        entity_type="CorrectiveActionPlan",
        entity_id=str(cap.id),
        previous_value="UNDER_REVIEW",
        new_value="CLOSED",
        remarks=f"Decision: {closure_decision}. Remarks: {verification_remarks}"
    )

    return cap

def reopen_cap(
    db: Session,
    cap_id: int,
    reopen_reason: str,
    authorizer_user: User
) -> CorrectiveActionPlan:
    """
    Reopens a previously verified or closed CAP upon finding recidivism or inadequate evidence.
    """
    cap = db.query(CorrectiveActionPlan).filter(CorrectiveActionPlan.id == cap_id).first()
    if not cap:
        raise ValueError(f"CAP #{cap_id} not found.")

    if cap.status not in ["CLOSED", "VERIFIED"]:
        raise ValueError(f"Cannot reopen CAP in status '{cap.status}'. Only CLOSED or VERIFIED CAPs can be reopened.")

    now = datetime.utcnow()
    prev_status = cap.status
    cap.status = "REOPENED"
    cap.reopen_reason = reopen_reason
    cap.closed_at = None
    cap.updated_at = now

    db.commit()
    db.refresh(cap)

    log_audit_event(
        db=db,
        actor_id=authorizer_user.id,
        actor_name=authorizer_user.full_name,
        actor_role=authorizer_user.role,
        event_type="CAP_REOPENED",
        entity_type="CorrectiveActionPlan",
        entity_id=str(cap.id),
        previous_value=prev_status,
        new_value="REOPENED",
        remarks=f"Reopening justification: {reopen_reason}"
    )

    create_deduplicated_notification(
        db=db,
        recipient_id=cap.assigned_officer_id,
        notification_type="CAP_REOPENED",
        title=f"CAP Reopened: {cap.title}",
        message=f"CAP #{cap.id} has been reopened by {authorizer_user.full_name}: {reopen_reason}",
        severity="High",
        related_entity_type="CorrectiveActionPlan",
        related_entity_id=str(cap.id),
        link_url=f"/compliance/caps?id={cap.id}"
    )

    return cap

def scan_overdue_caps(db: Session) -> Dict[str, Any]:
    """
    Evaluates active CAP deadlines and flags overdue records, dispatching deduplicated notifications.
    Advisory only: Never imposes automated regulatory sanctions.
    """
    now = datetime.utcnow()
    overdue_caps = db.query(CorrectiveActionPlan).filter(
        CorrectiveActionPlan.prescribed_deadline < now,
        CorrectiveActionPlan.status.in_(["PROPOSED", "ASSIGNED", "IN_PROGRESS", "REOPENED"])
    ).all()

    marked_overdue = 0
    notifications_created = 0

    for cap in overdue_caps:
        cap.status = "OVERDUE"
        cap.updated_at = now
        marked_overdue += 1

        # Notify assigned monitoring officer
        n = create_deduplicated_notification(
            db=db,
            recipient_id=cap.assigned_officer_id,
            notification_type="CAP_OVERDUE",
            title=f"Overdue Corrective Action Plan: {cap.title}",
            message=f"CAP #{cap.id} for Institution #{cap.institution_id} exceeded deadline ({cap.prescribed_deadline.strftime('%Y-%m-%d')}). Scrutiny review required.",
            severity="Critical",
            related_entity_type="CorrectiveActionPlan",
            related_entity_id=str(cap.id),
            link_url=f"/compliance/caps?id={cap.id}"
        )
        if n:
            notifications_created += 1

    if marked_overdue > 0:
        db.commit()

    return {
        "overdue_caps_flagged": marked_overdue,
        "notifications_dispatched": notifications_created
    }

