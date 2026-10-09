import { Ticket, User, Department, AuditLog, TicketStatus, RatingFeedback, SupplyItem } from '../types';
import { INITIAL_TICKETS, INITIAL_USERS, INITIAL_DEPARTMENTS, INITIAL_AUDIT_LOGS } from './mockData';

const TICKETS_KEY = 'cds_tickets_v1';
const USERS_KEY = 'cds_users_v1';
const DEPTS_KEY = 'cds_depts_v1';
const AUDIT_KEY = 'cds_audit_logs_v1';
const EVENT_NAME = 'cds_storage_sync';

export const storageService = {
  init() {
    if (!localStorage.getItem(TICKETS_KEY)) {
      localStorage.setItem(TICKETS_KEY, JSON.stringify(INITIAL_TICKETS));
    }
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(DEPTS_KEY)) {
      localStorage.setItem(DEPTS_KEY, JSON.stringify(INITIAL_DEPARTMENTS));
    }
    if (!localStorage.getItem(AUDIT_KEY)) {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
  },

  notifyChange() {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  },

  onSync(callback: () => void) {
    const handleStorage = () => callback();
    const handleCustom = () => callback();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom);
    };
  },

  // --- TICKETS ---
  getTickets(): Ticket[] {
    try {
      const data = localStorage.getItem(TICKETS_KEY);
      return data ? JSON.parse(data) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  },

  getTicketById(id: string): Ticket | undefined {
    return this.getTickets().find((t) => t.id === id);
  },

  saveTickets(tickets: Ticket[]) {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
    this.notifyChange();
  },

  createTicket(ticket: Omit<Ticket, 'id' | 'code' | 'createdAt'>, actorName: string): Ticket {
    const tickets = this.getTickets();
    const nextSeq = tickets.length + 1;
    const year = new Date().getFullYear();
    const code = `YCKT-${year}-${String(nextSeq).padStart(3, '0')}`;
    const newTicket: Ticket = {
      ...ticket,
      id: `t-${Date.now()}`,
      code,
      createdAt: new Date().toISOString(),
      supplies: ticket.supplies || [],
      beforeImages: ticket.beforeImages || [],
      afterImages: ticket.afterImages || [],
    };

    const updated = [newTicket, ...tickets];
    this.saveTickets(updated);

    this.addAuditLog({
      user: actorName,
      action: `Tạo phiếu yêu cầu kỹ thuật mới [${code}] - ${ticket.title}`,
      entity: `Ticket: ${code}`,
      level: 'INFO',
    });

    return newTicket;
  },

  assignTicket(ticketId: string, assigneeId: string, assigneeName: string, scheduledAt: string | undefined, actorName: string): Ticket | null {
    const tickets = this.getTickets();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const updatedTicket: Ticket = {
      ...ticket,
      assigneeId,
      assigneeName,
      scheduledAt: scheduledAt || ticket.scheduledAt,
      status: 'ASSIGNED',
      updatedAt: new Date().toISOString(),
    };

    tickets[index] = updatedTicket;
    this.saveTickets(tickets);

    this.addAuditLog({
      user: actorName,
      action: `Điều phối phiếu [${ticket.code}] cho kỹ thuật viên ${assigneeName}`,
      entity: `Ticket: ${ticket.code}`,
      level: 'INFO',
    });

    return updatedTicket;
  },

  updateTicketProcess(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      scheduledAt?: string;
      technicalNotes?: string;
      supplies?: SupplyItem[];
      afterImages?: string[];
      completedAt?: string;
    },
    actorName: string
  ): Ticket | null {
    const tickets = this.getTickets();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const isCompleted = updates.status === 'DONE';

    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      completedAt: isCompleted ? (updates.completedAt || new Date().toISOString()) : ticket.completedAt,
      updatedAt: new Date().toISOString(),
    };

    tickets[index] = updatedTicket;
    this.saveTickets(tickets);

    const statusNote = updates.status ? ` - Trạng thái: ${updates.status}` : '';
    this.addAuditLog({
      user: actorName,
      action: `Kỹ thuật viên cập nhật tiến độ xử lý phiếu [${ticket.code}]${statusNote}`,
      entity: `Ticket: ${ticket.code}`,
      level: isCompleted ? 'INFO' : 'WARNING',
    });

    return updatedTicket;
  },

  rateTicket(ticketId: string, feedback: RatingFeedback, actorName: string): Ticket | null {
    const tickets = this.getTickets();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const updatedTicket: Ticket = {
      ...ticket,
      rating: feedback.stars,
      feedback: {
        ...feedback,
        submittedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    tickets[index] = updatedTicket;
    this.saveTickets(tickets);

    this.addAuditLog({
      user: actorName,
      action: `Khách hàng đánh giá ${feedback.stars} sao cho phiếu hoàn thành [${ticket.code}]`,
      entity: `Ticket: ${ticket.code}`,
      level: 'INFO',
    });

    return updatedTicket;
  },

  // --- USERS ---
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(USERS_KEY);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.notifyChange();
  },

  createUser(user: Omit<User, 'id'>, actorName: string): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
    };
    const updated = [...users, newUser];
    this.saveUsers(updated);

    this.addAuditLog({
      user: actorName,
      action: `Thêm người dùng mới: ${newUser.fullName} (${newUser.username})`,
      entity: `User: ${newUser.username}`,
      level: 'SECURITY',
    });

    return newUser;
  },

  updateUser(id: string, updates: Partial<User>, actorName: string): User | null {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    this.saveUsers(users);

    this.addAuditLog({
      user: actorName,
      action: `Cập nhật thông tin người dùng: ${updatedUser.fullName} (${updatedUser.username})`,
      entity: `User: ${updatedUser.username}`,
      level: 'INFO',
    });

    return updatedUser;
  },

  toggleUserActive(id: string, actorName: string): User | null {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const user = users[index];
    user.active = !user.active;
    users[index] = user;
    this.saveUsers(users);

    this.addAuditLog({
      user: actorName,
      action: `${user.active ? 'Mở khóa' : 'Khóa'} tài khoản người dùng: ${user.username}`,
      entity: `User: ${user.username}`,
      level: user.active ? 'INFO' : 'DANGER',
    });

    return user;
  },

  deleteUser(id: string, actorName: string): boolean {
    const users = this.getUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return false;

    const updated = users.filter((u) => u.id !== id);
    this.saveUsers(updated);

    this.addAuditLog({
      user: actorName,
      action: `Xóa tài khoản người dùng: ${target.fullName} (${target.username})`,
      entity: `User: ${target.username}`,
      level: 'DANGER',
    });

    return true;
  },

  // --- DEPARTMENTS ---
  getDepartments(): Department[] {
    try {
      const data = localStorage.getItem(DEPTS_KEY);
      return data ? JSON.parse(data) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  },

  saveDepartments(depts: Department[]) {
    localStorage.setItem(DEPTS_KEY, JSON.stringify(depts));
    this.notifyChange();
  },

  createDepartment(dept: Omit<Department, 'id'>, actorName: string): Department {
    const depts = this.getDepartments();
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
    };
    const updated = [...depts, newDept];
    this.saveDepartments(updated);

    this.addAuditLog({
      user: actorName,
      action: `Thêm đơn vị/phòng ban mới: [${newDept.code}] ${newDept.name}`,
      entity: `Dept: ${newDept.code}`,
      level: 'INFO',
    });

    return newDept;
  },

  updateDepartment(id: string, updates: Partial<Department>, actorName: string): Department | null {
    const depts = this.getDepartments();
    const index = depts.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const updatedDept = { ...depts[index], ...updates };
    depts[index] = updatedDept;
    this.saveDepartments(depts);

    this.addAuditLog({
      user: actorName,
      action: `Cập nhật thông tin phòng ban: [${updatedDept.code}] ${updatedDept.name}`,
      entity: `Dept: ${updatedDept.code}`,
      level: 'INFO',
    });

    return updatedDept;
  },

  deleteDepartment(id: string, actorName: string): boolean {
    const depts = this.getDepartments();
    const target = depts.find((d) => d.id === id);
    if (!target) return false;

    const updated = depts.filter((d) => d.id !== id);
    this.saveDepartments(updated);

    this.addAuditLog({
      user: actorName,
      action: `Xóa phòng ban [${target.code}] ${target.name}`,
      entity: `Dept: ${target.code}`,
      level: 'WARNING',
    });

    return true;
  },

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(AUDIT_KEY);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp' | 'ip'> & { ip?: string }) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ip: entry.ip || '192.168.1.100',
      ...entry,
    };
    const updated = [newLog, ...logs].slice(0, 100); // keep recent 100 logs
    localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
    this.notifyChange();
  },
};
