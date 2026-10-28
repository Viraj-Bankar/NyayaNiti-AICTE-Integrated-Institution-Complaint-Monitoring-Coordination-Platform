from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    CoordinationWorkspace, CoordinationTask, CoordinationParticipant,
    CaseCoordinationLink, Case, Institution, Bureau, User
)
from app.schemas.schemas import (
    CoordinationWorkspaceResponse, CoordinationTaskCreate, CoordinationTaskResponse
)
from app.api.auth import get_current_user, require_role
from app.services.audit_service import log_audit_event, record_case_event

router = APIRouter(prefix="/coordination", tags=["Cross-Bureau Coordination Workspace"])

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
    results = []
    for w in workspaces:
        lead_officer = db.query(User).filter(User.id == w.coordination_owner_id).first()
        primary_bureau = db.query(Bureau).filter(Bureau.id == w.primary_bureau_id).first()
        sec_bureau = db.query(Bureau).filter(Bureau.id == w.secondary_bureau_id).first() if w.secondary_bureau_id else None
        
        links = db.query(CaseCoordinationLink.case_id).filter(CaseCoordinationLink.workspace_id == w.id).all()
        case_ids = [l[0] for l in links]
        
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
                "remarks": t.remarks
            })
            
        results.append({
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
            "linked_case_ids": case_ids,
            "tasks": task_list,
            "created_at": w.created_at
        })
    return results

@router.get("/{id}", response_model=CoordinationWorkspaceResponse)
def get_workspace_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(CoordinationWorkspace).filter(CoordinationWorkspace.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Coordination workspace not found")
        
    lead_officer = db.query(User).filter(User.id == w.coordination_owner_id).first()
    primary_bureau = db.query(Bureau).filter(Bureau.id == w.primary_bureau_id).first()
    sec_bureau = db.query(Bureau).filter(Bureau.id == w.secondary_bureau_id).first() if w.secondary_bureau_id else None
    
    links = db.query(CaseCoordinationLink.case_id).filter(CaseCoordinationLink.workspace_id == w.id).all()
    case_ids = [l[0] for l in links]
    
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
            "remarks": t.remarks
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
        "linked_case_ids": case_ids,
        "tasks": task_list,
        "created_at": w.created_at
    }

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
        
    task = CoordinationTask(
        workspace_id=w.id,
        title=task_in.title,
        description=task_in.description,
        assigned_to_id=task_in.assigned_to_id,
        bureau_id=task_in.bureau_id,
        due_date=task_in.due_date,
        priority=task_in.priority or "Medium",
        status="Pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first()
    task_bureau = db.query(Bureau).filter(Bureau.id == task.bureau_id).first()
    
    log_audit_event(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        event_type="COORDINATION_TASK_CREATED",
        entity_type="CoordinationTask",
        entity_id=str(task.id),
        remarks=f"Created task '{task.title}' assigned to {assigned_user.full_name if assigned_user else 'Officer'}"
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
        "remarks": task.remarks
    }

@router.patch("/tasks/{task_id}")
def update_task_status(
    task_id: int,
    status: str,
    remarks: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(CoordinationTask).filter(CoordinationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    prev_status = task.status
    task.status = status
    if remarks:
        task.remarks = remarks
    task.updated_at = datetime.utcnow()
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
        new_value=status,
        remarks=remarks
    )
    return {"message": "Task updated", "task_id": task.id, "status": task.status}
