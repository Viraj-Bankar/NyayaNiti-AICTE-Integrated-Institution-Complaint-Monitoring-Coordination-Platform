from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr

# Auth & User
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    designation: Optional[str] = None
    role: str
    bureau_id: Optional[int] = None
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    designation: Optional[str] = None
    role: str
    bureau_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Bureau
class BureauResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# Institution
class InstitutionAliasResponse(BaseModel):
    id: int
    alias_name: str
    alias_type: str
    is_verified: bool
    verification_notes: Optional[str] = None

    class Config:
        from_attributes = True

class InstitutionResponse(BaseModel):
    id: int
    permanent_id: str
    official_name: str
    address: str
    city: str
    district: str
    state: str
    region: str
    verification_status: str
    institution_type: Optional[str] = None
    case_count: Optional[int] = 0
    pending_case_count: Optional[int] = 0

    class Config:
        from_attributes = True

class InstitutionDetailResponse(InstitutionResponse):
    pincode: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    verification_evidence: Optional[Dict[str, Any]] = None
    aliases: List[InstitutionAliasResponse] = []
    cases: List[Any] = []
    overlap_alerts: List[Any] = []
    action_conflicts: List[Any] = []

    class Config:
        from_attributes = True

class InstitutionResolveRequest(BaseModel):
    permanent_id: Optional[str] = None
    institution_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None

# Cases
class CaseCreate(BaseModel):
    institution_id: int
    complainant_type: Optional[str] = "Student"
    complainant_masked: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    description: str
    current_bureau_id: int
    assigned_officer_id: Optional[int] = None
    priority: Optional[str] = "Medium"
    prescribed_deadline: Optional[datetime] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    current_bureau_id: Optional[int] = None
    assigned_officer_id: Optional[int] = None
    priority: Optional[str] = None
    last_action: Optional[str] = None
    next_action: Optional[str] = None
    expected_disposal_date: Optional[datetime] = None
    remarks: Optional[str] = None

class CaseEventResponse(BaseModel):
    id: int
    case_id: str
    event_type: str
    actor_name: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None
    document_ref: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class CaseResponse(BaseModel):
    id: str
    institution_id: int
    institution_name: Optional[str] = None
    permanent_id: Optional[str] = None
    complainant_type: str
    complainant_masked: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    description: str
    date_received: datetime
    status: str
    current_bureau_id: int
    bureau_code: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    officer_name: Optional[str] = None
    priority: str
    priority_score: Optional[float] = None
    last_action: Optional[str] = None
    next_action: Optional[str] = None
    last_action_date: Optional[datetime] = None
    prescribed_deadline: datetime
    expected_disposal_date: Optional[datetime] = None
    overlap_review_status: str
    action_conflict_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    priority_factors: Optional[Dict[str, Any]] = None
    priority_override_reason: Optional[str] = None
    events: List[CaseEventResponse] = []
    documents: List[Any] = []

    class Config:
        from_attributes = True

class PriorityOverrideRequest(BaseModel):
    new_priority: str
    reason: str

# Overlap & Matching
class OverlapAlertResponse(BaseModel):
    id: int
    case_a_id: str
    case_b_id: str
    institution_id: int
    institution_name: Optional[str] = None
    permanent_id: Optional[str] = None
    similarity_score: float
    model_name: str
    evidence_summary: Optional[Dict[str, Any]] = None
    review_status: str
    reviewer_id: Optional[int] = None
    review_notes: Optional[str] = None
    decision: Optional[str] = None
    created_at: datetime
    case_a: Optional[CaseResponse] = None
    case_b: Optional[CaseResponse] = None

    class Config:
        from_attributes = True

class OverlapReviewRequest(BaseModel):
    decision: str  # 'COORDINATE', 'PROCEED_SEPARATELY', 'REJECT', 'UNDER_REVIEW'
    review_notes: str
    coordination_owner_id: Optional[int] = None
    designated_lead_bureau_id: Optional[int] = None

# Action Conflict
class ActionConflictAlertResponse(BaseModel):
    id: int
    case_a_id: str
    case_b_id: str
    institution_id: int
    institution_name: Optional[str] = None
    conflict_type: str
    rule_triggered: str
    severity: str
    evidence: Optional[Dict[str, Any]] = None
    status: str
    reviewer_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    reconciled_action: Optional[str] = None
    created_at: datetime
    case_a: Optional[CaseResponse] = None
    case_b: Optional[CaseResponse] = None

    class Config:
        from_attributes = True

class ActionConflictReviewRequest(BaseModel):
    decision: str  # 'CONFIRM_CONFLICT', 'REJECT_CONFLICT', 'REQUEST_CLARIFICATION', 'REFER_TO_BUREAU_HEAD', 'RESOLVE'
    resolution_notes: str
    reconciled_action: Optional[str] = None

# Coordination Workspace
class CoordinationTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: int
    bureau_id: int
    due_date: datetime
    priority: Optional[str] = "Medium"

class CoordinationTaskResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    description: Optional[str] = None
    assigned_to_id: int
    assigned_to_name: Optional[str] = None
    bureau_id: int
    bureau_code: Optional[str] = None
    due_date: datetime
    priority: str
    status: str
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

class CoordinationWorkspaceResponse(BaseModel):
    id: int
    title: str
    institution_id: int
    institution_name: Optional[str] = None
    primary_bureau_id: int
    primary_bureau_code: Optional[str] = None
    secondary_bureau_id: Optional[int] = None
    secondary_bureau_code: Optional[str] = None
    coordination_owner_id: int
    coordination_owner_name: Optional[str] = None
    status: str
    justification: Optional[str] = None
    decisions: Optional[str] = None
    linked_case_ids: List[str] = []
    tasks: List[CoordinationTaskResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

# Notification
class NotificationResponse(BaseModel):
    id: int
    recipient_id: Optional[int] = None
    notification_type: str
    related_case_id: Optional[str] = None
    title: str
    message: str
    severity: str
    is_read: bool
    resolution_state: str
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Document Metadata
class DocumentMetadataResponse(BaseModel):
    id: int
    case_id: str
    file_name: str
    file_size: int
    file_type: str
    category: str
    access_classification: str
    uploaded_by_id: int
    uploaded_by_name: Optional[str] = None
    upload_timestamp: datetime

    class Config:
        from_attributes = True

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: str
    actor_role: str
    event_type: str
    entity_type: str
    entity_id: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Dashboard & KPIs
class DashboardKpis(BaseModel):
    total_complaints: int
    pending: int
    under_process: int
    disposed: int
    transferred: int
    overdue: int
    potential_overlaps_awaiting_review: int
    action_conflicts_awaiting_review: int

class AlertTickerItem(BaseModel):
    id: str
    category: str
    related_id: str
    short_message: str
    severity: str
    created_at: datetime
    link_url: str
