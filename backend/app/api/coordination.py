from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.models import (
    CoordinationWorkspace, CoordinationTask, CoordinationParticipant,
    CaseCoordinationLink, Case, Institution, Bureau, User, Notification
)
from app.schemas.schemas import (
    CoordinationWorkspaceResponse, CoordinationWorkspaceCreate, CoordinationWorkspaceUpdate,
    CoordinationTaskCreate, CoordinationTaskUpdate, CoordinationTaskResponse,
    CoordinationParticipantCreate, CoordinationParticipantResponse,
    CaseCoordinationLinkCreate, MeetingRecordCreate, WorkspaceResolveRequest
)
from app.api.auth import get_current_user, require_role
from app.services.audit_service import log_audit_event, record_case_event
from app.services.escalation_service import (
    create_deduplicated_notification, scan_and_process_escalations, get_escalation_summary
)

router = APIRouter(prefix="/coordination", tags=["Cross-Bureau Coordination Workspace"])

def serialize_workspace(w: CoordinationWorkspace, db: Session) -> Dict[str, Any]:
    """Helper to serialize a CoordinationWorkspace with all nested relations."""
    lead_officer = db.query(User).filter(User.id == w.coordination_owner_id).first()
    primary_bureau = db.query(Bureau).filter(Bureau.id == w.primary_bureau_id).first()
    sec_bureau = db.query(Bureau).filter(Bureau.id == w.secondary_bureau_id).first() if w.secondary_bureau_id else None
    
    links = db.query(CaseCoordinationLink.case_id).filter(CaseCoordinationLink.workspace_id == w.id).all()
    case_ids = [l[0] for l in links]
    
    # Serialize tasks
    task_list = []
    for t in w.tasks:
        assigned_user = db.query(User).filter(User.id == t.assigned_to_id).first()
        task_bureau = db.query(Bureau).filter(Bureau.id == t.bureau_id).first()
        task_list.append({
            "id": t.id,
            "workspace_id": t.workspace_id,
            "title": t.title,
            "description": t.description,
            "assigned_to_id": t.assigned_to_id,
            "assigned_to_name": assigned_user.full_name if assigned_user else "N/A",
            "bureau_id": t.bureau_id,
            "bureau_code": task_bureau.code if task_bureau else "N/A",
            "due_date": t.due_date,
            "priority": t.priority,
            "status": t.status,
            "remarks": t.remarks,
            "depends_on_task_id": t.depends_on_task_id,
            "evidence_doc_id": t.evidence_doc_id
        })
        
    # Serialize participants
    participant_list = []
    for p in w.participants:
        p_user = db.query(User).filter(User.id == p.officer_id).first()
        p_bureau = db.query(Bureau).filter(Bureau.id == p.bureau_id).first()
        participant_list.append({
            "id": p.id,
            "workspace_id": p.workspace_id,
            "officer_id": p.officer_id,
            "officer_name": p_user.full_name if p_user else "N/A",
            "bureau_id": p.bureau_id,
            "bureau_code": p_bureau.code if p_bureau else "N/A",
            "role": p.role,
            "joined_at": p.joined_at
        })
        
    return {
        "id": w.id,
        "title": w.title,
        "institution_id": w.institution_id,
        "institution_name": w.institution.official_name if w.institution else "Unknown",
        "primary_bureau_id": w.primary_bureau_id,
        "primary_bureau_code": primary_bureau.code if primary_bureau else "N/A",
        "secondary_bureau_id": w.secondary_bureau_id,
        "secondary_bureau_code": sec_bureau.code if sec_bureau else None,
        "coordination_owner_id": w.coordination_owner_id,
        "coordination_owner_name": lead_officer.full_name if lead_officer else "N/A",
        "status": w.status,
        "justification": w.justification,
        "decisions": w.decisions,
        "meeting_records": w.meeting_records or [],
        "linked_case_ids": case_ids,
        "participants": participant_list,
        "tasks": task_list,
        "created_at": w.created_at
    }

