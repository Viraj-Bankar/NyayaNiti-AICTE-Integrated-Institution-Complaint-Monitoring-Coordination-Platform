from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, JSON, Index, LargeBinary, func
)
from sqlalchemy.orm import relationship
from app.database import Base

class Bureau(Base):
    __tablename__ = "bureaus"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # 'RB', 'PGRC', 'APPROVAL', 'POLICY'
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="bureau")
    cases = relationship("Case", back_populates="current_bureau")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    designation = Column(String(200), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'super_admin', 'authorized_officer', 'bureau_head', 'monitoring_officer'
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bureau = relationship("Bureau", back_populates="users")
    assigned_cases = relationship("Case", back_populates="assigned_officer", foreign_keys="Case.assigned_officer_id")

class Complainant(Base):
    __tablename__ = "complainants"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    mobile = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    is_mobile_verified = Column(Boolean, default=False)
    complainant_type = Column(String(50), default="Student")  # 'Student', 'Faculty', 'Parent', 'Citizen'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cases = relationship("Case", back_populates="complainant")

class Institution(Base):
    __tablename__ = "institutions"
    
    id = Column(Integer, primary_key=True, index=True)
    permanent_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., '1-10293847'
    official_name = Column(String(300), index=True, nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    district = Column(String(100), index=True, nullable=False)
    state = Column(String(100), index=True, nullable=False)
    region = Column(String(100), index=True, nullable=False)  # 'Northern', 'Western', 'Southern', etc.
    pincode = Column(String(20), nullable=True)
    verification_status = Column(String(50), default="Verified")  # 'Verified', 'Probable', 'Under Review', 'Identity Conflict'
    verification_evidence = Column(JSON, nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(200), nullable=True)
    institution_type = Column(String(100), default="Engineering & Technology")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    aliases = relationship("InstitutionAlias", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="institution")
    overlap_alerts = relationship("OverlapAlert", back_populates="institution")
    action_conflicts = relationship("ActionConflictAlert", back_populates="institution")
    coordination_workspaces = relationship("CoordinationWorkspace", back_populates="institution")
    compliance_assessments = relationship("ComplianceAssessment", back_populates="institution", cascade="all, delete-orphan")
    corrective_actions = relationship("CorrectiveActionPlan", back_populates="institution", cascade="all, delete-orphan")
    risk_indicators = relationship("InstitutionalRiskIndicator", back_populates="institution", cascade="all, delete-orphan")
    compliance_snapshots = relationship("ComplianceScoreSnapshot", back_populates="institution", cascade="all, delete-orphan")

class InstitutionAlias(Base):
    __tablename__ = "institution_aliases"
    
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    alias_name = Column(String(300), index=True, nullable=False)
    alias_type = Column(String(50), default="Historical")  # 'Historical', 'Abbreviation', 'Colloquial', 'Acronym'
    is_verified = Column(Boolean, default=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="aliases")

class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    default_priority = Column(String(20), default="Medium")
    sla_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(String(100), primary_key=True, index=True)  # e.g., 'AICTE-RB-2024-0101'
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    complainant_type = Column(String(50), default="Student")  # 'Student', 'Faculty', 'Parent', 'Anonymous', 'Public'
    complainant_masked = Column(String(100), nullable=True)  # Privacy protected identifier
    title = Column(String(250), nullable=True)  # Grievance Title / Subject
    category = Column(String(100), index=True, nullable=False)  # 'Faculty Irregularity', 'Fee Overcharging', etc.
    subcategory = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    date_received = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(50), default="Pending", index=True)  # 'Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated'
    current_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    complainant_id = Column(Integer, ForeignKey("complainants.id"), nullable=True, index=True)
    priority = Column(String(50), default="Medium", index=True)  # 'Critical', 'High', 'Medium', 'Low'
    priority_score = Column(Float, default=50.0)
    priority_factors = Column(JSON, nullable=True)
    priority_override_reason = Column(Text, nullable=True)
    
    # Actions & Deadlines
    last_action = Column(String(300), nullable=True)
    next_action = Column(String(300), nullable=True)
    last_action_date = Column(DateTime, nullable=True)
    prescribed_deadline = Column(DateTime, nullable=False, index=True)
    expected_disposal_date = Column(DateTime, nullable=True)
    
    # Overlap & Coordination flags
    overlap_review_status = Column(String(50), default="None")  # 'None', 'New', 'Under Review', 'Confirmed Related', 'Rejected', 'Coordination Required', 'Resolved'
    action_conflict_status = Column(String(50), default="None")  # 'None', 'Pending Review', 'Confirmed Conflict', 'Resolved', 'Dismissed'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    institution = relationship("Institution", back_populates="cases")
    current_bureau = relationship("Bureau", back_populates="cases")
    assigned_officer = relationship("User", back_populates="assigned_cases", foreign_keys=[assigned_officer_id])
    complainant = relationship("Complainant", back_populates="cases")
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.timestamp.desc()")
    documents = relationship("DocumentMetadata", back_populates="case", cascade="all, delete-orphan")
    assignments = relationship("CaseAssignment", cascade="all, delete-orphan", order_by="CaseAssignment.assigned_at.desc()")
    ai_duplicate_candidates = relationship(
        "AIDuplicateRecommendation",
        foreign_keys="AIDuplicateRecommendation.source_case_id",
        cascade="all, delete-orphan",
        order_by="AIDuplicateRecommendation.duplicate_probability.desc()"
    )

class CaseEvent(Base):
    __tablename__ = "case_events"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # 'CREATED', 'ASSIGNED', 'STATUS_CHANGE', 'ACTION_TAKEN', 'TRANSFERRED', 'ESCALATED', etc.
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(200), nullable=False)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)  # True for public citizen milestone, False for confidential officer notes
    document_ref = Column(String(300), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    case = relationship("Case", back_populates="events")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    from_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    remarks = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, index=True)

    from_officer = relationship("User", foreign_keys=[from_officer_id])
    to_officer = relationship("User", foreign_keys=[to_officer_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    bureau = relationship("Bureau", foreign_keys=[bureau_id])

class CaseRelationship(Base):
    __tablename__ = "case_relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    case_a_id = Column(String(100), ForeignKey("cases.id"), nullable=False)
    case_b_id = Column(String(100), ForeignKey("cases.id"), nullable=False)
    relationship_type = Column(String(100), default="Potential Overlap")  # 'Potential Overlap', 'Shared Institution', 'Action Conflict'
    status = Column(String(50), default="Awaiting Review")  # 'Awaiting Review', 'Confirmed Related', 'Proceed Separately', 'Coordinated', 'Rejected'
    similarity_score = Column(Float, nullable=True)
    evidence = Column(JSON, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_decision = Column(String(100), nullable=True)
    review_remarks = Column(Text, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OverlapAlert(Base):
    __tablename__ = "overlap_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    case_a_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    case_b_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False)
    model_name = Column(String(100), default="SBERT / all-MiniLM-L6-v2")
    evidence_summary = Column(JSON, nullable=True)  # { "name_match": ..., "shared_institution": ..., "shared_category": ... }
    review_status = Column(String(50), default="New", index=True)  # 'New', 'Under Review', 'Confirmed Related', 'Rejected', 'Coordination Required', 'Resolved'
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    decision = Column(String(50), nullable=True)  # 'COORDINATE', 'PROCEED_SEPARATELY', 'REJECT'
    coordination_workspace_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="overlap_alerts")

class ActionConflictAlert(Base):
    __tablename__ = "action_conflict_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    case_a_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    case_b_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    conflict_type = Column(String(100), nullable=False)  # 'Conflicting Direction', 'Duplicate Inspection Order', 'Opposing Decision', etc.
    rule_triggered = Column(String(200), nullable=False)
    severity = Column(String(50), default="High", index=True)  # 'Critical', 'High', 'Medium', 'Low'
    evidence = Column(JSON, nullable=True)
    status = Column(String(50), default="Pending Review", index=True)  # 'Pending Review', 'Confirmed Conflict', 'Clarification Requested', 'Referred to Bureau Head', 'Resolved', 'Rejected'
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    reconciled_action = Column(Text, nullable=True)
    coordination_workspace_id = Column(Integer, ForeignKey("coordination_workspaces.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="action_conflicts")
    coordination_workspace = relationship("CoordinationWorkspace")

class CoordinationWorkspace(Base):
    __tablename__ = "coordination_workspaces"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    primary_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    secondary_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    coordination_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="In Coordination", index=True)  # 'Awaiting Review', 'Coordination Requested', 'In Coordination', 'Awaiting Decision', 'Completed', 'Closed with Justification'
    justification = Column(Text, nullable=True)
    meeting_records = Column(JSON, nullable=True)  # List of meetings/discussions
    decisions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="coordination_workspaces")
    primary_bureau = relationship("Bureau", foreign_keys=[primary_bureau_id])
    secondary_bureau = relationship("Bureau", foreign_keys=[secondary_bureau_id])
    coordination_owner = relationship("User", foreign_keys=[coordination_owner_id])
    tasks = relationship("CoordinationTask", back_populates="workspace", cascade="all, delete-orphan")
    participants = relationship("CoordinationParticipant", back_populates="workspace", cascade="all, delete-orphan")

class CoordinationParticipant(Base):
    __tablename__ = "coordination_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("coordination_workspaces.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    role = Column(String(100), default="Participant Officer")  # 'Lead Coordinator', 'Reviewer', 'Participant Officer'
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("CoordinationWorkspace", back_populates="participants")
    officer = relationship("User", foreign_keys=[officer_id])
    bureau = relationship("Bureau", foreign_keys=[bureau_id])

class CoordinationTask(Base):
    __tablename__ = "coordination_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("coordination_workspaces.id"), nullable=False)
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    due_date = Column(DateTime, nullable=False)
    priority = Column(String(50), default="Medium")  # 'Critical', 'High', 'Medium', 'Low'
    status = Column(String(50), default="Pending")  # 'Pending', 'In Progress', 'Completed', 'Overdue'
    remarks = Column(Text, nullable=True)
    depends_on_task_id = Column(Integer, ForeignKey("coordination_tasks.id"), nullable=True)
    evidence_doc_id = Column(Integer, ForeignKey("document_metadata.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workspace = relationship("CoordinationWorkspace", back_populates="tasks")
    depends_on = relationship("CoordinationTask", remote_side=[id], backref="dependent_tasks")
    evidence_document = relationship("DocumentMetadata", foreign_keys=[evidence_doc_id])

class CaseCoordinationLink(Base):
    __tablename__ = "case_coordination_links"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("coordination_workspaces.id"), nullable=False, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)

    workspace = relationship("CoordinationWorkspace", foreign_keys=[workspace_id])
    case = relationship("Case", foreign_keys=[case_id])

class PriorityEvaluation(Base):
    __tablename__ = "priority_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    calculated_priority = Column(String(50), nullable=False)
    calculated_score = Column(Float, nullable=False)
    factors = Column(JSON, nullable=False)
    is_overridden = Column(Boolean, default=False)
    override_priority = Column(String(50), nullable=True)
    override_reason = Column(Text, nullable=True)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

class SurgeAlert(Base):
    __tablename__ = "surge_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    current_count = Column(Integer, nullable=False)
    baseline_mean = Column(Float, nullable=False)
    baseline_std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    time_window_days = Column(Integer, default=30)
    detection_method = Column(String(100), default="Z-Score Statistical Baseline")  # 'Z-Score Statistical Baseline', 'Threshold Rule'
    status = Column(String(50), default="New", index=True)  # 'New', 'Investigating', 'Verified Surge', 'False Alarm'
    remarks = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null = broadcast to relevant officers or citizen
    complainant_id = Column(Integer, ForeignKey("complainants.id"), nullable=True, index=True)  # Populated for citizen recipient
    notification_type = Column(String(100), nullable=False, index=True)  # 'OVERLAP_DETECTED', 'ACTION_CONFLICT', 'DEADLINE_APPROACHING', 'OVERDUE', 'ESCALATION', 'COORDINATION_TASK', 'STATUS_UPDATE', 'INFO_REQUESTED'
    related_case_id = Column(String(100), nullable=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(100), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default="Medium")  # 'Critical', 'High', 'Medium', 'Info'
    is_read = Column(Boolean, default=False, index=True)
    resolution_state = Column(String(50), default="Open")
    link_url = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)  # 'pdf', 'docx', 'png', etc.
    category = Column(String(100), default="Official Notice")  # 'Official Notice', 'Inspection Report', 'Affidavit', 'Action Evidence', 'Correspondence', 'Fee Receipt'
    access_classification = Column(String(50), default="Official Internal")  # 'Public', 'Official Internal', 'Confidential - Bureau Head Only'
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null if uploaded by citizen
    uploaded_by_complainant_id = Column(Integer, ForeignKey("complainants.id"), nullable=True, index=True)  # Populated if uploaded by citizen
    uploader_role = Column(String(50), default="officer")  # 'officer' or 'complainant'
    file_path = Column(String(500), nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="documents")
    binary_record = relationship("DocumentBinary", back_populates="document", uselist=False, cascade="")

class DocumentBinary(Base):
    """
    Zero-Cost Persistent Evidence Binary Storage (PostgreSQL BYTEA / SQLite LargeBinary).
    Stores physical document contents directly in the database with SHA-256 integrity checksums.
    Configured with restrictive deletion to prevent inadvertent evidence destruction.
    """
    __tablename__ = "document_binaries"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("document_metadata.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True
    )
    content = Column(LargeBinary, nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False, index=True)

    document = relationship("DocumentMetadata", back_populates="binary_record")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_name = Column(String(200), nullable=False)
    actor_role = Column(String(50), nullable=False)
    event_type = Column(String(100), nullable=False, index=True)  # 'LOGIN', 'LOGOUT', 'CASE_CREATE', 'CASE_UPDATE', 'STATUS_CHANGE', 'OVERLAP_DECISION', 'ACTION_CONFLICT_DECISION', etc.
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False, index=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class SystemConfiguration(Base):
    __tablename__ = "system_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, index=True, nullable=False)
    config_value = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIDuplicateRecommendation(Base):
    __tablename__ = "ai_duplicate_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    source_case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    candidate_case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False)  # Cosine similarity in [-1.0, 1.0]
    duplicate_probability = Column(Float, nullable=False)  # Calibrated SVM probability in [0.0, 1.0]
    predicted_tier = Column(String(50), nullable=False)  # 'HIGH_CONFIDENCE_DUPLICATE', 'MANUAL_REVIEW_REQUIRED', 'DISTINCT_MATTERS'
    is_duplicate_predicted = Column(Boolean, default=False)
    features = Column(JSON, nullable=True)  # Explainable 13-dim pairwise features
    explanation = Column(Text, nullable=True)
    statutory_advice = Column(Text, nullable=True)
    model_version = Column(String(100), default="v1.0.0-phase6-mpnet-svm")
    verification_status = Column(String(50), default="PENDING_REVIEW", index=True)  # 'PENDING_REVIEW', 'CONFIRMED_DUPLICATE', 'MARKED_RELATED', 'REJECTED'
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_reason = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    source_case = relationship("Case", foreign_keys=[source_case_id], back_populates="ai_duplicate_candidates")
    candidate_case = relationship("Case", foreign_keys=[candidate_case_id])
    institution = relationship("Institution", foreign_keys=[institution_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])

# =========================================================================
# PHASE 8: AUTOMATED INSTITUTIONAL COMPLIANCE & REGULATORY ANALYTICS MODELS
# =========================================================================

class RegulatoryRequirement(Base):
    __tablename__ = "regulatory_requirements"

    id = Column(String(50), primary_key=True, index=True)  # e.g. 'REQ-FAC-01'
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=False)
    category_code = Column(String(50), nullable=True)  # Informational reference to complaint_categories.code
    regulatory_source = Column(String(250), nullable=False)
    source_reference_url = Column(String(500), nullable=True)
    applicable_institution_types = Column(JSON, nullable=False)  # e.g. ["Engineering & Technology", "Management"] or ["ALL"]
    applicability_conditions = Column(JSON, nullable=True)
    weight = Column(Float, default=1.0)
    default_evidence_requirements = Column(JSON, nullable=True)
    responsible_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False, index=True)
    effective_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    review_date = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    responsible_bureau = relationship("Bureau", foreign_keys=[responsible_bureau_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    versions = relationship("RegulatoryRequirementVersion", back_populates="requirement", cascade="all, delete-orphan")
    assessments = relationship("ComplianceAssessment", back_populates="requirement")

class RegulatoryRequirementVersion(Base):
    __tablename__ = "regulatory_requirement_versions"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(String(50), ForeignKey("regulatory_requirements.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    title = Column(String(250), nullable=False)
    description = Column(Text, nullable=False)
    weight = Column(Float, nullable=False, default=1.0)
    regulatory_source = Column(String(250), nullable=False)
    changes_summary = Column(Text, nullable=False)
    promulgated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False, index=True)

    # Relationships
    requirement = relationship("RegulatoryRequirement", back_populates="versions")
    promulgated_by = relationship("User", foreign_keys=[promulgated_by_id])

class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    requirement_id = Column(String(50), ForeignKey("regulatory_requirements.id"), nullable=False, index=True)
    requirement_version = Column(Integer, default=1)
    assessment_period = Column(String(50), nullable=False, index=True)  # e.g. 'AY-2025-26'
    status = Column(String(50), default="NOT_ASSESSED", index=True)  # 'NOT_ASSESSED', 'PENDING_EVIDENCE', 'UNDER_REVIEW', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE'
    score_contribution = Column(Float, nullable=True)  # 1.0, 0.5, 0.0, or Null
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_remarks = Column(Text, nullable=True)
    assessed_at = Column(DateTime, nullable=True)
    decision_history = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="compliance_assessments")
    requirement = relationship("RegulatoryRequirement", back_populates="assessments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    evidences = relationship("ComplianceEvidence", back_populates="assessment", cascade="all, delete-orphan")
    caps = relationship("CorrectiveActionPlan", back_populates="assessment")

class ComplianceEvidence(Base):
    __tablename__ = "compliance_evidences"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("compliance_assessments.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("document_metadata.id"), nullable=False, index=True)
    evidence_type = Column(String(100), nullable=False)  # 'Inspection Report', 'Audited Financial Statement', 'Biometric Cadre Register', 'Affidavit', 'Official Notice'
    verification_status = Column(String(50), default="SUBMITTED", index=True)  # 'SUBMITTED', 'VERIFIED', 'REJECTED', 'CLARIFICATION_REQUESTED'
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_remarks = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    submitted_by_role = Column(String(50), default="officer")  # 'officer', 'institution_admin'
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    assessment = relationship("ComplianceAssessment", back_populates="evidences")
    institution = relationship("Institution", foreign_keys=[institution_id])
    document = relationship("DocumentMetadata", foreign_keys=[document_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])

class CorrectiveActionPlan(Base):
    __tablename__ = "corrective_action_plans"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    assessment_id = Column(Integer, ForeignKey("compliance_assessments.id"), nullable=True, index=True)
    related_case_id = Column(String(100), ForeignKey("cases.id"), nullable=True, index=True)
    title = Column(String(250), nullable=False)
    identified_gap = Column(Text, nullable=False)
    required_action = Column(Text, nullable=False)
    responsible_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    priority = Column(String(50), default="Medium")  # 'Critical', 'High', 'Medium', 'Low'
    status = Column(String(50), default="PROPOSED", index=True)
    # 'PROPOSED', 'ASSIGNED', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'CLOSED', 'REJECTED', 'OVERDUE', 'REOPENED', 'CANCELLED'
    prescribed_deadline = Column(DateTime, nullable=False, index=True)
    completion_evidence_doc_id = Column(Integer, ForeignKey("document_metadata.id"), nullable=True)
    verification_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_remarks = Column(Text, nullable=True)
    closure_decision = Column(Text, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    reopen_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="corrective_actions")
    assessment = relationship("ComplianceAssessment", back_populates="caps")
    related_case = relationship("Case", foreign_keys=[related_case_id])
    responsible_bureau = relationship("Bureau", foreign_keys=[responsible_bureau_id])
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    verification_officer = relationship("User", foreign_keys=[verification_officer_id])
    completion_evidence_document = relationship("DocumentMetadata", foreign_keys=[completion_evidence_doc_id])

class InstitutionalRiskIndicator(Base):
    __tablename__ = "institutional_risk_indicators"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    indicator_type = Column(String(100), nullable=False, index=True)  # 'IND-GAP-CHRONIC', 'IND-CAP-OVERDUE', 'IND-SLA-FAIL', 'IND-SURGE-SPIKE', 'IND-CONFLICT-STALE', 'IND-CAT-HOTSPOT'
    severity = Column(String(50), default="MODERATE", index=True)  # 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    title = Column(String(250), nullable=False)
    supporting_evidence = Column(JSON, nullable=False)
    observation_period = Column(String(100), nullable=False)
    calculation_method = Column(String(100), nullable=False)
    data_completeness = Column(Float, default=1.0)
    recommended_review = Column(Text, nullable=False)
    status = Column(String(50), default="ACTIVE", index=True)  # 'ACTIVE', 'REVIEWED', 'DISMISSED', 'RESOLVED'
    detected_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="risk_indicators")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

class ComplianceScoreSnapshot(Base):
    __tablename__ = "compliance_score_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    assessment_period = Column(String(50), nullable=False, index=True)
    compliance_percentage = Column(Float, nullable=False)
    assessment_coverage_pct = Column(Float, nullable=False)
    total_applicable_requirements = Column(Integer, nullable=False)
    verified_compliant_count = Column(Integer, nullable=False)
    partially_compliant_count = Column(Integer, nullable=False)
    non_compliant_count = Column(Integer, nullable=False)
    unassessed_count = Column(Integer, nullable=False)
    pending_evidence_count = Column(Integer, nullable=False)
    risk_tier = Column(String(50), nullable=False)  # 'LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK', 'CRITICAL_RISK'
    calculation_version = Column(String(50), default="v1.0.0")
    formula_breakdown = Column(JSON, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    institution = relationship("Institution", back_populates="compliance_snapshots")


