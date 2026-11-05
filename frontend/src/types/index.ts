export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  designation?: string;
  role: 'super_admin' | 'authorized_officer' | 'bureau_head' | 'monitoring_officer';
  bureau_id?: number;
  bureau_code?: string;
  is_active?: boolean;
}

export interface Bureau {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface InstitutionAlias {
  id: number;
  alias_name: string;
  alias_type: string;
  is_verified: boolean;
  verification_notes?: string;
}

export interface Institution {
  id: number;
  permanent_id: string;
  official_name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  region: string;
  pincode?: string;
  verification_status: string;
  verification_evidence?: any;
  email?: string;
  phone?: string;
  website?: string;
  institution_type?: string;
  case_count: number;
  pending_case_count: number;
  aliases?: InstitutionAlias[];
  cases?: any[];
  overlap_alerts?: any[];
  action_conflicts?: any[];
}

export interface CaseEvent {
  id: number;
  case_id: string;
  event_type: string;
  actor_name: string;
  previous_value?: string;
  new_value?: string;
  remarks?: string;
  document_ref?: string;
  timestamp: string;
}

export interface DocumentItem {
  id: number;
  case_id: string;
  file_name: string;
  original_filename?: string;
  file_size: number;
  file_type: string;
  category: string;
  access_classification: string;
  uploaded_by_id?: number;
  uploaded_by_name?: string;
  uploaded_by_complainant_id?: number;
  uploader_role?: string;
  download_url?: string;
  upload_timestamp: string;
}

export interface CaseAssignmentItem {
  id: number;
  case_id: string;
  from_officer_id?: number;
  from_officer_name?: string;
  to_officer_id: number;
  to_officer_name: string;
  assigned_by_id: number;
  assigned_by_name: string;
  bureau_id: number;
  bureau_code?: string;
  remarks?: string;
  assigned_at: string;
}

export interface CaseRelationshipItem {
  id: number;
  case_a_id: string;
  case_b_id: string;
  related_case_id: string;
  relationship_type: string;
  status: string;
  similarity_score?: number;
  title?: string;
  institution_name?: string;
  case_status?: string;
  remarks?: string;
  created_at: string;
}

export interface CaseItem {
  id: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  complainant_type: string;
  complainant_masked: string;
  title?: string;
  category: string;
  subcategory?: string;
  description: string;
  date_received: string;
  status: 'Pending' | 'Under Process' | 'Disposed' | 'Transferred' | 'Escalated' | 'Submitted' | 'Under Review' | 'In Progress' | 'Additional Information Required' | 'Resolved' | 'Closed' | 'Rejected' | string;
  current_bureau_id: number;
  bureau_code: string;
  assigned_officer_id?: number;
  officer_name?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  priority_score?: number;
  last_action?: string;
  next_action?: string;
  last_action_date?: string;
  prescribed_deadline: string;
  expected_disposal_date?: string;
  overlap_review_status: string;
  action_conflict_status: string;
  created_at: string;
  complainant_id?: number;
  is_citizen_complaint?: boolean;
  priority_factors?: any;
  priority_override_reason?: string;
  events?: CaseEvent[];
  documents?: DocumentItem[];
  assignments?: CaseAssignmentItem[];
  linked_cases?: CaseRelationshipItem[];
  complainant_details?: {
    id: number;
    full_name: string;
    email: string;
    mobile: string;
    complainant_type?: string;
    is_email_verified?: boolean;
    is_mobile_verified?: boolean;
    created_at?: string;
  };
}

export interface OverlapAlert {
  id: number;
  case_a_id: string;
  case_b_id: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  similarity_score: number;
  model_name: string;
  evidence_summary?: any;
  review_status: 'New' | 'Under Review' | 'Confirmed Related' | 'Rejected' | 'Coordination Required' | 'Resolved';
  reviewer_id?: number;
  review_notes?: string;
  decision?: string;
  created_at: string;
  case_a?: CaseItem;
  case_b?: CaseItem;
}

export interface ActionConflictAlert {
  id: number;
  case_a_id: string;
  case_b_id: string;
  institution_id: number;
  institution_name: string;
  conflict_type: string;
  rule_triggered: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  evidence?: any;
  status: 'Pending Review' | 'Confirmed Conflict' | 'Clarification Requested' | 'Referred to Bureau Head' | 'Resolved' | 'Rejected' | 'In Coordination' | string;
  reviewer_id?: number;
  resolution_notes?: string;
  reconciled_action?: string;
  coordination_workspace_id?: number;
  created_at: string;
  case_a?: CaseItem;
  case_b?: CaseItem;
}

export interface CoordinationTask {
  id: number;
  workspace_id: number;
  title: string;
  description?: string;
  assigned_to_id: number;
  assigned_to_name?: string;
  bureau_id: number;
  bureau_code?: string;
  due_date: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Pending' | 'In Progress' | 'Blocked' | 'Completed' | 'Overdue' | 'Cancelled' | string;
  remarks?: string;
  depends_on_task_id?: number;
  evidence_doc_id?: number;
}

export interface CoordinationParticipant {
  id: number;
  workspace_id: number;
  officer_id: number;
  officer_name?: string;
  bureau_id: number;
  bureau_code?: string;
  role: 'Lead Coordinator' | 'Co-Lead' | 'Participant Officer' | 'Reviewer' | 'Observer' | string;
  joined_at: string;
}

export interface MeetingRecord {
  meeting_id: number;
  meeting_date: string;
  chair_name: string;
  recorded_by_id?: number;
  recorded_by_name?: string;
  attendee_ids: number[];
  discussion_summary: string;
  action_items: string[];
}

export interface CoordinationWorkspace {
  id: number;
  title: string;
  institution_id: number;
  institution_name: string;
  primary_bureau_id: number;
  primary_bureau_code: string;
  secondary_bureau_id?: number;
  secondary_bureau_code?: string;
  coordination_owner_id: number;
  coordination_owner_name: string;
  status: 'In Coordination' | 'Awaiting Review' | 'Awaiting Decision' | 'Completed' | 'Closed with Justification' | string;
  justification?: string;
  decisions?: string;
  meeting_records?: MeetingRecord[];
  linked_case_ids: string[];
  participants?: CoordinationParticipant[];
  tasks: CoordinationTask[];
  created_at: string;
}

export interface EscalationSummary {
  overdue_tasks: number;
  approaching_deadlines: number;
  unresolved_conflicts_72h: number;
  stalled_workspaces_14d: number;
  evaluated_at: string;
}

export interface DashboardKpis {
  total_complaints: number;
  pending: number;
  under_process: number;
  disposed: number;
  transferred: number;
  overdue: number;
  potential_overlaps_awaiting_review: number;
  action_conflicts_awaiting_review: number;
  active_coordination_workspaces?: number;
  coordination_tasks_pending?: number;
  new_intake_complaints?: number;
  submitted?: number;
  under_review?: number;
  in_progress?: number;
  additional_info_required?: number;
  resolved?: number;
  closed?: number;
  rejected?: number;
}

export interface AlertTickerItem {
  id: string;
  category: string;
  related_id: string;
  short_message: string;
  severity: string;
  created_at: string;
  link_url: string;
}

export interface NotificationItem {
  id: number;
  notification_type: string;
  related_case_id?: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  actor_id?: number;
  actor_name: string;
  actor_role: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  previous_value?: string;
  new_value?: string;
  remarks?: string;
  ip_address?: string;
  timestamp: string;
}

export interface Complainant {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  is_active?: boolean;
  is_email_verified?: boolean;
  is_mobile_verified?: boolean;
  complainant_type?: string;
  created_at?: string;
}

export interface ComplainantRegisterData {
  full_name: string;
  email: string;
  mobile: string;
  password: string;
  confirm_password: string;
  complainant_type?: string;
}

export interface ComplainantCaseItem {
  id: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  title?: string;
  category: string;
  subcategory?: string;
  description: string;
  date_received: string;
  status: string;
  priority?: string;
  bureau_code: string;
  last_action?: string;
  last_action_date?: string;
  prescribed_deadline: string;
  created_at: string;
}

export interface ComplainantCaseMilestone {
  id?: number;
  event_type: string;
  previous_value?: string;
  new_value?: string;
  remarks?: string;
  timestamp: string;
}

export interface ComplaintSubmissionPayload {
  title: string;
  institution_id: number;
  category: string;
  subcategory?: string;
  description: string;
}

export type ComplaintItem = ComplainantCaseItem;
export type ComplaintDetail = ComplainantCaseDetail;
export type ComplaintMilestone = ComplainantCaseMilestone;
export type ComplaintDocument = ComplainantDocumentItem;
export type ComplaintReceipt = ComplainantReceipt;
export type ComplaintNotification = ComplainantNotificationItem;

export interface ComplainantDocumentItem {
  id: number;
  case_id: string;
  file_name: string;
  original_filename?: string;
  file_size: number;
  file_type: string;
  category: string;
  upload_timestamp: string;
}

export interface ComplainantCaseDetail extends ComplainantCaseItem {
  events: ComplainantCaseMilestone[];
  documents?: ComplainantDocumentItem[];
}

export interface ComplainantInstitutionItem {
  id: number;
  permanent_id: string;
  official_name: string;
  city: string;
  district: string;
  state: string;
  region: string;
  institution_type: string;
}

export interface ComplainantCategoryItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  default_priority: string;
  sla_days: number;
}

