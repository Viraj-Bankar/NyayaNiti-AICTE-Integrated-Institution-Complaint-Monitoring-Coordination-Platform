import {
  User, CaseItem, Institution, OverlapAlert, ActionConflictAlert,
  CoordinationWorkspace, DashboardKpis, AlertTickerItem, NotificationItem,
  AuditLogItem, DocumentItem
} from '../types';

const API_BASE = '/api';

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = 'An error occurred';
    try {
      const err = await res.json();
      errMessage = err.detail || err.message || JSON.stringify(err);
    } catch {
      errMessage = res.statusText;
    }
    throw new Error(errMessage);
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
    overdue_only?: boolean;
    sort_by?: string;
    order?: string;
  } = {}): Promise<CaseItem[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/cases`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
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
    const res = await fetch(`${API_BASE}/cases/${id}/escalate?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Institutions
  async getInstitutions(params: { q?: string; state?: string; region?: string } = {}): Promise<Institution[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/institutions`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
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
    const url = new URL(`${window.location.origin}${API_BASE}/overlaps`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
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
    const url = new URL(`${window.location.origin}${API_BASE}/action-conflicts`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async reviewActionConflict(id: number, payload: {
    decision: string;
    resolution_notes: string;
    reconciled_action?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/action-conflicts/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
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
    let url = `${API_BASE}/coordination/tasks/${taskId}?status=${encodeURIComponent(status)}`;
    if (remarks) url += `&remarks=${encodeURIComponent(remarks)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Surges
  async getSurges(windowDays: number = 30): Promise<any> {
    const res = await fetch(`${API_BASE}/surges?window_days=${windowDays}`, {
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
    const res = await fetch(`${API_BASE}/notifications?unread_only=${unreadOnly}`, {
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
    const url = new URL(`${window.location.origin}${API_BASE}/audit`);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.append(k, String(v));
    });
    const res = await fetch(url.toString(), {
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
  }
};
