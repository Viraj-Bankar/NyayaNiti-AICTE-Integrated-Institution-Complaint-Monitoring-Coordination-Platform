from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, JSON, Index
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
    category = Column(String(100), index=True, nullable=False)  # 'Faculty Irregularity', 'Fee Overcharging', etc.
    subcategory = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    date_received = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(50), default="Pending", index=True)  # 'Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated'
    current_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
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
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.timestamp.desc()")
    documents = relationship("DocumentMetadata", back_populates="case", cascade="all, delete-orphan")

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
    document_ref = Column(String(300), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    case = relationship("Case", back_populates="events")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False)
    from_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    remarks = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="action_conflicts")

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workspace = relationship("CoordinationWorkspace", back_populates="tasks")

class CaseCoordinationLink(Base):
    __tablename__ = "case_coordination_links"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("coordination_workspaces.id"), nullable=False, index=True)
    case_id = Column(String(100), ForeignKey("cases.id"), nullable=False, index=True)

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
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null = broadcast to relevant officers
    notification_type = Column(String(100), nullable=False, index=True)  # 'OVERLAP_DETECTED', 'ACTION_CONFLICT', 'DEADLINE_APPROACHING', 'OVERDUE', 'ESCALATION', 'COORDINATION_TASK'
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
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)  # 'pdf', 'docx', 'png', etc.
    category = Column(String(100), default="Official Notice")  # 'Official Notice', 'Inspection Report', 'Affidavit', 'Action Evidence', 'Correspondence'
    access_classification = Column(String(50), default="Official Internal")  # 'Public', 'Official Internal', 'Confidential - Bureau Head Only'
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="documents")

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
