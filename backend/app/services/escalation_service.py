from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.models import (
    CoordinationWorkspace, CoordinationTask, CoordinationParticipant,
    ActionConflictAlert, Case, User, Bureau, Notification
)
from app.services.audit_service import log_audit_event

def create_deduplicated_notification(
    db: Session,
    recipient_id: Optional[int],
    notification_type: str,
    title: str,
    message: str,
    severity: str = "Medium",
    related_case_id: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    link_url: Optional[str] = None
) -> Optional[Notification]:
    """
    Creates a notification only if an unread notification with identical
    notification_type, recipient, and related_entity_id does not already exist.
    """
    existing = db.query(Notification).filter(
        Notification.recipient_id == recipient_id,
        Notification.notification_type == notification_type,
        Notification.related_entity_id == str(related_entity_id) if related_entity_id else None,
        Notification.is_read == False
    ).first()
    
    if existing:
        return None
        
    notif = Notification(
        recipient_id=recipient_id,
        notification_type=notification_type,
        related_case_id=related_case_id,
        related_entity_type=related_entity_type,
        related_entity_id=str(related_entity_id) if related_entity_id else None,
        title=title,
        message=message,
        severity=severity,
        link_url=link_url,
        is_read=False
    )
    db.add(notif)
    return notif

def scan_and_process_escalations(db: Session) -> Dict[str, Any]:
    """
    Evaluates regulatory SLAs and flags:
    1. Overdue Coordination Tasks
    2. Approaching Deadlines (< 48h)
    3. Unresolved Action Conflicts (> 72h)
    4. Stalled Workspaces (no updates for > 14 days)
    """
    now = datetime.utcnow()
    notifications_created = 0
    tasks_marked_overdue = 0
    conflicts_escalated = 0
    stalled_workspaces_flagged = 0
    
    # 1. Overdue Tasks
    overdue_tasks = db.query(CoordinationTask).filter(
        CoordinationTask.due_date < now,
        CoordinationTask.status.in_(["Pending", "In Progress", "Blocked"])
    ).all()
    
    for task in overdue_tasks:
        task.status = "Overdue"
        task.updated_at = now
        tasks_marked_overdue += 1
        
        # Notify Assignee
        n1 = create_deduplicated_notification(
            db=db,
            recipient_id=task.assigned_to_id,
            notification_type="TASK_OVERDUE",
            title=f"Task Overdue: {task.title}",
            message=f"Task '{task.title}' in Workspace #{task.workspace_id} passed its due date ({task.due_date.strftime('%Y-%m-%d')}). Immediate action required.",
            severity="High",
            related_entity_type="CoordinationTask",
            related_entity_id=str(task.id),
            link_url=f"/coordination?workspaceId={task.workspace_id}"
        )
        if n1:
            notifications_created += 1
            
        # Notify Workspace Lead
        if task.workspace and task.workspace.coordination_owner_id != task.assigned_to_id:
            n2 = create_deduplicated_notification(
                db=db,
                recipient_id=task.workspace.coordination_owner_id,
                notification_type="TASK_OVERDUE_LEAD",
                title=f"Subordinate Task Overdue: {task.title}",
                message=f"Task #{task.id} ('{task.title}') assigned to Bureau {task.bureau_id} is overdue.",
                severity="High",
                related_entity_type="CoordinationTask",
                related_entity_id=str(task.id),
                link_url=f"/coordination?workspaceId={task.workspace_id}"
            )
            if n2:
                notifications_created += 1

    # 2. Approaching Task Deadlines (Due within next 48 hours)
    in_48h = now + timedelta(hours=48)
    approaching_tasks = db.query(CoordinationTask).filter(
        CoordinationTask.due_date >= now,
        CoordinationTask.due_date <= in_48h,
        CoordinationTask.status.in_(["Pending", "In Progress"])
    ).all()
    
    for task in approaching_tasks:
        n = create_deduplicated_notification(
            db=db,
            recipient_id=task.assigned_to_id,
            notification_type="TASK_DEADLINE_APPROACHING",
            title=f"Deadline Approaching: {task.title}",
            message=f"Task '{task.title}' is due on {task.due_date.strftime('%Y-%m-%d %H:%M')}.",
            severity="Medium",
            related_entity_type="CoordinationTask",
            related_entity_id=str(task.id),
            link_url=f"/coordination?workspaceId={task.workspace_id}"
        )
        if n:
            notifications_created += 1

    # 3. Unresolved Action Conflicts (> 72 hours)
    cutoff_72h = now - timedelta(hours=72)
    stale_conflicts = db.query(ActionConflictAlert).filter(
        ActionConflictAlert.status == "Pending Review",
        ActionConflictAlert.created_at <= cutoff_72h
    ).all()
    
    for cf in stale_conflicts:
        conflicts_escalated += 1
        # Find bureau heads for participating cases
        case_a = db.query(Case).filter(Case.id == cf.case_a_id).first()
        case_b = db.query(Case).filter(Case.id == cf.case_b_id).first()
        bureau_ids = set()
        if case_a:
            bureau_ids.add(case_a.current_bureau_id)
        if case_b:
            bureau_ids.add(case_b.current_bureau_id)
            
        bureau_heads = db.query(User).filter(
            User.bureau_id.in_(list(bureau_ids)),
            User.role.in_(["bureau_head", "super_admin"])
        ).all()
        
        for head in bureau_heads:
            n = create_deduplicated_notification(
                db=db,
                recipient_id=head.id,
                notification_type="UNRESOLVED_ACTION_CONFLICT",
                title=f"Escalation: Unresolved Action Conflict #{cf.id}",
                message=f"Conflict '{cf.rule_triggered}' between {cf.case_a_id} and {cf.case_b_id} has been pending for over 72 hours.",
                severity="Critical",
                related_entity_type="ActionConflictAlert",
                related_entity_id=str(cf.id),
                link_url=f"/action-conflicts"
            )
            if n:
                notifications_created += 1

    # 4. Stalled Workspaces (Status 'In Coordination' with no updates for > 14 days)
    cutoff_14d = now - timedelta(days=14)
    stalled_workspaces = db.query(CoordinationWorkspace).filter(
        CoordinationWorkspace.status == "In Coordination",
        CoordinationWorkspace.updated_at <= cutoff_14d
    ).all()
    
    for ws in stalled_workspaces:
        stalled_workspaces_flagged += 1
        n = create_deduplicated_notification(
            db=db,
            recipient_id=ws.coordination_owner_id,
            notification_type="STALLED_WORKSPACE",
            title=f"Stalled Coordination: {ws.title}",
            message=f"Workspace #{ws.id} has had no task updates or joint meetings for over 14 days. Review progress or record closure.",
            severity="High",
            related_entity_type="CoordinationWorkspace",
            related_entity_id=str(ws.id),
            link_url=f"/coordination?workspaceId={ws.id}"
        )
        if n:
            notifications_created += 1
            
    if notifications_created > 0 or tasks_marked_overdue > 0:
        db.commit()
        
    return {
        "notifications_dispatched": notifications_created,
        "tasks_marked_overdue": tasks_marked_overdue,
        "conflicts_escalated": conflicts_escalated,
        "stalled_workspaces_flagged": stalled_workspaces_flagged
    }