def validate_task_dag_dependency(db: Session, workspace_id: int, task_id: Optional[int], parent_task_id: int):
    """
    Validates that parent_task_id belongs to the same workspace and does not form a circular dependency.
    """
    parent = db.query(CoordinationTask).filter(CoordinationTask.id == parent_task_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent dependency task not found.")
    if parent.workspace_id != workspace_id:
        raise HTTPException(status_code=400, detail="Parent task belongs to a different workspace.")
    if task_id and parent_task_id == task_id:
        raise HTTPException(status_code=400, detail="Task cannot depend on itself.")
        
    # Cycle detection traversal
    if task_id:
        visited = set()
        current = parent_task_id
        while current is not None:
            if current == task_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Circular dependency detected: Task {task_id} is already an ancestor of Task {parent_task_id}."
                )
            visited.add(current)
            curr_task = db.query(CoordinationTask).filter(CoordinationTask.id == current).first()
            if not curr_task or curr_task.depends_on_task_id is None:
                break
            current = curr_task.depends_on_task_id

# ----------------- WORKSPACE CRUD -----------------

@router.get("", response_model=List[CoordinationWorkspaceResponse])
def list_workspaces(
    status: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CoordinationWorkspace).order_by(CoordinationWorkspace.created_at.desc())
    if status:
        query = query.filter(CoordinationWorkspace.status == status)
    if institution_id:
        query = query.filter(CoordinationWorkspace.institution_id == institution_id)
        
    workspaces = query.all()
    return [serialize_workspace(w, db) for w in workspaces]

