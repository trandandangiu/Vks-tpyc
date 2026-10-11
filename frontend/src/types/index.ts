export type UserRole = 'ADMIN' | 'CUSTOMER' | 'TECHNICAL' | 'USER';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TicketStatus = 'NEW' | 'ASSIGNED' | 'PROCESSING' | 'WAITING_SUPPLY' | 'DONE' | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role?: UserRole;
  departmentId?: string;
  departmentName?: string;
  department?: { id: string; code: string; name: string };
  email: string;
  phone: string;
  active: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface SupplyItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface RatingFeedback {
  stars: number;
  speedRating?: 'Rất nhanh' | 'Đúng hạn' | 'Chậm';
  attitudeRating?: 'Nhiệt tình' | 'Bình thường' | 'Không tốt';
  effectivenessRating?: 'Triệt để' | 'Tạm ổn' | 'Chưa đạt';
  comment?: string;
  submittedAt?: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  creatorId: string;
  creatorName: string;
  creatorPhone: string;
  creatorPosition: string;
  departmentId: string;
  departmentName: string;
  assigneeId?: string;
  assigneeName?: string;
  scheduledAt?: string;
  completedAt?: string;
  processNote?: string;            // đổi từ technicalNotes
  supplies: SupplyItem[];
  attachments?: TicketAttachment[]; // thêm
  rating?: number;
  feedback?: string;               // đổi từ object → string
  ratedAt?: string;                // thêm
  createdAt: string;
  updatedAt?: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  stage: 'BEFORE' | 'AFTER';
  uploadedBy: string;
  uploadedAt: string;
}


export type AuditLogLevel = 'INFO' | 'WARNING' | 'SECURITY' | 'DANGER';
export interface AuditLog {
  id: string;
  createdAt: string;     // sửa từ timestamp
  userName?: string;     // sửa từ user
  userRole?: string;
  action: string;
  entityType?: string;   // sửa từ entity
  entityId?: string;
  ipAddress?: string;    // sửa từ ip
  level: AuditLogLevel;
}

export const PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string; badgeClass: string }> = {
  LOW: { label: 'Thấp', color: '#10B981', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NORMAL: { label: 'Bình thường', color: '#3B82F6', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { label: 'Cao', color: '#F59E0B', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  URGENT: { label: 'Khẩn cấp', color: '#EF4444', badgeClass: 'bg-red-100 text-red-700 border-red-300 font-semibold animate-pulse' },
};

export const STATUS_CONFIG: Record<TicketStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  NEW: {
    label: 'Chờ điều phối',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  ASSIGNED: {
    label: 'Đã phân công',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  WAITING_SUPPLY: {
    label: 'Chờ vật tư',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  DONE: {
    label: 'Hoàn thành',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
  },
};

export const INCIDENT_CATEGORIES = [
  'Mạng LAN / Internet',
  'Cài Win + Chữ ký số',
  'Máy in & Mực in',
  'Máy scan văn thư',
  'Phần mềm Quản lý án',
  'Hệ thống Truyền hình trực tuyến',
  'Khác',
];

export const CREATOR_POSITIONS = [
  
  'Kiểm sát viên trung cấp',
  'Kiểm sát viên sơ cấp',
  'Kiểm tra viên',
  'Chuyên viên',
  'Khác',
];
