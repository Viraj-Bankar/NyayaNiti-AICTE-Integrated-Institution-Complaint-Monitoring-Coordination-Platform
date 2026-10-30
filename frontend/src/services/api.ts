import {
  User, CaseItem, Institution, OverlapAlert, ActionConflictAlert,
  CoordinationWorkspace, DashboardKpis, AlertTickerItem, NotificationItem,
  AuditLogItem, DocumentItem
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

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
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
    const url = buildApiUrl(`/coordination/tasks/${taskId}`, { status, remarks });
    const res = await fetch(url, {
      method: 'PATCH',
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
  }
};
