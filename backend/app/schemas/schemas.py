from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

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
    title: Optional[str] = None
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
    complainant_id: Optional[int] = None
    is_citizen_complaint: Optional[bool] = False

    class Config:
        from_attributes = True

class CaseAssignmentRequest(BaseModel):
    to_officer_id: int
    remarks: Optional[str] = None

class CaseAssignmentResponse(BaseModel):
    id: int
    case_id: str
    from_officer_id: Optional[int] = None
    from_officer_name: Optional[str] = None
    to_officer_id: int
    to_officer_name: Optional[str] = None
    assigned_by_id: int
    assigned_by_name: Optional[str] = None
    bureau_id: int
    bureau_code: Optional[str] = None
    remarks: Optional[str] = None
    assigned_at: datetime

    class Config:
        from_attributes = True

class CaseRelationshipResponse(BaseModel):
    id: int
    case_a_id: str
    case_b_id: str
    related_case_id: str
    relationship_type: str
    status: str
    similarity_score: Optional[float] = None
    title: Optional[str] = None
    institution_name: Optional[str] = None
    case_status: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CaseLinkRequest(BaseModel):
    target_case_id: str
    relationship_type: str = "Consolidated Grievance"  # 'Consolidated Grievance', 'Related Matter', 'Shared Institution'
    remarks: Optional[str] = None

class CaseDetailResponse(CaseResponse):
    priority_factors: Optional[Dict[str, Any]] = None
    priority_override_reason: Optional[str] = None
    events: List[CaseEventResponse] = []
    documents: List[Any] = []
    assignments: List[CaseAssignmentResponse] = []
    complainant_details: Optional[Dict[str, Any]] = None
    linked_cases: List[CaseRelationshipResponse] = []
    coordination_workspaces: Optional[List[Dict[str, Any]]] = None

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
    coordination_workspace_id: Optional[int] = None
    created_at: datetime
    case_a: Optional[CaseResponse] = None
    case_b: Optional[CaseResponse] = None

    class Config:
        from_attributes = True

class ActionConflictReviewRequest(BaseModel):
    decision: str  # 'CONFIRM_CONFLICT', 'REJECT_CONFLICT', 'REQUEST_CLARIFICATION', 'REFER_TO_BUREAU_HEAD', 'RESOLVE', 'COORDINATE'
    resolution_notes: str
    reconciled_action: Optional[str] = None
    coordination_title: Optional[str] = None

# Coordination Workspace
class CoordinationParticipantCreate(BaseModel):
    officer_id: int
    bureau_id: int
    role: Optional[str] = "Participant Officer"

class CoordinationParticipantResponse(BaseModel):
    id: int
    workspace_id: int
    officer_id: int
    officer_name: Optional[str] = None
    bureau_id: int
    bureau_code: Optional[str] = None
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

class CaseCoordinationLinkCreate(BaseModel):
    case_id: str

class CoordinationTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: int
    bureau_id: int
    due_date: datetime
    priority: Optional[str] = "Medium"
    depends_on_task_id: Optional[int] = None
    evidence_doc_id: Optional[int] = None

class CoordinationTaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    remarks: Optional[str] = None
    depends_on_task_id: Optional[int] = None
    evidence_doc_id: Optional[int] = None

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
    depends_on_task_id: Optional[int] = None
    evidence_doc_id: Optional[int] = None

    class Config:
        from_attributes = True

class MeetingRecordCreate(BaseModel):
    meeting_date: Optional[datetime] = None
    chair_name: Optional[str] = None
    attendee_ids: Optional[List[int]] = []
    discussion_summary: str
    action_items: Optional[List[str]] = []

class WorkspaceResolveRequest(BaseModel):
    resolution_status: str = "Completed"  # 'Completed' or 'Closed with Justification'
    consensus_decisions: str
    apply_to_cases: Optional[bool] = True

class CoordinationWorkspaceCreate(BaseModel):
    title: str
    institution_id: int
    primary_bureau_id: int
    secondary_bureau_id: Optional[int] = None
    justification: Optional[str] = None
    linked_case_ids: Optional[List[str]] = []
    participant_ids: Optional[List[int]] = []

class CoordinationWorkspaceUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    justification: Optional[str] = None
    decisions: Optional[str] = None
    secondary_bureau_id: Optional[int] = None

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
    meeting_records: Optional[List[Dict[str, Any]]] = None
    linked_case_ids: List[str] = []
    participants: List[CoordinationParticipantResponse] = []
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
    original_filename: Optional[str] = None
    file_size: int
    file_type: str
    category: str
    access_classification: str
    uploaded_by_id: Optional[int] = None
    uploaded_by_name: Optional[str] = None
    uploaded_by_complainant_id: Optional[int] = None
    uploader_role: Optional[str] = "officer"
    download_url: Optional[str] = None
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
    # Phase 7 Coordination Metrics
    active_coordination_workspaces: Optional[int] = 0
    coordination_tasks_pending: Optional[int] = 0
    new_intake_complaints: Optional[int] = 0
    submitted: Optional[int] = 0
    under_review: Optional[int] = 0
    in_progress: Optional[int] = 0
    additional_info_required: Optional[int] = 0
    resolved: Optional[int] = 0
    closed: Optional[int] = 0
    rejected: Optional[int] = 0

class AlertTickerItem(BaseModel):
    id: str
    category: str
    related_id: str
    short_message: str
    severity: str
    created_at: datetime
    link_url: str