@router.post("", response_model=CoordinationWorkspaceResponse)
def create_coordination_workspace(
    ws_in: CoordinationWorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    """
    Manually initiates a new cross-bureau coordination workspace.
    Guards against accidental duplicate workspaces for identical institution & bureaus.
    """
    inst = db.query(Institution).filter(Institution.id == ws_in.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    primary_bur = db.query(Bureau).filter(Bureau.id == ws_in.primary_bureau_id).first()
    if not primary_bur:
        raise HTTPException(status_code=404, detail="Primary bureau not found")
        
    # Check for existing duplicate active workspace with same title and institution
    existing_ws = db.query(CoordinationWorkspace).filter(
        CoordinationWorkspace.institution_id == ws_in.institution_id,
        CoordinationWorkspace.title == ws_in.title,
        CoordinationWorkspace.status.in_(["In Coordination", "Awaiting Review", "Awaiting Decision"])
    ).first()
    if existing_ws:
        raise HTTPException(
            status_code=400,
            detail=f"An active coordination workspace ('{existing_ws.title}') already exists for this institution (ID #{existing_ws.id})."
        )
        
    # Create workspace
    workspace = CoordinationWorkspace(
        title=ws_in.title,
        institution_id=ws_in.institution_id,
        primary_bureau_id=ws_in.primary_bureau_id,
        secondary_bureau_id=ws_in.secondary_bureau_id,
        coordination_owner_id=current_user.id,
        status="In Coordination",
        justification=ws_in.justification,
        meeting_records=[]
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    
    # Auto-add creator as Lead Coordinator
    lead_part = CoordinationParticipant(
        workspace_id=workspace.id,
        officer_id=current_user.id,
        bureau_id=current_user.bureau_id or ws_in.primary_bureau_id,
        role="Lead Coordinator"
    )
    db.add(lead_part)
    
    # Add other specified participants
    if ws_in.participant_ids:
        for p_id in set(ws_in.participant_ids):
            if p_id == current_user.id:
                continue
            user_obj = db.query(User).filter(User.id == p_id).first()
            if user_obj:
                p_entry = CoordinationParticipant(
                    workspace_id=workspace.id,
                    officer_id=user_obj.id,
                    bureau_id=user_obj.bureau_id or ws_in.primary_bureau_id,
                    role="Participant Officer"
                )
                db.add(p_entry)
                # Dispatch notification
                create_deduplicated_notification(
                    db=db,
                    recipient_id=user_obj.id,
                    notification_type="WORKSPACE_INVITATION",
                    title="Invited to Coordination Workspace",
                    message=f"You have been invited to Coordination Workspace #{workspace.id}: '{workspace.title}' by {current_user.full_name}.",
                    severity="Medium",
                    related_entity_type="CoordinationWorkspace",
                    related_entity_id=str(workspace.id),
                    link_url=f"/coordination?workspaceId={workspace.id}"
                )
                
    # Link initial cases
    if ws_in.linked_case_ids:
        for c_id in set(ws_in.linked_case_ids):
            case_obj = db.query(Case).filter(Case.id == c_id).first()
            if case_obj:
                link = CaseCoordinationLink(workspace_id=workspace.id, case_id=c_id)
                db.add(link)
                # Record non-public CaseEvent
                record_case_event(
                    db=db,
                    case_id=c_id,
                    event_type="COORDINATION_INITIATED",
                    actor_id=current_user.id,
                    actor_name=current_user.full_name,
                    new_value=f"Workspace #{workspace.id}",
                    remarks=f"Inter-bureau coordination initiated. Workspace: '{workspace.title}'. Justification: {ws_in.justification or 'N/A'}",
                    is_public=False
                )
                
    db.commit()
    db.refresh(workspace)
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_WORKSPACE_CREATED",
        entity_type="CoordinationWorkspace",
        entity_id=str(workspace.id),
        new_value=workspace.title,
        remarks=f"Created workspace for institution {inst.official_name} with primary bureau {primary_bur.code}"
    )
    
    return serialize_workspace(workspace, db)

@router.get("/{id}", response_model=CoordinationWorkspaceResponse)
def get_workspace_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Coordination workspace not found")
    return serialize_workspace(w, db)

@router.patch("/{id}", response_model=CoordinationWorkspaceResponse)
def update_workspace_metadata(
    id: int,
    ws_update: CoordinationWorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Coordination workspace not found")
        
    # Check permissions: owner, bureau_head, or super_admin
    is_owner = (current_user.id == w.coordination_owner_id)
    is_admin = current_user.role in ["super_admin", "bureau_head"]
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only workspace lead or bureau head can modify workspace metadata.")
        
    prev_title = w.title
    prev_status = w.status
    
    if ws_update.title is not None:
        w.title = ws_update.title
    if ws_update.status is not None:
        w.status = ws_update.status
    if ws_update.justification is not None:
        w.justification = ws_update.justification
    if ws_update.decisions is not None:
        w.decisions = ws_update.decisions
    if ws_update.secondary_bureau_id is not None:
        w.secondary_bureau_id = ws_update.secondary_bureau_id
        
    w.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(w)
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_WORKSPACE_UPDATED",
        entity_type="CoordinationWorkspace",
        entity_id=str(w.id),
        previous_value=f"Title: {prev_title}, Status: {prev_status}",
        new_value=f"Title: {w.title}, Status: {w.status}",
        remarks=f"Updated workspace metadata by {current_user.full_name}"
    )
    
    return serialize_workspace(w, db)

@router.post("/{id}/resolve")
def resolve_coordination_workspace(
    id: int,
    resolve_in: WorkspaceResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    """
    Records joint consensus decisions and closes/resolves the workspace.
    Synchronizes confidential non-public case events to all linked cases.
    """
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Coordination workspace not found")
        
    is_owner = (current_user.id == w.coordination_owner_id)
    is_admin = current_user.role in ["super_admin", "bureau_head"]
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only workspace lead or bureau head can resolve workspace.")
        
    prev_status = w.status
    w.status = resolve_in.resolution_status
    w.decisions = resolve_in.consensus_decisions
    w.updated_at = datetime.utcnow()
    
    # Sync with linked cases
    if resolve_in.apply_to_cases:
        links = db.query(CaseCoordinationLink).filter(CaseCoordinationLink.workspace_id == w.id).all()
        for link in links:
            record_case_event(
                db=db,
                case_id=link.case_id,
                event_type="COORDINATION_RESOLVED",
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                new_value=w.status,
                remarks=f"Joint consensus recorded in Workspace #{w.id}: {resolve_in.consensus_decisions}",
                is_public=False
            )
            
    db.commit()
    db.refresh(w)
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_RESOLVED",
        entity_type="CoordinationWorkspace",
        entity_id=str(w.id),
        previous_value=prev_status,
        new_value=w.status,
        remarks=f"Workspace resolved with consensus: {resolve_in.consensus_decisions[:200]}"
    )
    
    # Notify all participating officers of formal workspace resolution
    participants = db.query(CoordinationParticipant).filter(CoordinationParticipant.workspace_id == w.id).all()
    for p in participants:
        if p.officer_id and p.officer_id != current_user.id:
            create_deduplicated_notification(
                db=db,
                recipient_id=p.officer_id,
                notification_type="WORKSPACE_RESOLVED",
                title=f"Coordination Workspace #{w.id} Concluded",
                message=f"Workspace #{w.id} ('{w.title}') concluded with status '{w.status}'. Consensus: {resolve_in.consensus_decisions[:120]}...",
                severity="Info",
                related_entity_type="CoordinationWorkspace",
                related_entity_id=str(w.id),
                link_url=f"/coordination?workspaceId={w.id}"
            )
    
    return {"message": f"Workspace status updated to {w.status}", "workspace_id": w.id, "decisions": w.decisions}

@router.post("/{id}/reopen")
def reopen_coordination_workspace(
    id: int,
    justification: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head"]))
):
    """
    Reopens a closed workspace. Authorized for Bureau Heads & Super Admins.
    """
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Coordination workspace not found")
        
    prev_status = w.status
    w.status = "In Coordination"
    w.updated_at = datetime.utcnow()
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_REOPENED",
        entity_type="CoordinationWorkspace",
        entity_id=str(w.id),
        previous_value=prev_status,
        new_value="In Coordination",
        remarks=f"Reopened workspace. Justification: {justification}"
    )
    
    return {"message": "Workspace reopened successfully", "workspace_id": w.id, "status": w.status}

# ----------------- PARTICIPANT MANAGEMENT -----------------

@router.post("/{id}/participants", response_model=CoordinationParticipantResponse)
def add_workspace_participant(
    id: int,
    p_in: CoordinationParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Check permissions
    is_owner = (current_user.id == w.coordination_owner_id)
    is_admin = current_user.role in ["super_admin", "bureau_head"]
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only workspace lead or bureau head can add participants.")
        
    target_user = db.query(User).filter(User.id == p_in.officer_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Officer not found")
        
    existing = db.query(CoordinationParticipant).filter(
        CoordinationParticipant.workspace_id == w.id,
        CoordinationParticipant.officer_id == p_in.officer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Officer is already a participant in this workspace.")
        
    participant = CoordinationParticipant(
        workspace_id=w.id,
        officer_id=p_in.officer_id,
        bureau_id=p_in.bureau_id,
        role=p_in.role or "Participant Officer"
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    # Notify added officer
    create_deduplicated_notification(
        db=db,
        recipient_id=target_user.id,
        notification_type="WORKSPACE_INVITATION",
        title="Added to Coordination Workspace",
        message=f"You have been assigned role '{participant.role}' in Workspace #{w.id} ('{w.title}') by {current_user.full_name}.",
        severity="Medium",
        related_entity_type="CoordinationWorkspace",
        related_entity_id=str(w.id),
        link_url=f"/coordination?workspaceId={w.id}"
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="PARTICIPANT_ADDED",
        entity_type="CoordinationParticipant",
        entity_id=str(participant.id),
        new_value=f"Officer {target_user.full_name} ({participant.role})",
        remarks=f"Added officer {target_user.full_name} to workspace #{w.id}"
    )
    
    p_bureau = db.query(Bureau).filter(Bureau.id == participant.bureau_id).first()
    return {
        "id": participant.id,
        "workspace_id": participant.workspace_id,
        "officer_id": participant.officer_id,
        "officer_name": target_user.full_name,
        "bureau_id": participant.bureau_id,
        "bureau_code": p_bureau.code if p_bureau else "N/A",
        "role": participant.role,
        "joined_at": participant.joined_at
    }

@router.delete("/{id}/participants/{officer_id}")
def remove_workspace_participant(
    id: int,
    officer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    is_owner = (current_user.id == w.coordination_owner_id)
    is_admin = current_user.role in ["super_admin", "bureau_head"]
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only workspace lead or bureau head can remove participants.")
        
    if officer_id == w.coordination_owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace lead coordinator/owner.")
        
    participant = db.query(CoordinationParticipant).filter(
        CoordinationParticipant.workspace_id == w.id,
        CoordinationParticipant.officer_id == officer_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant record not found")
        
    removed_name = participant.officer.full_name if participant.officer else f"Officer #{officer_id}"
    db.delete(participant)
    db.commit()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="PARTICIPANT_REMOVED",
        entity_type="CoordinationWorkspace",
        entity_id=str(w.id),
        remarks=f"Removed {removed_name} from workspace #{w.id}"
    )
    
    return {"message": "Participant removed successfully"}

# ----------------- CASE ATTACHMENT -----------------

@router.post("/{id}/cases")
def link_case_to_workspace(
    id: int,
    case_in: CaseCoordinationLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    case_obj = db.query(Case).filter(Case.id == case_in.case_id).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
        
    existing_link = db.query(CaseCoordinationLink).filter(
        CaseCoordinationLink.workspace_id == w.id,
        CaseCoordinationLink.case_id == case_in.case_id
    ).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="Case is already linked to this workspace.")
        
    link = CaseCoordinationLink(workspace_id=w.id, case_id=case_in.case_id)
    db.add(link)
    db.commit()
    
    record_case_event(
        db=db,
        case_id=case_in.case_id,
        event_type="COORDINATION_CASE_ATTACHED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        new_value=f"Workspace #{w.id}",
        remarks=f"Case attached to Coordination Workspace #{w.id}: '{w.title}'",
        is_public=False
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_CASE_LINKED",
        entity_type="CaseCoordinationLink",
        entity_id=case_in.case_id,
        remarks=f"Linked case {case_in.case_id} to workspace #{w.id}"
    )
    
    return {"message": "Case linked successfully", "case_id": case_in.case_id, "workspace_id": w.id}

@router.delete("/{id}/cases/{case_id}")
def unlink_case_from_workspace(
    id: int,
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    link = db.query(CaseCoordinationLink).filter(
        CaseCoordinationLink.workspace_id == w.id,
        CaseCoordinationLink.case_id == case_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Case is not linked to this workspace.")
        
    db.delete(link)
    db.commit()
    
    record_case_event(
        db=db,
        case_id=case_id,
        event_type="COORDINATION_CASE_DETACHED",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        new_value=f"Workspace #{w.id}",
        remarks=f"Case detached from Coordination Workspace #{w.id}",
        is_public=False
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_CASE_UNLINKED",
        entity_type="CaseCoordinationLink",
        entity_id=case_id,
        remarks=f"Unlinked case {case_id} from workspace #{w.id}"
    )
    
    return {"message": "Case detached successfully"}

# ----------------- TASK MANAGEMENT (DAG & DEPENDENCIES) -----------------

@router.post("/{id}/tasks", response_model=CoordinationTaskResponse)
def add_coordination_task(
    id: int,
    task_in: CoordinationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Validate DAG dependency if specified
    initial_status = "Pending"
    if task_in.depends_on_task_id:
        validate_task_dag_dependency(db, w.id, None, task_in.depends_on_task_id)
        parent_task = db.query(CoordinationTask).filter(CoordinationTask.id == task_in.depends_on_task_id).first()
        if parent_task and parent_task.status != "Completed":
            initial_status = "Blocked"
            
    task = CoordinationTask(
        workspace_id=w.id,
        title=task_in.title,
        description=task_in.description,
        assigned_to_id=task_in.assigned_to_id,
        bureau_id=task_in.bureau_id,
        due_date=task_in.due_date,
        priority=task_in.priority or "Medium",
        status=initial_status,
        depends_on_task_id=task_in.depends_on_task_id,
        evidence_doc_id=task_in.evidence_doc_id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first()
    task_bureau = db.query(Bureau).filter(Bureau.id == task.bureau_id).first()
    
    # Notify assigned officer
    create_deduplicated_notification(
        db=db,
        recipient_id=task.assigned_to_id,
        notification_type="TASK_ASSIGNED",
        title="New Coordination Task Assigned",
        message=f"You have been assigned task '{task.title}' in Workspace #{w.id}. Status: {task.status}. Due: {task.due_date.strftime('%Y-%m-%d')}.",
        severity="High" if task.priority in ["High", "Critical"] else "Medium",
        related_entity_type="CoordinationTask",
        related_entity_id=str(task.id),
        link_url=f"/coordination?workspaceId={w.id}"
    )
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_TASK_CREATED",
        entity_type="CoordinationTask",
        entity_id=str(task.id),
        remarks=f"Created task '{task.title}' assigned to {assigned_user.full_name if assigned_user else 'Officer'} (Initial Status: {task.status})"
    )
    
    return {
        "id": task.id,
        "workspace_id": task.workspace_id,
        "title": task.title,
        "description": task.description,
        "assigned_to_id": task.assigned_to_id,
        "assigned_to_name": assigned_user.full_name if assigned_user else "N/A",
        "bureau_id": task.bureau_id,
        "bureau_code": task_bureau.code if task_bureau else "N/A",
        "due_date": task.due_date,
        "priority": task.priority,
        "status": task.status,
        "remarks": task.remarks,
        "depends_on_task_id": task.depends_on_task_id,
        "evidence_doc_id": task.evidence_doc_id
    }

@router.patch("/tasks/{task_id}")
def update_task_status(
    task_id: int,
    task_update: Optional[CoordinationTaskUpdate] = None,
    status: Optional[str] = Query(None),
    remarks: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates task status, remarks, priority, or evidence.
    Supports both JSON body and query parameters for full backwards compatibility.
    Enforces strict RBAC: only assignee, workspace owner, bureau head, or super_admin can update.
    """
    task = db.query(CoordinationTask).filter(CoordinationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    workspace = task.workspace
    # RBAC Guard
    is_assignee = (current_user.id == task.assigned_to_id)
    is_ws_owner = bool(workspace and current_user.id == workspace.coordination_owner_id)
    is_admin = current_user.role in ["super_admin", "bureau_head"]
    
    if not (is_assignee or is_ws_owner or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Access denied: You are not the assigned officer, workspace lead, or bureau head for this task."
        )
        
    prev_status = task.status
    
    # Resolve values from body or query params
    new_status = (task_update.status if task_update and task_update.status else status)
    new_remarks = (task_update.remarks if task_update and task_update.remarks is not None else remarks)
    
    if task_update:
        if task_update.priority:
            task.priority = task_update.priority
        if task_update.due_date:
            task.due_date = task_update.due_date
        if task_update.evidence_doc_id:
            task.evidence_doc_id = task_update.evidence_doc_id
        if task_update.depends_on_task_id is not None:
            if task_update.depends_on_task_id != task.depends_on_task_id:
                validate_task_dag_dependency(db, task.workspace_id, task.id, task_update.depends_on_task_id)
                task.depends_on_task_id = task_update.depends_on_task_id
                
    if new_remarks is not None:
        task.remarks = new_remarks
        
    if new_status:
        task.status = new_status
        
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    # Auto-unlock dependent tasks if completed
    unlocked_tasks_count = 0
    if task.status == "Completed":
        dependent_tasks = db.query(CoordinationTask).filter(
            CoordinationTask.depends_on_task_id == task.id,
            CoordinationTask.status == "Blocked"
        ).all()
        for dep in dependent_tasks:
            dep.status = "Pending"
            dep.updated_at = datetime.utcnow()
            unlocked_tasks_count += 1
            # Notify assignee that task is now unblocked
            create_deduplicated_notification(
                db=db,
                recipient_id=dep.assigned_to_id,
                notification_type="TASK_UNBLOCKED",
                title="Prerequisite Met: Task Unblocked",
                message=f"Prerequisite task #{task.id} was completed. You may now start task '{dep.title}'.",
                severity="Medium",
                related_entity_type="CoordinationTask",
                related_entity_id=str(dep.id),
                link_url=f"/coordination?workspaceId={dep.workspace_id}"
            )
        if unlocked_tasks_count > 0:
            db.commit()
            
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="TASK_STATUS_UPDATE",
        entity_type="CoordinationTask",
        entity_id=str(task.id),
        previous_value=prev_status,
        new_value=task.status,
        remarks=f"Remarks: {task.remarks or 'N/A'} | Unlocked {unlocked_tasks_count} dependent task(s)"
    )
    
    return {
        "message": "Task updated successfully",
        "task_id": task.id,
        "status": task.status,
        "unlocked_tasks": unlocked_tasks_count
    }

# ----------------- MEETING PROCEEDINGS -----------------

@router.post("/{id}/meetings")
def record_joint_meeting(
    id: int,
    meeting_in: MeetingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    records = list(w.meeting_records or [])
    new_entry = {
        "meeting_id": len(records) + 1,
        "meeting_date": (meeting_in.meeting_date or datetime.utcnow()).isoformat(),
        "chair_name": meeting_in.chair_name or current_user.full_name,
        "recorded_by_id": current_user.id,
        "recorded_by_name": current_user.full_name,
        "attendee_ids": meeting_in.attendee_ids or [],
        "discussion_summary": meeting_in.discussion_summary,
        "action_items": meeting_in.action_items or []
    }
    records.append(new_entry)
    w.meeting_records = records
    w.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(w)
    
    # Notify attendees
    for att_id in set(meeting_in.attendee_ids or []):
        if att_id != current_user.id:
            create_deduplicated_notification(
                db=db,
                recipient_id=att_id,
                notification_type="MEETING_MINUTES_LOGGED",
                title=f"Joint Meeting Minutes Logged: Workspace #{w.id}",
                message=f"Joint meeting minutes recorded by {current_user.full_name}: {meeting_in.discussion_summary[:150]}...",
                severity="Medium",
                related_entity_type="CoordinationWorkspace",
                related_entity_id=str(w.id),
                link_url=f"/coordination?workspaceId={w.id}"
            )
            
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_MEETING_LOGGED",
        entity_type="CoordinationWorkspace",
        entity_id=str(w.id),
        remarks=f"Logged joint meeting #{new_entry['meeting_id']} chaired by {new_entry['chair_name']}"
    )
    
    return {"message": "Meeting proceedings logged successfully", "meeting": new_entry}

# ----------------- ESCALATIONS API -----------------

@router.post("/escalations/scan")
def trigger_escalation_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "bureau_head", "authorized_officer"]))
):
    """
    Evaluates SLAs, flags overdue tasks, stale conflicts, and stalled workspaces.
    Dispatches targeted notifications to responsible participants.
    """
    res = scan_and_process_escalations(db)
    return {
        "message": "Escalation scan completed",
        "results": res
    }

@router.get("/escalations/summary")
def get_coordination_escalations_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns counts of overdue tasks, approaching deadlines, stale conflicts, and stalled workspaces.
    """
    return get_escalation_summary(db)
