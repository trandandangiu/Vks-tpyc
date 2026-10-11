import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Ticket, TicketStatus, SupplyItem } from '../types';
import { Header } from '../components/common/Header';
import { StatusBadge, PriorityBadge } from '../components/common/StatusBadge';
import { TicketProcessForm } from '../components/tickets/TicketProcessForm';
import { TechnicalKpiModal } from '../components/technical/TechnicalKpiModal';
import { useToast } from '../components/common/Toast';
import {
  Award,
  User,
  Phone,
  Building2,
  ExternalLink,
  X,
  FileText,
  Inbox,
  ArrowLeft,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';

// ─── Cấu hình màu cho từng nhóm trạng thái ───
type GroupConfig = {
  id: TicketStatus;
  title: string;
  accent: string;      // màu chữ + vạch trái
  bgSoft: string;      // nền nhạt cho header nhóm
  border: string;
  dot: string;
  badge: string;
};

const QUEUE_GROUPS: GroupConfig[] = [
  {
    id: 'ASSIGNED',
    title: 'Chờ nhận nhiệm vụ',
    accent: 'text-indigo-700',
    bgSoft: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'PROCESSING',
    title: 'Đang xử lý',
    accent: 'text-blue-700',
    bgSoft: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'WAITING_SUPPLY',
    title: 'Chờ vật tư',
    accent: 'text-amber-700',
    bgSoft: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'DONE',
    title: 'Hoàn thành',
    accent: 'text-emerald-700',
    bgSoft: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
  },
];

export const TechnicalDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      const all = await apiClient.getTickets({ limit: 200 });
      const techTickets = user
        ? all.filter((t) => t.assigneeId === user.id || t.status !== 'NEW')
        : all;
      setTickets(techTickets);
    } catch (err) {
      console.error('Lỗi tải tickets:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    const timer = setInterval(loadTickets, 30000);
    return () => clearInterval(timer);
  }, [user?.id]);

  // ─── Gộp nhóm theo trạng thái ───
  const queueGroups = useMemo(() => {
    return QUEUE_GROUPS.map((cfg) => ({
      ...cfg,
      tickets: tickets.filter((t) => t.status === cfg.id),
    }));
  }, [tickets]);

  const totalInQueue = useMemo(
    () =>
      queueGroups.reduce(
        (sum, g) => sum + (g.id === 'DONE' ? 0 : g.tickets.length),
        0
      ),
    [queueGroups]
  );

  const activeTicket = useMemo(() => {
    if (selectedTicketId) {
      const found = tickets.find((t) => t.id === selectedTicketId);
      if (found) return found;
    }
    const pending = tickets.find((t) => t.status !== 'DONE');
    return pending || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  // ─── Xử lý cập nhật ───
  const handleSaveProgress = async (updates: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
  }) => {
    if (!activeTicket) return;
    try {
      const res = await apiClient.processTicket(activeTicket.id, {
        status: updates.status,
        scheduledAt: updates.scheduledAt,
        processNote: updates.technicalNotes,
        supplies: updates.supplies,
      });
      if (res.success) {
        toast.success(`Đã lưu tiến trình [${activeTicket.code}]`);
        loadTickets();
      } else {
        toast.error(res.message || 'Lỗi lưu');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleCompleteTicket = async (updates: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
    completedAt: string;
  }) => {
    if (!activeTicket) return;
    try {
      const res = await apiClient.processTicket(activeTicket.id, {
        status: 'DONE',
        scheduledAt: updates.scheduledAt,
        processNote: updates.technicalNotes,
        supplies: updates.supplies,
      });
      if (res.success) {
        toast.success(`Hoàn thành phiếu [${activeTicket.code}]!`);
        loadTickets();
      } else {
        toast.error(res.message || 'Lỗi hoàn thành');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const goToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      {/* ═══ HEADER ═══ */}
      <Header
        rightAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all cursor-pointer backdrop-blur-sm"
              title="Về không gian quản trị"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Toàn bộ hệ thống
            </button>
            <button
              type="button"
              onClick={() => setIsKpiModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/30 transition-all cursor-pointer backdrop-blur-sm"
              title="Xem chỉ số KPI kỹ thuật"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Báo cáo KPI</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {/* Thanh thông tin nhanh */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-full px-3 py-1">
            <Layers className="w-3.5 h-3.5 text-[#B71C1C]" />
            Tổng phiếu được giao: <strong className="text-neutral-900">{tickets.length}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
            <Inbox className="w-3.5 h-3.5" />
            Đang chờ xử lý: <strong>{totalInQueue}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ═══ LEFT: Hàng đợi ═══ */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Hàng đợi xử lý
              </span>
              <span className="text-[11px] text-neutral-400">
                Bấm để xem chi tiết
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {queueGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  {/* Header nhóm */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border ${group.border} ${group.bgSoft}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                      <span className={`text-xs font-bold ${group.accent}`}>
                        {group.title}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${group.badge}`}
                    >
                      {group.tickets.length}
                    </span>
                  </div>

                  {/* Danh sách phiếu */}
                  {group.tickets.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 italic px-3 py-1.5">
                      Không có phiếu
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.tickets.map((t) => {
                        const isSelected = activeTicket?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTicketId(t.id)}
                            className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer bg-white ${
                              isSelected
                                ? 'border-[#B71C1C] ring-2 ring-[#B71C1C]/15 shadow-md'
                                : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                            }`}
                          >
                            {/* Vạch trái màu nhóm */}
                            <span
                              className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${group.dot}`}
                            />

                            <div className="pl-2">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-mono font-bold text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                                  {t.code}
                                </span>
                                <PriorityBadge priority={t.priority} size="sm" />
                              </div>

                              <h4 className="font-bold text-xs text-neutral-900 line-clamp-2 leading-snug mb-1.5">
                                {t.title}
                              </h4>

                              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-100">
                                <span className="truncate max-w-[150px]">
                                  {t.departmentName}
                                </span>
                                <span className="text-neutral-400 font-mono shrink-0 ml-2">
                                  {new Date(t.createdAt).toLocaleDateString(
                                    'vi-VN',
                                    { day: '2-digit', month: '2-digit' }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══ RIGHT: Chi tiết + Form xử lý ═══ */}
          <div className="lg:col-span-8 space-y-5">
            {activeTicket ? (
              <>
                {/* Card thông tin phiếu */}
                <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
                  {/* Dải màu trên đầu card */}
                  <div className="h-1 bg-gradient-to-r from-[#8E0000] via-[#B71C1C] to-[#8E0000]" />

                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Tiêu đề + badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono font-bold text-sm bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-200">
                            {activeTicket.code}
                          </span>
                          <StatusBadge status={activeTicket.status} size="sm" />
                          <PriorityBadge priority={activeTicket.priority} size="sm" />
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-red-50 text-[#B71C1C] border border-red-100 font-semibold">
                            {activeTicket.category}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                          {activeTicket.title}
                        </h2>
                      </div>
                    </div>

                    {/* Grid thông tin người gửi */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                          <User className="w-3 h-3" />
                          Người gửi
                        </div>
                        <div className="text-xs font-bold text-neutral-900 truncate">
                          {activeTicket.creatorName}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {activeTicket.creatorPosition}
                        </div>
                      </div>

                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                          <Building2 className="w-3 h-3" />
                          Đơn vị
                        </div>
                        <div className="text-xs font-medium text-neutral-800 line-clamp-2">
                          {activeTicket.departmentName}
                        </div>
                      </div>

                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                          <Phone className="w-3 h-3" />
                          Liên hệ
                        </div>
                        <a
                          href={`tel:${activeTicket.creatorPhone}`}
                          className="text-xs font-bold text-[#B71C1C] hover:underline"
                        >
                          {activeTicket.creatorPhone}
                        </a>
                      </div>
                    </div>

                    {/* Nội dung sự cố */}
                    <div>
                      <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#B71C1C]" />
                        Nội dung sự cố
                      </h4>
                      <p className="text-xs text-neutral-700 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/60 whitespace-pre-wrap leading-relaxed">
                        {activeTicket.description}
                      </p>
                    </div>

                    {/* Ảnh BEFORE nếu có */}
                    {activeTicket.beforeImages &&
                      activeTicket.beforeImages.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-[#B71C1C]" />
                            Ảnh hiện trạng ban đầu ({activeTicket.beforeImages.length})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {activeTicket.beforeImages.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(img)}
                                className="group relative aspect-video rounded-xl overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100"
                              >
                                <img
                                  src={img}
                                  alt={`Ảnh ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ExternalLink className="w-4 h-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Form xử lý */}
                <TicketProcessForm
                  ticket={activeTicket}
                  onSave={handleSaveProgress}
                  onComplete={handleCompleteTicket}
                />
              </>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-neutral-700">
                  Chưa có phiếu nào
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Chọn một phiếu bên trái để xem chi tiết và cập nhật xử lý.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal KPI */}
      <TechnicalKpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        tickets={tickets}
        technicianName={user?.fullName || 'Kỹ thuật viên'}
        technicianId={user?.id}
      />

      {/* Lightbox xem ảnh */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 p-2 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-5 h-5" /> Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};