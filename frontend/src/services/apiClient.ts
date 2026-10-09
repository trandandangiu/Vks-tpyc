// frontend/src/services/apiClient.ts
import {
  Ticket,
  User,
  Department,
  AuditLog,
  TicketStatus,
  SupplyItem,
  RatingFeedback,
  TicketPriority,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'ptcv_token';
const USER_KEY = 'ptcv_user';

// ============================================
// REQUEST CORE
// ============================================
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  let body: any = null;
  const ct = res.headers.get('content-type');
  try {
    body = ct?.includes('application/json') ? await res.json() : await res.text();
  } catch { body = null; }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    const message =
      (typeof body === 'object' && body?.message) ||
      (typeof body === 'string' && body) ||
      `Lỗi server (${res.status})`;
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  return body as T;
}

// ============================================
// API CLIENT
// ============================================
export const apiClient = {
  // ---------- TOKEN ----------
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // ---------- AUTH ----------
  async login(username: string, password: string) {
    const data = await request<{
      success: boolean;
      user: User;
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  async me(): Promise<User | null> {
    const data = await request<{ success: boolean; user: User }>('/auth/me');
    return data.success ? data.user : null;
  },

  async logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    this.clearToken();
  },

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // ---------- USERS ----------
  async getUsers(params?: { role?: string; search?: string; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    const data = await request<{ success: boolean; users: User[] }>(
      `/users?${q.toString()}`
    );
    return data.users || [];
  },

  async createUser(payload: Partial<User> & { password?: string }) {
    return request<{ success: boolean; user: User; message?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, updates: Partial<User> & { password?: string }) {
    return request<{ success: boolean; user: User; message?: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteUser(id: string) {
    return request<{ success: boolean; message?: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleUserActive(id: string) {
    return request<{ success: boolean; message?: string; active?: boolean }>(
      `/users/${id}/toggle-active`,
      { method: 'PATCH' }
    );
  },

  // ---------- DEPARTMENTS ----------
  async getDepartments() {
    const data = await request<{ success: boolean; departments: Department[] }>(
      '/departments'
    );
    return data.departments || [];
  },

  async createDepartment(payload: Partial<Department>) {
    return request<{ success: boolean; department: Department }>('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDepartment(id: string, payload: Partial<Department>) {
    return request<{ success: boolean; department: Department }>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteDepartment(id: string) {
    return request<{ success: boolean; message?: string }>(`/departments/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------- TICKETS ----------
  async getTickets(params?: {
    status?: string;
    priority?: string;
    search?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    const data = await request<{ success: boolean; tickets: Ticket[] }>(
      `/tickets?${q.toString()}`
    );
    return data.tickets || [];
  },

  async getTicketById(id: string) {
    const data = await request<{ success: boolean; ticket: Ticket }>(`/tickets/${id}`);
    return data.ticket;
  },

  async createTicket(payload: Partial<Ticket>) {
    return request<{ success: boolean; ticket: Ticket; message?: string }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async assignTicket(ticketId: string, assigneeId: string) {
    return request<{ success: boolean; ticket: Ticket }>(
      `/tickets/${ticketId}/assign`,
      { method: 'POST', body: JSON.stringify({ assigneeId }) }
    );
  },

  async processTicket(
    ticketId: string,
    payload: {
      status?: TicketStatus;
      scheduledAt?: string;
      processNote?: string;
      supplies?: SupplyItem[];
    }
  ) {
    return request<{ success: boolean; ticket: Ticket }>(
      `/tickets/${ticketId}/process`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  async evaluateTicket(
    ticketId: string,
    payload: { rating: number; feedback?: string }
  ) {
    return request<{ success: boolean; ticket: Ticket }>(
      `/tickets/${ticketId}/evaluate`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  async getTicketStats() {
    const data = await request<{ success: boolean; stats: any }>('/tickets/stats');
    return data.stats;
  },

  // ---------- ATTACHMENTS ----------
  async uploadAttachment(ticketId: string, file: File, stage = 'BEFORE') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', stage);

    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload lỗi (${res.status})`);
    return res.json();
  },

  async getAttachments(ticketId: string) {
    const data = await request<{ success: boolean; attachments: any[] }>(
      `/tickets/${ticketId}/attachments`
    );
    return data.attachments || [];
  },

  getAttachmentUrl(attachmentId: string, inline = false) {
    const token = this.getToken();
    const q = new URLSearchParams();
    if (token) q.set('token', token);
    if (inline) q.set('inline', '1');
    return `${API_BASE}/attachments/${attachmentId}/download?${q.toString()}`;
  },

  // ---------- AUDIT LOGS ----------
  async getAuditLogs(params?: { page?: number; limit?: number; level?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.level) q.set('level', params.level);
    const data = await request<{ success: boolean; logs: AuditLog[] }>(
      `/audit-logs?${q.toString()}`
    );
    return data.logs || [];
  },
};