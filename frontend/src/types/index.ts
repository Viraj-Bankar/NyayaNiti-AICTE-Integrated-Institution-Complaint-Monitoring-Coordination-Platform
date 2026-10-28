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
  file_size: number;
  file_type: string;
  category: string;
  access_classification: string;
  uploaded_by_id: number;
  uploaded_by_name?: string;
  upload_timestamp: string;
}

export interface CaseItem {
  id: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  complainant_type: string;
  complainant_masked: string;
  category: string;
  subcategory?: string;
  description: string;
  date_received: string;
  status: 'Pending' | 'Under Process' | 'Disposed' | 'Transferred' | 'Escalated';
  current_bureau_id: number;
  bureau_code: string;
  assigned_officer_id?: number;
  officer_name?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  priority_score?: number;
  last_action?: string;
  next_action?: string;
  last_action_date?: string;
  prescribed_deadline: string;
  expected_disposal_date?: string;
  overlap_review_status: string;
  action_conflict_status: string;
  created_at: string;
  priority_factors?: any;
  priority_override_reason?: string;
  events?: CaseEvent[];
  documents?: DocumentItem[];
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
  status: 'Pending Review' | 'Confirmed Conflict' | 'Clarification Requested' | 'Referred to Bureau Head' | 'Resolved' | 'Rejected';
  reviewer_id?: number;
  resolution_notes?: string;
  reconciled_action?: string;
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
  priority: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  remarks?: string;
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
  status: string;
  justification?: string;
  decisions?: string;
  linked_case_ids: string[];
  tasks: CoordinationTask[];
  created_at: string;
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
