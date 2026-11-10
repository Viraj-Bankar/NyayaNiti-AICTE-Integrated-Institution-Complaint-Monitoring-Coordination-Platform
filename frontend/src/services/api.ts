import {
  User, CaseItem, Institution, OverlapAlert, ActionConflictAlert,
  CoordinationWorkspace, DashboardKpis, AlertTickerItem, NotificationItem,
  AuditLogItem, DocumentItem, Complainant, ComplainantRegisterData,
  ComplainantCaseItem, ComplainantCaseDetail, ComplainantInstitutionItem,
  ComplainantCategoryItem, ComplainantDocumentItem, ComplainantReceipt,
  ComplainantNotificationItem,
  OfficerComplaintListResponse, OfficerComplaintMetadata,
  OfficerComplaintDetail, OfficerComplaintAcceptPayload, OfficerComplaintRejectPayload,
  OfficerComplaintRequestInfoPayload, OfficerComplaintAssignPayload, OfficerComplaintLinkPayload,
  OfficerComplaintResolvePayload, OfficerComplaintClosePayload,
  AIDuplicateCandidate, AIDuplicateAnalysis, AIDuplicateDetail,
  OfficerDuplicateVerifyPayload, OfficerDuplicateVerifyResponse, AIModelStatus,
  RegulatoryRequirement, RegulatoryRequirementCreatePayload,
  RegulatoryRequirementUpdatePayload, ComplianceAssessment, ComplianceAssessmentCreatePayload,
  ComplianceAssessmentReviewPayload, ComplianceEvidence, ComplianceEvidenceCreatePayload,
  ComplianceEvidenceReviewPayload, CorrectiveActionPlan, CAPCreatePayload,
  CAPUpdatePayload, CAPEvidenceSubmitPayload, CAPVerifyPayload, CAPReopenPayload,
  InstitutionalRiskIndicator, InstitutionScorecard, ExecutiveGovernanceSummary,
  GrievancePerformance
} from '../types';

/**
 * Resolve base API URL:
 * - Uses VITE_API_URL if configured (e.g. 'https://nyayaniti-aicte-integrated-institution.onrender.com')
 * - Ensures /api prefix is present exactly once
 * - Defaults to relative '/api' for local development with Vite proxy
 */
