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
  Award, User, Phone, Building2, ExternalLink, X, FileText,
} from 'lucide-react';

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

  const queueGroups = useMemo(() => [
    { id: 'ASSIGNED' as TicketStatus, title: 'Chờ nhận nhiệm vụ', colorClass: 'border-blue-400 bg-blue-50/50 text-blue-800', dotClass: 'bg-blue-500', tickets: tickets.filter((t) => t.status === 'ASSIGNED') },
    { id: 'PROCESSING' as TicketStatus, title: 'Đang xử lý', colorClass: 'border-amber-400 bg-amber-50/50 text-amber-800', dotClass: 'bg-amber-500', tickets: tickets.filter((t) => t.status === 'PROCESSING') },
    { id: 'WAITING_SUPPLY' as TicketStatus, title: 'Chờ vật tư', colorClass: 'border-orange-400 bg-orange-50/50 text-orange-800', dotClass: 'bg-orange-500', tickets: tickets.filter((t) => t.status === 'WAITING_SUPPLY') },
    { id: 'DONE' as TicketStatus, title: 'Hoàn thành', colorClass: 'border-emerald-400 bg-emerald-50/50 text-emerald-800', dotClass: 'bg-emerald-500', tickets: tickets.filter((t) => t.status === 'DONE') },
  ], [tickets]);

  const activeTicket = useMemo(() => {
    if (selectedTicketId) {
      const found = tickets.find((t) => t.id === selectedTicketId);
      if (found) return found;
    }
    const pending = tickets.find((t) => t.status !== 'DONE');
    return pending || tickets[0] || null;
  }, [tickets, selectedTicketId]);

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

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      <Header
        rightAction={
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/admin');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-xs font-bold text-[#B71C1C] hover:underline px-2 hidden sm:inline"
            >
              ← Toàn bộ hệ thống
            </a>
            <button
              type="button"
              onClick={() => setIsKpiModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              <Award className="w-4 h-4 text-white" />
              <span>Báo cáo KPI</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Hàng đợi ({tickets.length})
              </span>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              {queueGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-bold ${group.colorClass}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${group.dotClass}`} />
                      <span>{group.title}</span>
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/80 font-mono">
                      {group.tickets.length}
                    </span>
                  </div>

                  {group.tickets.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 italic px-3 py-1">
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
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#B71C1C] ring-2 ring-red-800/10 shadow-md'
                                : 'bg-white border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono font-bold text-xs bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                                {t.code}
                              </span>
                              <PriorityBadge priority={t.priority} size="sm" />
                            </div>
                            <h4 className="font-bold text-xs text-neutral-900 line-clamp-2 mb-1">
                              {t.title}
                            </h4>
                            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                              <span className="truncate max-w-[140px]">{t.departmentName}</span>
                              <span className="text-neutral-400 font-mono">
                                {new Date(t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              </span>
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

          <div className="lg:col-span-8 space-y-5">
            {activeTicket ? (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-200">
                          {activeTicket.code}
                        </span>
                        <StatusBadge status={activeTicket.status} size="sm" />
                        <PriorityBadge priority={activeTicket.priority} size="sm" />
                      </div>
                      <h2 className="text-lg font-bold text-neutral-900 leading-snug">
                        {activeTicket.title}
                      </h2>
                    </div>
                    <div className="text-right text-xs text-neutral-500">
                      <div>Loại: <span className="font-semibold text-[#B71C1C]">{activeTicket.category}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60 text-xs">
                    <div>
                      <span className="text-neutral-400 block flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Người gửi:
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {activeTicket.creatorName} ({activeTicket.creatorPosition})
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Đơn vị:
                      </span>
                      <span className="font-medium text-neutral-800 truncate block">
                        {activeTicket.departmentName}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> SĐT:
                      </span>
                      <a href={`tel:${activeTicket.creatorPhone}`} className="font-bold text-blue-600 hover:underline">
                        {activeTicket.creatorPhone}
                      </a>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#B71C1C]" /> Nội dung sự cố:
                    </h4>
                    <p className="text-xs text-neutral-700 bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/60 whitespace-pre-wrap leading-relaxed">
                      {activeTicket.description}
                    </p>
                  </div>
                </div>

                <TicketProcessForm
                  ticket={activeTicket}
                  onSave={handleSaveProgress}
                  onComplete={handleCompleteTicket}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-2xs">
                <p className="text-sm text-neutral-500">
                  Chọn một phiếu để xem chi tiết.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <TechnicalKpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        tickets={tickets}
        technicianName={user?.fullName || 'Kỹ thuật viên'}
        technicianId={user?.id}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-300 p-2 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-5 h-5" /> Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};