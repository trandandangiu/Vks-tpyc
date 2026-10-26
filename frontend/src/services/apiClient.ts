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
  IncidentTemplate,
  AppNotification,
  DeviceIpRecord,
  ChatRoom,
  ChatMessage,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'ptcv_token';

// Xóa toàn bộ bộ nhớ tạm cũ (nếu có từ phiên bản trước) để đảm bảo dùng 100% Database
try {
  ['ptcv_user', 'cds_tickets_v2', 'cds_users_v2', 'cds_depts_v2', 'cds_audit_v2'].forEach((k) =>
    localStorage.removeItem(k)
  );
} catch { /* ignore */ }

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
    }
    return data;
  },

  async me(): Promise<User | null> {
    const data = await request<{ success: boolean; user: User }>('/auth/me');
    return data.success ? data.user : null;
  },

  async logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch { }
    this.clearToken();
  },

  getCurrentUser(): User | null {
    return null;
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
  normalizeTicket(t: Ticket): Ticket {
    if (!t) return t;
    const token = this.getToken();
    const buildUrl = (attId: string) => {
      const q = new URLSearchParams();
      if (token) q.set('token', token);
      q.set('inline', '1');
      return `${API_BASE}/attachments/${attId}/download?${q.toString()}`;
    };
    const atts = Array.isArray(t.attachments) ? t.attachments : [];
    const beforeFromAtts = atts
      .filter((a) => a.stage === 'BEFORE' || !a.stage)
      .map((a) => buildUrl(a.id));
    const afterFromAtts = atts
      .filter((a) => a.stage === 'AFTER')
      .map((a) => buildUrl(a.id));

    return {
      ...t,
      technicalNotes: t.processNote ?? t.technicalNotes ?? '',
      processNote: t.processNote ?? t.technicalNotes ?? '',
      beforeImages:
        beforeFromAtts.length > 0 ? beforeFromAtts : t.beforeImages || [],
      afterImages:
        afterFromAtts.length > 0 ? afterFromAtts : t.afterImages || [],
    };
  },

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
    return (data.tickets || []).map((t) => this.normalizeTicket(t));
  },

  async getTicketById(id: string) {
    const data = await request<{ success: boolean; ticket: Ticket }>(`/tickets/${id}`);
    return this.normalizeTicket(data.ticket);
  },

  async createTicket(payload: Partial<Ticket>) {
    const res = await request<{ success: boolean; ticket: Ticket; message?: string }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ticket) res.ticket = this.normalizeTicket(res.ticket);
    return res;
  },

  async updateTicket(ticketId: string, payload: Partial<Ticket>) {
    const res = await request<{ success: boolean; ticket: Ticket; message?: string }>(
      `/tickets/${ticketId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    if (res.ticket) res.ticket = this.normalizeTicket(res.ticket);
    return res;
  },

  async deleteTicket(ticketId: string) {
    return request<{ success: boolean; message?: string }>(
      `/tickets/${ticketId}`,
      { method: 'DELETE' }
    );
  },

  async assignTicket(ticketId: string, assigneeId: string, scheduledAt?: string) {
    const res = await request<{ success: boolean; ticket: Ticket; message?: string }>(
      `/tickets/${ticketId}/assign`,
      { method: 'POST', body: JSON.stringify({ assigneeId, scheduledAt }) }
    );
    if (res.ticket) res.ticket = this.normalizeTicket(res.ticket);
    return res;
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
    const res = await request<{ success: boolean; ticket: Ticket; message?: string }>(
      `/tickets/${ticketId}/process`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res.ticket) res.ticket = this.normalizeTicket(res.ticket);
    return res;
  },

  async evaluateTicket(
    ticketId: string,
    payload: { rating: number; feedback?: string }
  ) {
    const res = await request<{ success: boolean; ticket: Ticket; message?: string }>(
      `/tickets/${ticketId}/evaluate`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res.ticket) res.ticket = this.normalizeTicket(res.ticket);
    return res;
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

  async deleteAttachment(attachmentId: string) {
    return request<{ success: boolean; message?: string }>(
      `/attachments/${attachmentId}`,
      { method: 'DELETE' }
    );
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

  // ---------- INCIDENT TEMPLATES (SỰ CỐ THƯỜNG GẶP) ----------
  async getIncidentTemplates(params?: {
    networkType?: string;
    category?: string;
    activeOnly?: boolean;
  }) {
    const q = new URLSearchParams();
    if (params?.networkType) q.set('networkType', params.networkType);
    if (params?.category) q.set('category', params.category);
    if (params?.activeOnly !== undefined) q.set('activeOnly', String(params.activeOnly));
    const data = await request<{ success: boolean; templates: IncidentTemplate[] }>(
      `/incident-templates?${q.toString()}`
    );
    return data.templates || [];
  },

  async createIncidentTemplate(payload: Partial<IncidentTemplate>) {
    return request<{ success: boolean; template: IncidentTemplate; message?: string }>(
      '/incident-templates',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async updateIncidentTemplate(id: string, payload: Partial<IncidentTemplate>) {
    return request<{ success: boolean; template: IncidentTemplate; message?: string }>(
      `/incident-templates/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  async deleteIncidentTemplate(id: string) {
    return request<{ success: boolean; message?: string }>(
      `/incident-templates/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ---------- NOTIFICATIONS (THÔNG BÁO) ----------
  async getNotifications(limit = 50) {
    const data = await request<{
      success: boolean;
      notifications: AppNotification[];
      unreadCount: number;
    }>(`/notifications?limit=${limit}`);
    return {
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0,
    };
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return request<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  async deleteNotification(id: string) {
    return request<{ success: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  async clearAllNotifications() {
    return request<{ success: boolean }>('/notifications', {
      method: 'DELETE',
    });
  },

  // ---------- DEVICE IP RECORDS (DỮ LIỆU MÁY IN / MÁY TÍNH & MÃ IP) ----------
  async getDeviceIps(params?: { search?: string; deviceCategory?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.deviceCategory) q.set('deviceCategory', params.deviceCategory);
    const data = await request<{ success: boolean; records: DeviceIpRecord[] }>(
      `/device-ips?${q.toString()}`
    );
    return data.records || [];
  },

  async createDeviceIp(payload: Partial<DeviceIpRecord>) {
    return request<{ success: boolean; record: DeviceIpRecord; message?: string }>(
      '/device-ips',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async updateDeviceIp(id: string, payload: Partial<DeviceIpRecord>) {
    return request<{ success: boolean; record: DeviceIpRecord; message?: string }>(
      `/device-ips/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  async deleteDeviceIp(id: string) {
    return request<{ success: boolean; message?: string }>(`/device-ips/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------- CHAT 24H BẢO MẬT (TECHNICAL <-> CUSTOMER) ----------
  async getChatRooms() {
    const data = await request<{ success: boolean; rooms: ChatRoom[] }>('/chat/rooms');
    return data.rooms || [];
  },

  async getChatMessages(ticketId: string) {
    const data = await request<{
      success: boolean;
      ticket: any;
      messages: ChatMessage[];
    }>(`/chat/rooms/${ticketId}/messages`);
    return {
      ticket: data.ticket,
      messages: data.messages || [],
    };
  },

  async sendChatMessage(ticketId: string, content: string) {
    const data = await request<{ success: boolean; message: ChatMessage }>(
      `/chat/rooms/${ticketId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
    return data.message;
  },

  async clearChatMessages(ticketId: string) {
    return request<{ success: boolean; message?: string }>(
      `/chat/rooms/${ticketId}/messages`,
      {
        method: 'DELETE',
      }
    );
  },
};