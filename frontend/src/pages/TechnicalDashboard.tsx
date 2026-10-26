import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Ticket, TicketStatus, SupplyItem } from '../types';
import { Header } from '../components/common/Header';
import { StatusBadge, PriorityBadge } from '../components/common/StatusBadge';
import { TicketForm } from '../components/tickets/TicketForm';
import { TicketProcessForm } from '../components/tickets/TicketProcessForm';
import { TicketPrintModal } from '../components/tickets/TicketPrintModal';
import { TechnicalKpiModal } from '../components/technical/TechnicalKpiModal';
import { DeviceIpManager } from '../components/technical/DeviceIpManager';
import { TicketChatWidget } from '../components/chat/TicketChatWidget';
import { useToast } from '../components/common/Toast';
import logoUrl from '../public/icon.ico';
import {
  Award,
  User,
  Phone,
  Building2,
  ExternalLink,
  X,
  FileText,
  ArrowLeft,
  Image as ImageIcon,
  Printer,
  Wrench,
  CheckCircle2,
  ListTodo,
  Search,
  Clock,
  Tag,
  Network,
  MessageSquare,
  PlusCircle,
} from 'lucide-react';

type TechTab = 'pending' | 'create-ticket' | 'done' | 'all' | 'device-ips' | 'blank-sticker';