def get_escalation_summary(db: Session) -> Dict[str, Any]:
    """
    Returns an aggregated overview of active escalations across the platform.
    """
    now = datetime.utcnow()
    overdue_task_count = db.query(CoordinationTask).filter(
        CoordinationTask.due_date < now,
        CoordinationTask.status.in_(["Pending", "In Progress", "Blocked", "Overdue"])
    ).count()
    
    in_48h = now + timedelta(hours=48)
    approaching_deadline_count = db.query(CoordinationTask).filter(
        CoordinationTask.due_date >= now,
        CoordinationTask.due_date <= in_48h,
        CoordinationTask.status.in_(["Pending", "In Progress"])
    ).count()
    
    cutoff_72h = now - timedelta(hours=72)
    unresolved_conflict_count = db.query(ActionConflictAlert).filter(
        ActionConflictAlert.status == "Pending Review",
        ActionConflictAlert.created_at <= cutoff_72h
    ).count()
    
    cutoff_14d = now - timedelta(days=14)
    stalled_workspace_count = db.query(CoordinationWorkspace).filter(
        CoordinationWorkspace.status == "In Coordination",
        CoordinationWorkspace.updated_at <= cutoff_14d
    ).count()
    
    return {
        "overdue_tasks": overdue_task_count,
        "approaching_deadlines": approaching_deadline_count,
        "unresolved_conflicts_72h": unresolved_conflict_count,
        "stalled_workspaces_14d": stalled_workspace_count,
        "evaluated_at": now.isoformat()
    }