export interface ComplainantReceipt {
  case_id: string;
  complainant_name: string;
  complainant_email: string;
  complainant_mobile: string;
  complainant_type: string;
  institution_name: string;
  permanent_id: string;
  institution_address: string;
  title?: string;
  category: string;
  subcategory?: string;
  description: string;
  date_received: string;
  prescribed_deadline: string;
  status: string;
  priority: string;
  bureau_name: string;
  tracking_url: string;
}

export interface ComplainantNotificationItem {
  id: number;
  notification_type: string;
  related_case_id?: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

// ============================================================
// Phase 5 Officer Complaint Intake Types
// ============================================================
export interface OfficerComplaintItem {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  district: string;
  state: string;
  status: string;
  priority: string;
  date_received: string;
  prescribed_deadline: string;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  complainant_masked?: string;
  complainant_type?: string;
  is_citizen_complaint: boolean;
  documents_count: number;
}

export interface OfficerComplaintListResponse {
  items: OfficerComplaintItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OfficerComplaintMetadata {
  bureaus: { id: number; code: string; name: string; description?: string }[];
  categories: { id: number; name: string; code: string }[];
  statutory_rejection_reasons: string[];
  statuses: string[];
}

export interface OfficerComplaintDetail {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  status: string;
  priority: string;
  priority_score?: number;
  date_received: string;
  prescribed_deadline: string;
  current_bureau: {
    id?: number;
    code: string;
    name: string;
  };
  assigned_officer?: {
    id?: number;
    full_name?: string;
    role?: string;
  };
  institution: {
    id?: number;
    official_name: string;
    permanent_id: string;
    district: string;
    state: string;
    region: string;
  };
  complainant?: {
    id?: number;
    full_name?: string;
    email?: string;
    mobile?: string;
    complainant_type?: string;
    is_email_verified?: boolean;
    is_mobile_verified?: boolean;
    created_at?: string;
    masked_identifier?: string;
    pii_redacted?: boolean;
  };
  documents: {
    id: number;
    case_id: string;
    file_name: string;
    original_filename: string;
    file_size: number;
    file_type: string;
    category: string;
    access_classification: string;
    uploader_role?: string;
    download_url: string;
    upload_timestamp: string;
  }[];
  public_history: {
    id: number;
    event_type: string;
    actor_name: string;
    new_value?: string;
    remarks?: string;
    timestamp: string;
  }[];
  internal_notes: {
    id: number;
    event_type: string;
    actor_id?: number;
    actor_name: string;
    remarks?: string;
    timestamp: string;
  }[];
  linked_cases: {
    id: number;
    related_case_id: string;
    relationship_type: string;
    status: string;
    similarity_score?: number;
    title: string;
    institution_name: string;
    case_status: string;
    remarks?: string;
    created_at: string;
  }[];
  assignments: {
    id: number;
    from_officer_name?: string;
    to_officer_id: number;
    to_officer_name: string;
    assigned_by_name: string;
    bureau_code: string;
    remarks?: string;
    assigned_at: string;
  }[];
  coordination_workspaces?: {
    workspace_id: number;
    title: string;
    status: string;
    primary_bureau_code: string;
    linked_at?: string;
  }[];
}

export interface OfficerComplaintAcceptPayload {
  remarks?: string;
  priority?: string;
  target_bureau_id?: number;
}

export interface OfficerComplaintRejectPayload {
  statutory_reason: string;
  remarks: string;
}

export interface OfficerComplaintRequestInfoPayload {
  query_details: string;
  required_documents?: string;
  deadline_days?: number;
}

export interface OfficerComplaintAssignPayload {
  to_officer_id: number;
  bureau_id?: number;
  remarks?: string;
}

export interface OfficerComplaintLinkPayload {
  target_case_id: string;
  relationship_type: string;
  remarks?: string;
}

export interface OfficerComplaintResolvePayload {
  resolution_findings: string;
  action_taken?: string;
  remarks?: string;
}

export interface OfficerComplaintClosePayload {
  closure_remarks?: string;
}

// -------------------------------------------------------------------------
// Phase 6: AI Duplicate Complaint Detection Types
// -------------------------------------------------------------------------

export interface AIDuplicateFeatures {
  cosine_similarity: number;
  l1_distance: number;
  l2_distance: number;
  diff_mean: number;
  diff_max: number;
  diff_std: number;
  prod_mean: number;
  prod_std: number;
  fuzz_token_set_ratio: number;
  fuzz_token_sort_ratio: number;
  length_ratio: number;
  same_institution: number;
  same_category: number;
}

export type AIDuplicateTier =
  | 'HIGH_CONFIDENCE_DUPLICATE'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'DISTINCT_MATTERS';

export type AIDuplicateVerificationStatus =
  | 'PENDING_REVIEW'
  | 'CONFIRMED_DUPLICATE'
  | 'MARKED_RELATED'
  | 'REJECTED';

export interface AIDuplicateCandidate {
  recommendation_id?: number;
  source_complaint_id: string;
  candidate_complaint_id: string;
  candidate_title?: string;
  candidate_category: string;
  candidate_institution_id: number;
  candidate_institution_name: string;
  candidate_status: string;
  candidate_date_received: string;
  predicted_relationship: AIDuplicateTier;
  similarity_score: number; // Cosine similarity metric [-1.0, 1.0] (strictly distinguished from probability)
  duplicate_probability: number; // Calibrated SVM probability [0.0, 1.0]
  svm_decision: boolean;
  institution_match: boolean;
  category_match: boolean;
  matching_features: AIDuplicateFeatures;
  explanation: string;
  statutory_advice: string;
  verification_status: AIDuplicateVerificationStatus;
  verification_reason?: string;
  model_version: string;
}

export interface AIDuplicateAnalysis {
  source_complaint_id: string;
  source_title?: string;
  source_institution_id: number;
  source_institution_name: string;
  total_candidates_evaluated: number;
  high_confidence_count: number;
  review_required_count: number;
  candidates: AIDuplicateCandidate[];
  model_name: string;
  model_version: string;
  vector_search_engine: string;
  analyzed_at: string;
}

export interface AIDuplicateDetail {
  complaint_id: string;
  complaint_title?: string;
  institution_id: number;
  institution_name: string;
  total_candidates_analyzed: number;
  high_confidence_duplicates_count: number;
  review_required_count: number;
  top_recommendation?: AIDuplicateCandidate;
  has_active_recommendations: boolean;
  model_version: string;
  last_analyzed_at?: string;
}

export interface OfficerDuplicateVerifyPayload {
  candidate_id: string;
  decision: 'CONFIRM_DUPLICATE' | 'MARK_RELATED' | 'REJECT_RECOMMENDATION';
  reason: string;
  link_dossier?: boolean;
}

export interface OfficerDuplicateVerifyResponse {
  status: string;
  message: string;
  source_complaint_id: string;
  candidate_complaint_id: string;
  decision: string;
  linked_relationship_id?: number;
  verified_at: string;
  verified_by: string;
}

export interface AIModelStatus {
  model_name: string;
  model_version: string;
  is_available: boolean;
  embedding_dim: number;
  device: string;
  feature_count: number;
  feature_names: string[];
  best_hyperparameters: {
    C?: number;
    gamma?: number | string;
    kernel?: string;
  };
  decision_thresholds: {
    high_confidence_duplicate: number;
    manual_review_required: number;
  };
  vector_engine: string;
  pgvector_status: string;
  pgvector_note: string;
  statutory_safeguard: string;
}