export const TechnicalDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TechTab>('pending');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [printingTicket, setPrintingTicket] = useState<Ticket | null>(null);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Bộ lọc tìm kiếm nhanh trong danh sách
  const [searchQuery, setSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<string>('ALL');

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
    const handleRealtimeUpdate = () => loadTickets();
    window.addEventListener('ticket-updated', handleRealtimeUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('ticket-updated', handleRealtimeUpdate);
    };
  }, [user?.id]);

  // Đếm số lượng theo nhóm cho Sidebar badge
  const pendingTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status === 'ASSIGNED' ||
          t.status === 'PROCESSING' ||
          t.status === 'WAITING_SUPPLY'
      ),
    [tickets]
  );

  const doneTickets = useMemo(
    () => tickets.filter((t) => t.status === 'DONE'),
    [tickets]
  );

  // Danh sách hiển thị theo Tab + Search + SubFilter
  const displayedTickets = useMemo(() => {
    let base: Ticket[] = [];
    if (activeTab === 'pending') base = pendingTickets;
    else if (activeTab === 'done') base = doneTickets;
    else base = tickets;

    if (activeTab === 'pending' && subStatusFilter !== 'ALL') {
      base = base.filter((t) => t.status === subStatusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (t) =>
          (t.code || '').toLowerCase().includes(q) ||
          (t.title || '').toLowerCase().includes(q) ||
          (t.departmentName || '').toLowerCase().includes(q) ||
          (t.creatorName || '').toLowerCase().includes(q) ||
          (t.creatorPhone || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [activeTab, pendingTickets, doneTickets, tickets, subStatusFilter, searchQuery]);

  // Phiếu đang mở để xử lý chi tiết
  const activeTicket = useMemo(() => {
    if (!editingTicketId) return null;
    return tickets.find((t) => t.id === editingTicketId) || null;
  }, [tickets, editingTicketId]);

  // Phiếu mẫu rỗng dùng khi KTV bấm "In tem trắng" từ Sidebar
  const blankTemplateTicket: Ticket = useMemo(
    () => ({
      id: 'blank',
      code: '',
      title: '',
      description: '',
      category: 'Khác',
      priority: 'NORMAL',
      status: 'PROCESSING',
      creatorId: '',
      creatorName: '',
      creatorPhone: '',
      creatorPosition: '',
      departmentId: '',
      departmentName: '',
      assigneeName: user?.fullName || '',
      supplies: [],
      createdAt: new Date().toISOString(),
    }),
    [user?.fullName]
  );

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
        await loadTickets();
        setEditingTicketId(null); // Quay về danh sách việc cần làm
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

  const goToDepartmentPage = (deptId: string) => {
    window.history.pushState({}, '', `/customer?deptId=${encodeURIComponent(deptId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleTicketCreated = (createdTicket?: Ticket) => {
    if (createdTicket?.departmentId) {
      goToDepartmentPage(createdTicket.departmentId);
      return;
    }
    loadTickets();
    setActiveTab('pending');
  };

  const handleSelectTab = (tab: TechTab) => {
    if (tab === 'blank-sticker') {
      setPrintingTicket(blankTemplateTicket);
      setIsMobileSidebarOpen(false);
      return;
    }
    setActiveTab(tab);
    setEditingTicketId(null);
    setSubStatusFilter('ALL');
    setIsMobileSidebarOpen(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const navItems: {
    id: TechTab;
    label: string;
    icon: React.ElementType;
    badge?: number | null;
  }[] = [
    {
      id: 'pending',
      label: 'Việc cần xử lý',
      icon: Wrench,
      badge: pendingTickets.length > 0 ? pendingTickets.length : null,
    },
    {
      id: 'create-ticket',
      label: 'Tạo phiếu theo đơn vị',
      icon: PlusCircle,
    },
    {
      id: 'done',
      label: 'Đã hoàn thành',
      icon: CheckCircle2,
      badge: doneTickets.length > 0 ? doneTickets.length : null,
    },
    {
      id: 'all',
      label: 'Tất cả phiếu',
      icon: ListTodo,
    },
    {
      id: 'device-ips',
      label: 'Dữ liệu Máy & Mã IP',
      icon: Network,
    },
    {
      id: 'blank-sticker',
      label: 'In tem kiểm tra nhanh',
      icon: Tag,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      {/* ═══ HEADER ═══ */}
      <Header
        showMenuButton={true}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
        rightAction={
          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={goToAdmin}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all cursor-pointer backdrop-blur-sm"
                title="Về không gian quản trị"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quản trị
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectTab('create-ticket')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Tạo phiếu hỗ trợ theo phòng ban trong CSDL"
            >
              <PlusCircle className="w-4 h-4 text-[#FFD700]" />
              <span className="hidden sm:inline">Tạo phiếu theo đơn vị</span>
            </button>
            <button
              type="button"
              onClick={() => setIsKpiModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Xem chỉ số KPI kỹ thuật"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Báo cáo KPI</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 flex w-full">
        {/* ═══ SIDEBAR KỸ THUẬT VIÊN ═══ */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed md:sticky top-0 md:top-[72px] z-50 md:z-20 h-[100dvh] md:h-[calc(100vh-72px)] w-[250px] bg-white border-r border-neutral-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out shadow-sm md:shadow-none ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Đầu Sidebar */}
          <div className="flex items-center gap-2.5 px-4 h-[68px] border-b border-neutral-200 shrink-0">
            <img
              src={logoUrl}
              alt="Logo"
              className="w-9 h-9 object-contain shrink-0"
              draggable={false}
            />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#B71C1C] leading-tight truncate uppercase">
                KỸ THUẬT VIÊN CNTT
              </p>
              <p className="text-[11px] font-semibold text-neutral-600 truncate">
                {user?.fullName || 'Cán bộ kỹ thuật'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden ml-auto p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu điều hướng */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Công việc kỹ thuật
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`group w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer relative ${
                    isActive
                      ? 'bg-red-50 text-[#B71C1C] font-bold'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#B71C1C]" />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isActive
                          ? 'text-[#B71C1C]'
                          : 'text-neutral-500 group-hover:text-neutral-700'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full ${
                        isActive
                          ? 'bg-[#B71C1C] text-white'
                          : 'bg-red-100 text-[#B71C1C]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Nút mở KPI ở chân Sidebar */}
          <div className="p-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsKpiModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-600" />
              <span>Thống kê hiệu suất KPI</span>
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-5">
            {activeTicket ? (
              /* ─── MÀN HÌNH XỬ LÝ CHI TIẾT 1 PHIẾU ─── */
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Thanh điều hướng quay lại + Nút In tem dán */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-neutral-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setEditingTicketId(null)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-[#B71C1C] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại danh sách phiếu</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeTicket.departmentId && (
                      <button
                        type="button"
                        onClick={() => goToDepartmentPage(activeTicket.departmentId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-all cursor-pointer"
                        title={`Mở trang của ${activeTicket.departmentName}`}
                      >
                        <Building2 className="w-4 h-4 text-[#B71C1C]" />
                        <span>Trang của {activeTicket.departmentName}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('open-ticket-chat', {
                            detail: { ticketId: activeTicket.id },
                          })
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-300" />
                      <span>Trò chuyện với {activeTicket.creatorName}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintingTicket(activeTicket)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#FFD700]" />
                      <span>In tem kiểm tra</span>
                    </button>
                  </div>
                </div>

                {/* Card Thông tin phiếu */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
                  <div className="h-1 bg-[#B71C1C]" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-200">
                        {activeTicket.code}
                      </span>
                      <StatusBadge status={activeTicket.status} size="sm" />
                      <PriorityBadge priority={activeTicket.priority} size="sm" />
                      <span className="text-xs px-2.5 py-0.5 rounded-lg bg-red-50 text-[#B71C1C] border border-red-100 font-semibold">
                        {activeTicket.category}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                      {activeTicket.title}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/70 text-xs">
                      <div>
                        <span className="text-neutral-400 flex items-center gap-1 mb-0.5">
                          <User className="w-3.5 h-3.5" /> Người yêu cầu:
                        </span>
                        <span className="font-bold text-neutral-900">
                          {activeTicket.creatorName}
                        </span>
                        {activeTicket.creatorPosition && (
                          <span className="text-neutral-500 block text-[11px]">
                            {activeTicket.creatorPosition}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-neutral-400 flex items-center gap-1 mb-0.5">
                          <Building2 className="w-3.5 h-3.5" /> Đơn vị:
                        </span>
                        <span className="font-bold text-neutral-900">
                          {activeTicket.departmentName}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-400 flex items-center gap-1 mb-0.5">
                          <Phone className="w-3.5 h-3.5" /> Liên hệ:
                        </span>
                        <a
                          href={`tel:${activeTicket.creatorPhone}`}
                          className="font-bold text-[#B71C1C] hover:underline"
                        >
                          {activeTicket.creatorPhone || '---'}
                        </a>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#B71C1C]" />
                        Mô tả sự cố
                      </h4>
                      <p className="text-sm text-neutral-800 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/60 whitespace-pre-wrap leading-relaxed">
                        {activeTicket.description}
                      </p>
                    </div>

                    {/* Ảnh BEFORE nếu có */}
                    {activeTicket.beforeImages && activeTicket.beforeImages.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#B71C1C]" />
                          Ảnh hiện trạng ({activeTicket.beforeImages.length})
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
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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

                {/* Form cập nhật xử lý */}
                <TicketProcessForm
                  ticket={activeTicket}
                  onSave={handleSaveProgress}
                  onComplete={handleCompleteTicket}
                />
              </div>
            ) : activeTab === 'create-ticket' ? (
              /* ─── MÀN HÌNH TẠO PHIẾU THEO PHÒNG BAN CÓ SẴN TRONG CSDL ─── */
              <div className="space-y-4 animate-in fade-in duration-150">
                <TicketForm onSuccess={handleTicketCreated} />
              </div>
            ) : activeTab === 'device-ips' ? (
              /* ─── MÀN HÌNH DỮ LIỆU MÁY IN / MÁY TÍNH ĐƠN VỊ & MÃ IP ─── */
              <DeviceIpManager />
            ) : (
              /* ─── MÀN HÌNH DANH SÁCH PHIẾU ĐƠN GIẢN, GỌN GÀNG ─── */
              <div className="space-y-4">
                {/* Tiêu đề & Thanh tìm kiếm */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-base sm:text-lg font-bold text-neutral-900">
                        {activeTab === 'pending'
                          ? 'Danh sách công việc cần xử lý'
                          : activeTab === 'done'
                            ? 'Phiếu đã hoàn thành'
                            : 'Tất cả phiếu kỹ thuật'}
                      </h1>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Bấm vào phiếu để cập nhật tiến độ hoặc bấm <strong>"Tạo phiếu theo đơn vị"</strong> khi phòng ban chưa tạo phiếu.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTab('create-ticket')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
                      >
                        <PlusCircle className="w-4 h-4 text-[#FFD700]" />
                        <span>Tạo phiếu theo đơn vị</span>
                      </button>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm mã phiếu, đơn vị, tiêu đề..."
                          className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:border-[#B71C1C] outline-none"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút lọc nhanh khi ở tab Việc cần xử lý */}
                  {activeTab === 'pending' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
                      {[
                        { id: 'ALL', label: `Tất cả (${pendingTickets.length})` },
                        {
                          id: 'ASSIGNED',
                          label: `Chờ nhận (${pendingTickets.filter((t) => t.status === 'ASSIGNED').length})`,
                        },
                        {
                          id: 'PROCESSING',
                          label: `Đang xử lý (${pendingTickets.filter((t) => t.status === 'PROCESSING').length})`,
                        },
                        {
                          id: 'WAITING_SUPPLY',
                          label: `Chờ vật tư (${pendingTickets.filter((t) => t.status === 'WAITING_SUPPLY').length})`,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSubStatusFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            subStatusFilter === tab.id
                              ? 'bg-[#B71C1C] text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bảng danh sách phiếu */}
                {displayedTickets.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-2xs">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-neutral-800">
                      Không có phiếu nào trong mục này
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Các phiếu được phân công sẽ hiển thị tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Mã phiếu</th>
                            <th className="py-3 px-4">Nội dung sự cố</th>
                            <th className="py-3 px-4">Đơn vị / Liên hệ</th>
                            <th className="py-3 px-4">Trạng thái</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-xs">
                          {displayedTickets.map((t) => (
                            <tr
                              key={t.id}
                              onClick={() => setEditingTicketId(t.id)}
                              className="hover:bg-neutral-50/90 transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                <div className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 inline-block mb-1">
                                  {t.code}
                                </div>
                                <div>
                                  <PriorityBadge priority={t.priority} size="sm" />
                                </div>
                              </td>

                              <td className="py-3.5 px-4 align-top min-w-[240px]">
                                <div className="font-bold text-neutral-900 text-xs sm:text-sm leading-snug mb-1">
                                  {t.title}
                                </div>
                                <div className="text-[11px] text-neutral-500 line-clamp-1 mb-1">
                                  {t.description}
                                </div>
                                <div className="inline-flex items-center gap-2 text-[11px] text-[#B71C1C] font-semibold">
                                  <span>{t.category}</span>
                                  {t.scheduledAt && (
                                    <span className="text-blue-700 flex items-center gap-1">
                                      • <Clock className="w-3 h-3" /> Hẹn: {formatDate(t.scheduledAt)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                <div className="font-bold text-neutral-800">{t.departmentName}</div>
                                <div className="text-neutral-500 text-[11px] mt-0.5">
                                  {t.creatorName} {t.creatorPhone ? `• ${t.creatorPhone}` : ''}
                                </div>
                                <div className="text-neutral-400 text-[11px] mt-0.5">
                                  {formatDate(t.createdAt)}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                <StatusBadge status={t.status} size="sm" />
                              </td>

                              <td
                                className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  {t.assigneeId && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.dispatchEvent(
                                          new CustomEvent('open-ticket-chat', {
                                            detail: { ticketId: t.id },
                                          })
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#003366] border border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                                      title={`Trò chuyện với ${t.creatorName}`}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>Chat</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setPrintingTicket(t)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#B71C1C] border border-red-200 font-bold text-xs transition-colors cursor-pointer"
                                    title="In tem kiểm tra dán máy"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>In tem</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditingTicketId(t.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>Xử lý</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Cửa sổ Trò chuyện bảo mật 24h liên thông Technical <-> Customer */}
      <TicketChatWidget />

      {/* Modal KPI */}
      <TechnicalKpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        tickets={tickets}
        technicianName={user?.fullName || 'Kỹ thuật viên'}
        technicianId={user?.id}
      />

      {/* Modal In Phiếu Kiểm Tra (Mặc định In 1 miếng nhỏ - Tem dán) */}
      <TicketPrintModal
        isOpen={!!printingTicket}
        onClose={() => setPrintingTicket(null)}
        ticket={printingTicket}
        technicianName={user?.fullName || 'Kỹ thuật viên'}
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