const getApiBase = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!envUrl) {
    return '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const API_BASE = getApiBase();

/**
 * Helper to build full URL with query parameters regardless of whether
 * API_BASE is absolute (https://...) or relative (/api).
 */
export function buildApiUrl(path: string, params?: Record<string, any>): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `${API_BASE}${cleanPath}`;

  const url = fullPath.startsWith('http://') || fullPath.startsWith('https://')
    ? new URL(fullPath)
    : new URL(fullPath, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
  }
  return url.toString();
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('nyayaniti_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getComplainantAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('nyayaniti_complainant_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedCallback = handler;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (res.status === 401) {
      if (res.url.includes('/complainant/')) {
        localStorage.removeItem('nyayaniti_complainant_token');
        localStorage.removeItem('nyayaniti_complainant_user');
        window.dispatchEvent(new CustomEvent('nyayaniti:complainant-session-expired'));
      } else {
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        } else {
          localStorage.removeItem('nyayaniti_token');
          localStorage.removeItem('nyayaniti_user');
        }
        window.dispatchEvent(new CustomEvent('nyayaniti:session-expired'));
      }
    }
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      if (contentType.includes('application/json')) {
        const err = await res.json();
        errMessage = err.detail || err.message || JSON.stringify(err);
      } else {
        const text = await res.text();
        if (text && text.length < 200) errMessage = text;
      }
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }

  // Detect HTML responses served on 200 (e.g., SPA rewrite on missing routes)
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      throw new Error(`Invalid API response: received HTML document instead of JSON from ${res.url}. Verify backend connectivity.`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON response, but received ${contentType || 'non-JSON payload'}`);
    }
  }

  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  },

  async demoLogin(role: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/demo-login/${role}`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Dashboard
  async getKpis(): Promise<DashboardKpis> {
    const res = await fetch(`${API_BASE}/dashboard/kpis`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getTicker(): Promise<AlertTickerItem[]> {
    const res = await fetch(`${API_BASE}/dashboard/ticker`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getCharts(): Promise<any> {
    const res = await fetch(`${API_BASE}/dashboard/charts`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getRecentActivity(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/dashboard/recent-activity`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getUpcomingDeadlines(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/dashboard/upcoming-deadlines`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Cases
  async getCases(params: {
    q?: string;
    status?: string;
    priority?: string;
    bureau_id?: number;
    institution_id?: number;
    citizen_only?: boolean;
    unassigned_only?: boolean;
    overdue_only?: boolean;
    sort_by?: string;
    order?: string;
  } = {}): Promise<CaseItem[]> {
    const url = buildApiUrl('/cases', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getCaseDetail(id: string): Promise<CaseItem> {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAvailableOfficers(bureau_id?: number): Promise<User[]> {
    const url = buildApiUrl('/cases/officers/available', { bureau_id });
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async assignCase(id: string, to_officer_id: number, remarks?: string): Promise<CaseItem> {
    const res = await fetch(`${API_BASE}/cases/${id}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ to_officer_id, remarks })
    });
    return handleResponse(res);
  },

  async linkCase(id: string, target_case_id: string, relationship_type: string = 'Consolidated Grievance', remarks?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${id}/link`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ target_case_id, relationship_type, remarks })
    });
    return handleResponse(res);
  },

  async addCaseNote(id: string, remarks: string, is_public: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${id}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ remarks, is_public })
    });
    return handleResponse(res);
  },

  async downloadCaseDocument(documentId: number, filename?: string): Promise<void> {
    const token = localStorage.getItem('nyayaniti_token');
    const res = await fetch(`${API_BASE}/documents/${documentId}/download`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let errText = `Failed to download document: HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson.detail || errText;
      } catch {
        // fallback
      }
      throw new Error(errText);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `document_${documentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async createCase(payload: any): Promise<CaseItem> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateCase(id: string, payload: any): Promise<CaseItem> {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async overridePriority(id: string, new_priority: string, reason: string): Promise<CaseItem> {
    const res = await fetch(`${API_BASE}/cases/${id}/override-priority`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ new_priority, reason })
    });
    return handleResponse(res);
  },

  async escalateCase(id: string, reason: string): Promise<CaseItem> {
    const url = buildApiUrl(`/cases/${id}/escalate`, { reason });
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Institutions
  async getInstitutions(params: { q?: string; state?: string; region?: string } = {}): Promise<Institution[]> {
    const url = buildApiUrl('/institutions', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getInstitutionProfile(id: number): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async testIdentityResolution(payload: { permanent_id?: string; institution_name?: string; state?: string; district?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/institutions/resolve-identity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Overlaps
  async getOverlapAlerts(params: { status?: string; min_similarity?: number; institution_id?: number } = {}): Promise<OverlapAlert[]> {
    const url = buildApiUrl('/overlaps', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getOverlapDetail(id: number): Promise<OverlapAlert> {
    const res = await fetch(`${API_BASE}/overlaps/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async reviewOverlap(id: number, payload: {
    decision: string;
    review_notes: string;
    coordination_owner_id?: number;
    designated_lead_bureau_id?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/overlaps/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async scanAllOverlaps(): Promise<any> {
    const res = await fetch(`${API_BASE}/overlaps/scan-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Action Conflicts
  async getActionConflicts(params: { status?: string; severity?: string; institution_id?: number } = {}): Promise<ActionConflictAlert[]> {
    const url = buildApiUrl('/action-conflicts', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async reviewActionConflict(id: number, payload: {
    decision: string;
    resolution_notes: string;
    reconciled_action?: string;
    coordination_title?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/action-conflicts/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async scanAllActionConflicts(): Promise<any> {
    const res = await fetch(`${API_BASE}/action-conflicts/scan-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async scanResponsibilityOverlaps(): Promise<any> {
    const res = await fetch(`${API_BASE}/overlaps/scan-responsibility`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Coordination Workspaces
  async getCoordinationWorkspaces(): Promise<CoordinationWorkspace[]> {
    const res = await fetch(`${API_BASE}/coordination`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createCoordinationWorkspace(payload: {
    title: string;
    institution_id: number;
    primary_bureau_id: number;
    secondary_bureau_id?: number;
    justification?: string;
    linked_case_ids?: string[];
    participant_ids?: number[];
  }): Promise<CoordinationWorkspace> {
    const res = await fetch(`${API_BASE}/coordination`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateCoordinationWorkspace(id: number, payload: Partial<CoordinationWorkspace>): Promise<CoordinationWorkspace> {
    const res = await fetch(`${API_BASE}/coordination/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async resolveCoordinationWorkspace(id: number, payload: {
    resolution_status: string;
    consensus_decisions: string;
    apply_to_cases?: boolean;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${id}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async reopenCoordinationWorkspace(id: number, justification: string): Promise<any> {
    const url = buildApiUrl(`/coordination/${id}/reopen`, { justification });
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async addCoordinationParticipant(workspaceId: number, payload: {
    officer_id: number;
    bureau_id: number;
    role?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/participants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async removeCoordinationParticipant(workspaceId: number, officerId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/participants/${officerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async linkCaseToWorkspace(workspaceId: number, caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/cases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id: caseId })
    });
    return handleResponse(res);
  },

  async unlinkCaseFromWorkspace(workspaceId: number, caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/cases/${caseId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getCoordinationWorkspace(id: number): Promise<CoordinationWorkspace> {
    const res = await fetch(`${API_BASE}/coordination/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async addCoordinationTask(workspaceId: number, task: any): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(task)
    });
    return handleResponse(res);
  },

  async updateCoordinationTask(taskId: number, status: string, remarks?: string): Promise<any> {
    const url = buildApiUrl(`/coordination/tasks/${taskId}`, { status, remarks });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateCoordinationTaskExtended(taskId: number, payload: {
    status?: string;
    remarks?: string;
    priority?: string;
    due_date?: string;
    depends_on_task_id?: number;
    evidence_doc_id?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async recordWorkspaceMeeting(workspaceId: number, payload: {
    meeting_date?: string;
    chair_name?: string;
    attendee_ids?: number[];
    discussion_summary: string;
    action_items?: string[];
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/${workspaceId}/meetings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async scanEscalations(): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/escalations/scan`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getEscalationSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/coordination/escalations/summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Surges
  async getSurges(windowDays: number = 30): Promise<any> {
    const url = buildApiUrl('/surges', { window_days: windowDays });
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Reports
  async getBureauReport(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports/bureau-summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getRegionReport(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports/region-summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/reports/export/cases-csv`;
  },

  // Notifications
  async getNotifications(unreadOnly: boolean = false): Promise<NotificationItem[]> {
    const url = buildApiUrl('/notifications', { unread_only: unreadOnly });
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Documents
  async getCaseDocuments(caseId: string): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents/case/${caseId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async uploadCaseDocument(caseId: string, formData: FormData): Promise<DocumentItem> {
    const token = localStorage.getItem('nyayaniti_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/documents/case/${caseId}`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },

  // Audit Logs
  async getAuditLogs(params: { event_type?: string; entity_type?: string; entity_id?: string } = {}): Promise<AuditLogItem[]> {
    const url = buildApiUrl('/audit', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Settings
  async getThresholds(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/thresholds`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateThresholds(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/thresholds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/settings/users`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async toggleUserStatus(userId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================
  // CITIZEN & COMPLAINANT PORTAL APIS
  // ============================================================
  async complainantRegister(data: ComplainantRegisterData): Promise<Complainant> {
    const res = await fetch(`${API_BASE}/complainant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async complainantLogin(email: string, password: string): Promise<{ access_token: string; token_type: string; complainant: Complainant }> {
    const res = await fetch(`${API_BASE}/complainant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async complainantDemoLogin(): Promise<{ access_token: string; token_type: string; complainant: Complainant }> {
    const res = await fetch(`${API_BASE}/complainant/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  async getComplainantMe(): Promise<Complainant> {
    const res = await fetch(`${API_BASE}/complainant/me`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantCases(params?: { status?: string; q?: string }): Promise<ComplainantCaseItem[]> {
    const url = buildApiUrl('/complainant/complaints', params);
    const res = await fetch(url, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantComplaints(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    category?: string;
    sort_order?: string;
    q?: string;
  }): Promise<ComplainantCaseItem[]> {
    const url = buildApiUrl('/complainant/complaints', params);
    const res = await fetch(url, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantCaseDetail(caseId: string): Promise<ComplainantCaseDetail> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${caseId}`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantComplaintDetail(complaintId: string): Promise<ComplainantCaseDetail> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${complaintId}`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantComplaintHistory(complaintId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${complaintId}/history`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async fileComplainantCase(payload: { institution_id: number; title?: string; category: string; subcategory?: string; description: string }): Promise<ComplainantCaseItem> {
    const res = await fetch(`${API_BASE}/complainant/complaints`, {
      method: 'POST',
      headers: getComplainantAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async submitComplainantComplaint(payload: {
    institution_id: number;
    title: string;
    category: string;
    subcategory?: string;
    description: string;
  }): Promise<ComplainantCaseItem> {
    const res = await fetch(`${API_BASE}/complainant/complaints`, {
      method: 'POST',
      headers: getComplainantAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getComplainantInstitutions(params?: { q?: string; state?: string }): Promise<ComplainantInstitutionItem[]> {
    const url = buildApiUrl('/complainant/complaints/institutions', params);
    const res = await fetch(url, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantCategories(): Promise<ComplainantCategoryItem[]> {
    const res = await fetch(`${API_BASE}/complainant/complaints/categories`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async uploadComplainantDocument(caseId: string, file: File, category: string = 'Complainant Evidence'): Promise<ComplainantDocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const token = localStorage.getItem('nyayaniti_complainant_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/complainant/complaints/${caseId}/documents`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },

  async getComplainantDocuments(caseId: string): Promise<ComplainantDocumentItem[]> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${caseId}/documents`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantReceipt(caseId: string): Promise<ComplainantReceipt> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${caseId}/receipt`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  getComplainantDocumentDownloadUrl(complaintId: string, docId: number): string {
    return `${API_BASE}/complainant/complaints/${complaintId}/documents/${docId}/download`;
  },

  async getComplainantNotifications(unreadOnly: boolean = false): Promise<ComplainantNotificationItem[]> {
    const url = buildApiUrl('/complainant/notifications', { unread_only: unreadOnly });
    const res = await fetch(url, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async markComplainantNotificationRead(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/complainant/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async markAllComplainantNotificationsRead(): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_BASE}/complainant/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplainantUnreadNotifCount(): Promise<{ unread_count: number }> {
    const res = await fetch(`${API_BASE}/complainant/notifications/unread-count`, {
      headers: getComplainantAuthHeaders()
    });
    return handleResponse(res);
  },

  async submitComplaintClarification(
    complaintId: string,
    payload: { response_text: string; document_id?: number }
  ): Promise<ComplainantCaseItem> {
    const res = await fetch(`${API_BASE}/complainant/complaints/${complaintId}/clarification`, {
      method: 'POST',
      headers: getComplainantAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // ============================================================
  // Phase 5 Officer Complaint Intake APIs
  // ============================================================
  async getOfficerComplaints(params: {
    q?: string;
    status?: string;
    category?: string;
    institution_id?: number;
    unassigned_only?: boolean;
    citizen_only?: boolean;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<OfficerComplaintListResponse> {
    const url = buildApiUrl('/officer/complaints', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getOfficerComplaintMetadata(): Promise<OfficerComplaintMetadata> {
    const res = await fetch(`${API_BASE}/officer/complaints/metadata`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getOfficerComplaintDetail(id: string): Promise<OfficerComplaintDetail> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async startComplaintReview(id: string): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/start-review`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async acceptComplaint(id: string, payload: OfficerComplaintAcceptPayload): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async rejectComplaint(id: string, payload: OfficerComplaintRejectPayload): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async requestComplaintInfo(id: string, payload: OfficerComplaintRequestInfoPayload): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/request-info`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async assignComplaintOfficer(
    id: string,
    payload: OfficerComplaintAssignPayload
  ): Promise<{ message: string; id: string; assigned_officer_id: number; assigned_officer_name: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async linkComplaintCase(id: string, payload: OfficerComplaintLinkPayload): Promise<any> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/link-case`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async resolveOfficerComplaint(id: string, payload: OfficerComplaintResolvePayload): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async closeOfficerComplaint(id: string, payload?: OfficerComplaintClosePayload): Promise<{ message: string; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload || {})
    });
    return handleResponse(res);
  },

  async downloadOfficerComplaintDocument(complaintId: string, documentId: number, filename?: string): Promise<void> {
    const token = localStorage.getItem('nyayaniti_token');
    const res = await fetch(`${API_BASE}/officer/complaints/${complaintId}/documents/${documentId}/download`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let errText = `Failed to download evidence document: HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson.detail || errText;
      } catch {
        // fallback
      }
      throw new Error(errText);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `complaint_${complaintId}_evidence_${documentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // ---------------------------------------------------------------------------
  // Phase 6: AI-Powered Semantic Duplicate Detection APIs
  // ---------------------------------------------------------------------------

  async getAiModelStatus(): Promise<AIModelStatus> {
    const res = await fetch(`${API_BASE}/ai/model/status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async analyzeComplaintDuplicates(
    complaintId: string,
    limit: number = 5,
    minSimilarity: number = 0.40,
    includeCrossInstitution: boolean = false
  ): Promise<AIDuplicateAnalysis> {
    const url = buildApiUrl(`/ai/duplicates/${complaintId}/analyze`, {
      limit,
      min_similarity: minSimilarity,
      include_cross_institution: includeCrossInstitution
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplaintDuplicateSummary(complaintId: string): Promise<AIDuplicateDetail> {
    const res = await fetch(`${API_BASE}/ai/duplicates/${complaintId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getComplaintDuplicateCandidates(
    complaintId: string,
    params?: { min_similarity?: number; tier?: string; status?: string; limit?: number }
  ): Promise<AIDuplicateCandidate[]> {
    const url = buildApiUrl(`/ai/duplicates/${complaintId}/candidates`, params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async verifyDuplicateRecommendation(
    complaintId: string,
    payload: OfficerDuplicateVerifyPayload
  ): Promise<OfficerDuplicateVerifyResponse> {
    const res = await fetch(`${API_BASE}/ai/duplicates/${complaintId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getPendingDuplicateRecommendations(
    params?: { institution_id?: number; tier?: string; limit?: number }
  ): Promise<AIDuplicateCandidate[]> {
    const url = buildApiUrl('/ai/duplicates/recommendations/pending', params);
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // ---------------------------------------------------------------------------
  // Phase 8: Automated Institutional Compliance & Regulatory Analytics APIs
  // ---------------------------------------------------------------------------

  async listRegulatoryRequirements(params?: {
    institution_type?: string;
    bureau_id?: number;
    is_active?: boolean;
  }): Promise<RegulatoryRequirement[]> {
    const url = buildApiUrl('/compliance/requirements', params);
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getRegulatoryRequirement(id: string): Promise<RegulatoryRequirement> {
    const res = await fetch(`${API_BASE}/compliance/requirements/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createRegulatoryRequirement(payload: RegulatoryRequirementCreatePayload): Promise<RegulatoryRequirement> {
    const res = await fetch(`${API_BASE}/compliance/requirements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateRegulatoryRequirement(id: string, payload: RegulatoryRequirementUpdatePayload): Promise<RegulatoryRequirement> {
    const res = await fetch(`${API_BASE}/compliance/requirements/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async listComplianceAssessments(params?: {
    institution_id?: number;
    assessment_period?: string;
    status?: string;
  }): Promise<ComplianceAssessment[]> {
    const url = buildApiUrl('/compliance/assessments', params);
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getComplianceAssessment(id: number): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/compliance/assessments/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createComplianceAssessment(payload: ComplianceAssessmentCreatePayload): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/compliance/assessments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async reviewComplianceAssessment(id: number, payload: ComplianceAssessmentReviewPayload): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/compliance/assessments/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async attachAssessmentEvidence(assessmentId: number, payload: ComplianceEvidenceCreatePayload): Promise<ComplianceEvidence> {
    const res = await fetch(`${API_BASE}/compliance/assessments/${assessmentId}/evidence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async listComplianceEvidence(params?: {
    institution_id?: number;
    assessment_id?: number;
    verification_status?: string;
  }): Promise<ComplianceEvidence[]> {
    const url = buildApiUrl('/compliance/evidence', params);
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async reviewComplianceEvidence(id: number, payload: ComplianceEvidenceReviewPayload): Promise<ComplianceEvidence> {
    const res = await fetch(`${API_BASE}/compliance/evidence/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async listCorrectiveActionPlans(params?: {
    institution_id?: number;
    status?: string;
    assigned_officer_id?: number;
    bureau_id?: number;
  }): Promise<CorrectiveActionPlan[]> {
    const url = buildApiUrl('/compliance/caps', params);
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getCorrectiveActionPlan(id: number): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createCorrectiveActionPlan(payload: CAPCreatePayload): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async updateCorrectiveActionPlan(id: number, payload: CAPUpdatePayload): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async submitCAPEvidence(id: number, payload: CAPEvidenceSubmitPayload): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps/${id}/submit-evidence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async verifyCAP(id: number, payload: CAPVerifyPayload): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps/${id}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async reopenCAP(id: number, payload: CAPReopenPayload): Promise<CorrectiveActionPlan> {
    const res = await fetch(`${API_BASE}/compliance/caps/${id}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async scanOverdueCAPs(): Promise<{ status: string; scanned_count?: number; updated_to_overdue?: number }> {
    const res = await fetch(`${API_BASE}/compliance/caps/scan-overdue`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getInstitutionScorecard(institutionId: number, assessmentPeriod: string = 'AY-2025-26'): Promise<InstitutionScorecard> {
    const url = buildApiUrl(`/compliance/institutions/${institutionId}/scorecard`, {
      assessment_period: assessmentPeriod
    });
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getInstitutionRiskIndicators(institutionId: number): Promise<InstitutionalRiskIndicator[]> {
    const res = await fetch(`${API_BASE}/compliance/institutions/${institutionId}/risk`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getInstitutionGrievancePerformance(institutionId: number, observationDays: number = 90): Promise<GrievancePerformance> {
    const url = buildApiUrl(`/compliance/institutions/${institutionId}/grievance-performance`, {
      observation_days: observationDays
    });
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getExecutiveGovernanceDashboard(): Promise<ExecutiveGovernanceSummary> {
    const res = await fetch(`${API_BASE}/compliance/analytics/executive`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async downloadComplianceRegistryCSV(): Promise<void> {
    const token = localStorage.getItem('nyayaniti_token');
    const res = await fetch(`${API_BASE}/compliance/reports/export`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let errText = `Failed to export compliance registry: HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson.detail || errText;
      } catch {
        // fallback
      }
      throw new Error(errText);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `nyayaniti_compliance_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
};

export const complianceApi = {
  listRequirements: api.listRegulatoryRequirements,
  getRequirement: api.getRegulatoryRequirement,
  createRequirement: api.createRegulatoryRequirement,
  updateRequirement: api.updateRegulatoryRequirement,
  listAssessments: api.listComplianceAssessments,
  getAssessment: api.getComplianceAssessment,
  createAssessment: api.createComplianceAssessment,
  reviewAssessment: api.reviewComplianceAssessment,
  attachEvidence: api.attachAssessmentEvidence,
  listEvidence: api.listComplianceEvidence,
  reviewEvidence: api.reviewComplianceEvidence,
  listCAPs: api.listCorrectiveActionPlans,
  getCAP: api.getCorrectiveActionPlan,
  createCAP: api.createCorrectiveActionPlan,
  updateCAP: api.updateCorrectiveActionPlan,
  submitCAPEvidence: api.submitCAPEvidence,
  verifyCAP: api.verifyCAP,
  reopenCAP: api.reopenCAP,
  scanOverdueCAPs: api.scanOverdueCAPs,
  getScorecard: api.getInstitutionScorecard,
  getRiskIndicators: api.getInstitutionRiskIndicators,
  getGrievancePerformance: api.getInstitutionGrievancePerformance,
  getExecutiveDashboard: api.getExecutiveGovernanceDashboard,
  downloadRegistryCSV: api.downloadComplianceRegistryCSV
};

export const aiDuplicatesApi = {
  getModelStatus: api.getAiModelStatus,
  analyzeComplaint: api.analyzeComplaintDuplicates,
  getSummary: api.getComplaintDuplicateSummary,
  getCandidates: api.getComplaintDuplicateCandidates,
  verify: api.verifyDuplicateRecommendation,
  getPending: api.getPendingDuplicateRecommendations
};