# Complainant Schemas
class ComplainantRegister(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    password: str
    confirm_password: str
    complainant_type: Optional[str] = "Student"

class ComplainantLogin(BaseModel):
    email: str
    password: str

class ComplainantResponse(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: str
    is_active: bool
    is_email_verified: bool
    is_mobile_verified: bool
    complainant_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class ComplainantToken(BaseModel):
    access_token: str
    token_type: str
    complainant: Dict[str, Any]

class ComplainantCaseCreate(BaseModel):
    institution_id: int
    title: Optional[str] = Field(None, max_length=250)
    category: str = Field(..., min_length=2, max_length=150)
    subcategory: Optional[str] = Field(None, max_length=150)
    description: str = Field(..., min_length=20, max_length=10000)

class ComplainantCaseResponse(BaseModel):
    id: str
    institution_id: int
    institution_name: str
    permanent_id: str
    title: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    description: str
    date_received: datetime
    status: str
    priority: Optional[str] = "Medium"
    bureau_code: str
    last_action: Optional[str] = None
    last_action_date: Optional[datetime] = None
    prescribed_deadline: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ComplainantCaseEventItem(BaseModel):
    id: Optional[int] = None
    event_type: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ComplainantDocumentResponse(BaseModel):
    id: int
    case_id: str
    file_name: str
    original_filename: Optional[str] = None
    file_size: int
    file_type: str
    category: str
    upload_timestamp: datetime

    class Config:
        from_attributes = True

class ComplainantCaseDetailResponse(ComplainantCaseResponse):
    events: List[ComplainantCaseEventItem] = []
    documents: List[ComplainantDocumentResponse] = []

    class Config:
        from_attributes = True

# Aliases for statutory complaint terminology
ComplaintCreate = ComplainantCaseCreate
ComplaintResponse = ComplainantCaseResponse
ComplaintDetailResponse = ComplainantCaseDetailResponse
ComplaintHistoryItem = ComplainantCaseEventItem
ComplaintDocumentResponse = ComplainantDocumentResponse

class ComplainantInstitutionItem(BaseModel):
    id: int
    permanent_id: str
    official_name: str
    city: str
    district: str
    state: str
    region: str
    institution_type: str

    class Config:
        from_attributes = True

class ComplainantCategoryItem(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    default_priority: str
    sla_days: int

    class Config:
        from_attributes = True

class ComplainantReceiptResponse(BaseModel):
    case_id: str
    complainant_name: str
    complainant_email: str
    complainant_mobile: str
    complainant_type: str
    institution_name: str
    permanent_id: str
    institution_address: str
    title: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    description: str
    date_received: datetime
    prescribed_deadline: datetime
    status: str
    priority: str
    bureau_name: str
    tracking_url: str

class ComplainantNotificationItem(BaseModel):
    id: int
    notification_type: str
    related_case_id: Optional[str] = None
    title: str
    message: str
    severity: str
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ComplainantClarificationRequest(BaseModel):
    response_text: str = Field(..., min_length=5, max_length=4000, description="Explanatory response to the bureau's information request")
    document_id: Optional[int] = Field(None, description="Optional document ID if supplementary record was attached")

class CaseInternalNoteRequest(BaseModel):
    remarks: str = Field(..., min_length=3, max_length=2000, description="Internal officer deliberation or inspection observation")
    is_public: bool = Field(False, description="Whether this note is visible to citizen timeline (default: False)")

# Officer Complaint Intake & Case Integration Schemas
class OfficerComplaintItem(BaseModel):
    id: str
    title: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    institution_id: int
    institution_name: str
    permanent_id: str
    district: str
    state: str
    status: str
    priority: str
    date_received: datetime
    prescribed_deadline: datetime
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    complainant_masked: Optional[str] = None
    complainant_type: str
    is_citizen_complaint: bool = True
    documents_count: int = 0

    class Config:
        from_attributes = True

class OfficerComplaintListResponse(BaseModel):
    items: List[OfficerComplaintItem]
    total: int
    page: int
    limit: int
    pages: int

class OfficerComplaintRejectRequest(BaseModel):
    statutory_reason: str = Field(..., description="Statutory non-admissibility basis")
    remarks: str = Field(..., min_length=5, description="Detailed regulatory grounds for non-admissibility")

class OfficerComplaintRequestInfo(BaseModel):
    query_details: str = Field(..., min_length=5, description="Clarification or evidence requested from complainant")
    required_documents: Optional[str] = None
    deadline_days: int = Field(14, ge=1, le=60, description="Response window in days")

class OfficerComplaintAcceptRequest(BaseModel):
    priority: Optional[str] = None
    target_bureau_id: Optional[int] = None
    remarks: Optional[str] = None

class OfficerComplaintAssignRequest(BaseModel):
    to_officer_id: int
    bureau_id: Optional[int] = None
    remarks: Optional[str] = None

class OfficerComplaintLinkRequest(BaseModel):
    target_case_id: str
    relationship_type: str = "Consolidated Grievance"
    remarks: Optional[str] = None

class OfficerComplaintResolveRequest(BaseModel):
    resolution_findings: str = Field(..., min_length=5, description="Findings and regulatory compliance orders")
    action_taken: Optional[str] = None
    remarks: Optional[str] = None

class OfficerComplaintCloseRequest(BaseModel):
    closure_remarks: Optional[str] = Field(None, description="Official closure summary")

# -------------------------------------------------------------------------
# Phase 6: AI-Powered Semantic Duplicate Complaint Detection Schemas
# -------------------------------------------------------------------------

class AIDuplicateCandidateResponse(BaseModel):
    recommendation_id: Optional[int] = None
    source_complaint_id: str
    candidate_complaint_id: str
    candidate_title: Optional[str] = None
    candidate_category: str
    candidate_institution_id: int
    candidate_institution_name: str
    candidate_status: str
    candidate_date_received: datetime
    predicted_relationship: str  # 'HIGH_CONFIDENCE_DUPLICATE', 'MANUAL_REVIEW_REQUIRED', 'DISTINCT_MATTERS'
    similarity_score: float  # Cosine similarity metric (strictly distinguished from probability)
    duplicate_probability: float  # Calibrated SVM probability P(duplicate|features)
    svm_decision: bool
    institution_match: bool
    category_match: bool
    matching_features: Dict[str, Any]
    explanation: str
    statutory_advice: str
    verification_status: str  # 'PENDING_REVIEW', 'CONFIRMED_DUPLICATE', 'MARKED_RELATED', 'REJECTED'
    verification_reason: Optional[str] = None
    model_version: str

    class Config:
        from_attributes = True

class AIDuplicateAnalysisResponse(BaseModel):
    source_complaint_id: str
    source_title: Optional[str] = None
    source_institution_id: int
    source_institution_name: str
    total_candidates_evaluated: int
    high_confidence_count: int
    review_required_count: int
    candidates: List[AIDuplicateCandidateResponse]
    model_name: str
    model_version: str
    vector_search_engine: str
    analyzed_at: datetime

class AIDuplicateDetailResponse(BaseModel):
    complaint_id: str
    complaint_title: Optional[str] = None
    institution_id: int
    institution_name: str
    total_candidates_analyzed: int
    high_confidence_duplicates_count: int
    review_required_count: int
    top_recommendation: Optional[AIDuplicateCandidateResponse] = None
    has_active_recommendations: bool
    model_version: str
    last_analyzed_at: Optional[datetime] = None

class OfficerDuplicateVerifyRequest(BaseModel):
    candidate_id: str = Field(..., description="Target candidate complaint reference ID")
    decision: str = Field(..., description="Verification decision: CONFIRM_DUPLICATE, MARK_RELATED, or REJECT_RECOMMENDATION")
    reason: str = Field(..., min_length=5, description="Mandatory official justification for review decision")
    link_dossier: bool = Field(True, description="Whether to create formal linked CaseRelationship on duplicate confirmation")

class OfficerDuplicateVerifyResponse(BaseModel):
    status: str
    message: str
    source_complaint_id: str
    candidate_complaint_id: str
    decision: str
    linked_relationship_id: Optional[int] = None
    verified_at: datetime
    verified_by: str

class AIModelStatusResponse(BaseModel):
    model_name: str
    model_version: str
    is_available: bool
    embedding_dim: int
    device: str
    feature_count: int
    feature_names: List[str]
    best_hyperparameters: Dict[str, Any]
    decision_thresholds: Dict[str, float]
    vector_engine: str
    pgvector_status: str
    pgvector_note: str
    statutory_safeguard: str

# =========================================================================
# PHASE 8: AUTOMATED INSTITUTIONAL COMPLIANCE & REGULATORY ANALYTICS SCHEMAS
# =========================================================================

class RegulatoryRequirementVersionResponse(BaseModel):
    id: int
    requirement_id: str
    version_number: int
    title: str
    description: str
    weight: float
    regulatory_source: str
    changes_summary: str
    promulgated_by_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RegulatoryRequirementCreate(BaseModel):
    id: str = Field(..., description="Unique Requirement Identifier, e.g. REQ-FAC-01")
    title: str = Field(..., min_length=3, max_length=250)
    description: str = Field(..., min_length=10)
    category_code: Optional[str] = None
    regulatory_source: str = Field(..., description="Authoritative reference, e.g. AICTE APH 2024-27 Clause 7.12")
    source_reference_url: Optional[str] = None
    applicable_institution_types: List[str] = Field(default=["ALL"])
    applicability_conditions: Optional[Dict[str, Any]] = None
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    default_evidence_requirements: Optional[List[str]] = None
    responsible_bureau_id: int
    effective_date: Optional[datetime] = None
    review_date: Optional[datetime] = None

class RegulatoryRequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_code: Optional[str] = None
    regulatory_source: Optional[str] = None
    source_reference_url: Optional[str] = None
    applicable_institution_types: Optional[List[str]] = None
    applicability_conditions: Optional[Dict[str, Any]] = None
    weight: Optional[float] = None
    default_evidence_requirements: Optional[List[str]] = None
    responsible_bureau_id: Optional[int] = None
    review_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    changes_summary: Optional[str] = Field(None, description="Summary of changes prompting new version creation")

class RegulatoryRequirementResponse(BaseModel):
    id: str
    title: str
    description: str
    category_code: Optional[str] = None
    regulatory_source: str
    source_reference_url: Optional[str] = None
    applicable_institution_types: List[str]
    applicability_conditions: Optional[Dict[str, Any]] = None
    weight: float
    default_evidence_requirements: Optional[List[str]] = None
    responsible_bureau_id: int
    responsible_bureau_code: Optional[str] = None
    effective_date: datetime
    review_date: Optional[datetime] = None
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    versions: Optional[List[RegulatoryRequirementVersionResponse]] = None

    class Config:
        from_attributes = True

class ComplianceEvidenceCreate(BaseModel):
    document_id: int
    evidence_type: str = Field(..., description="e.g. Inspection Report, Biometric Cadre Register, Affidavit")
    remarks: Optional[str] = None

class ComplianceEvidenceReviewRequest(BaseModel):
    status: Optional[str] = None
    verification_status: Optional[str] = None
    verification_remarks: str = Field(..., min_length=3)
    rejection_reason: Optional[str] = None

class ComplianceEvidenceResponse(BaseModel):
    id: int
    assessment_id: int
    institution_id: int
    document_id: int
    document_name: Optional[str] = None
    file_type: Optional[str] = None
    evidence_type: str
    verification_status: str
    verified_by_id: Optional[int] = None
    verified_by_name: Optional[str] = None
    verification_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_by_role: str
    submitted_at: datetime
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ComplianceAssessmentCreate(BaseModel):
    institution_id: int
    requirement_id: str
    assessment_period: str = Field("AY-2025-26", description="Academic Year or Assessment Period")
    status: Optional[str] = "NOT_ASSESSED"

class ComplianceAssessmentReviewRequest(BaseModel):
    status: str = Field(..., description="COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT, PENDING_EVIDENCE, UNDER_REVIEW, NOT_APPLICABLE")
    reviewer_remarks: str = Field(..., min_length=5)
    score_contribution: Optional[float] = None

class ComplianceAssessmentResponse(BaseModel):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    requirement_id: str
    requirement_title: Optional[str] = None
    requirement_weight: Optional[float] = 1.0
    requirement_version: int
    assessment_period: str
    status: str
    score_contribution: Optional[float] = None
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewer_remarks: Optional[str] = None
    assessed_at: Optional[datetime] = None
    decision_history: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime
    evidences: Optional[List[ComplianceEvidenceResponse]] = None

    class Config:
        from_attributes = True

class CAPCreate(BaseModel):
    institution_id: int
    assessment_id: Optional[int] = None
    related_case_id: Optional[str] = None
    title: str = Field(..., min_length=5, max_length=250)
    identified_gap: str = Field(..., min_length=10)
    required_action: str = Field(..., min_length=10)
    responsible_bureau_id: int
    assigned_officer_id: int
    priority: str = Field("Medium", description="Critical, High, Medium, Low")
    prescribed_deadline: datetime

class CAPUpdate(BaseModel):
    title: Optional[str] = None
    required_action: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class CAPEvidenceSubmit(BaseModel):
    completion_evidence_doc_id: int
    remarks: str = Field(..., min_length=5)

class CAPVerifyRequest(BaseModel):
    verification_remarks: str = Field(..., min_length=5)
    closure_decision: str = Field(..., min_length=5)

class CAPReopenRequest(BaseModel):
    reopen_reason: str = Field(..., min_length=10)

class CAPResponse(BaseModel):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    assessment_id: Optional[int] = None
    related_case_id: Optional[str] = None
    title: str
    identified_gap: str
    required_action: str
    responsible_bureau_id: int
    responsible_bureau_code: Optional[str] = None
    assigned_officer_id: int
    assigned_officer_name: Optional[str] = None
    priority: str
    status: str
    prescribed_deadline: datetime
    completion_evidence_doc_id: Optional[int] = None
    verification_officer_id: Optional[int] = None
    verification_officer_name: Optional[str] = None
    verification_remarks: Optional[str] = None
    closure_decision: Optional[str] = None
    closed_at: Optional[datetime] = None
    reopen_reason: Optional[str] = None
    is_overdue: bool = False
    days_remaining: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InstitutionalRiskIndicatorResponse(BaseModel):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    indicator_type: str
    severity: str
    title: str
    supporting_evidence: Dict[str, Any]
    observation_period: str
    calculation_method: str
    data_completeness: float
    recommended_review: str
    status: str
    detected_at: datetime
    reviewed_by_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InstitutionScorecardResponse(BaseModel):
    institution_id: int
    institution_name: str
    permanent_id: str
    region: str
    state: str
    assessment_period: str
    compliance_percentage: float
    assessment_coverage_pct: float
    is_provisional: bool
    risk_tier: str
    total_applicable_requirements: int
    verified_compliant_count: int
    partially_compliant_count: int
    non_compliant_count: int
    unassessed_count: int
    pending_evidence_count: int
    not_applicable_count: int
    active_cap_count: int
    overdue_cap_count: int
    active_risk_indicator_count: int
    calculated_at: datetime
    formula_breakdown: Optional[Dict[str, Any]] = None

class ExecutiveGovernanceResponse(BaseModel):
    total_institutions_monitored: int
    active_regulatory_requirements: int
    national_average_compliance_pct: float
    national_average_coverage_pct: float
    institutions_high_or_critical_risk: int
    total_active_caps: int
    total_overdue_caps: int
    national_grievance_sla_adherence_pct: float
    regional_summaries: List[Dict[str, Any]]
    top_deficiencies: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]
    evaluated_at: datetime

class GrievancePerformanceResponse(BaseModel):
    total_complaints: int
    resolved_complaints: int
    pending_complaints: int
    overdue_complaints: int
    sla_adherence_pct: float
    disposal_rate_pct: float
    average_resolution_days: float
    overdue_rate_pct: float
    category_breakdown: List[Dict[str, Any]]
    observation_period: str




