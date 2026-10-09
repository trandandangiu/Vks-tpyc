import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { apiClient } from '../services/apiClient';
import { Ticket, User, Department, AuditLog, TicketStatus, SupplyItem } from '../types';
import { Header } from '../components/common/Header';
import { Sidebar, AdminTab } from '../components/common/Sidebar';
import { AdminOverview } from '../components/admin/AdminOverview';
import { TicketList } from '../components/tickets/TicketList';
import { TicketForm } from '../components/tickets/TicketForm';
import { DispatchBoard } from '../components/admin/DispatchBoard';
import { UserManager } from '../components/admin/UserManager';
import { DeptManager } from '../components/admin/DeptManager';
import { AuditLogTable } from '../components/admin/AuditLogTable';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { TicketProcessForm } from '../components/tickets/TicketProcessForm';
import { RatingModal } from '../components/tickets/RatingModal';
import { TechnicalKpiModal } from '../components/technical/TechnicalKpiModal';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge } from '../components/common/StatusBadge';
import { Award, Wrench, User as UserIcon, Phone, Building2, ExternalLink, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selected ticket for modal / detail
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [ratingTicket, setRatingTicket] = useState<Ticket | null>(null);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [ticketListStatusFilter, setTicketListStatusFilter] = useState<string>('ALL');
  const [ticketListPriorityFilter, setTicketListPriorityFilter] = useState<string>('ALL');
  // For Technical Process Tab
  const [selectedProcessTicketId, setSelectedProcessTicketId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [t, u, d, a] = await Promise.all([
        apiClient.getTickets({ limit: 200 }),
        apiClient.getUsers({ limit: 200 }),
        apiClient.getDepartments(),
        apiClient.getAuditLogs({ limit: 100 }),
      ]);
      setTickets(t);
      setUsers(u);
      setDepartments(d);
      setAuditLogs(a);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải dữ liệu');
    }
  };

  useEffect(() => {
    loadData();
    // Polling 30s thay cho realtime storage event
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);


  const newTicketsCount = tickets.filter((t) => t.status === 'NEW').length;
  // Without role restriction, all active users can be assigned
  const allStaff = users.filter((u) => u.active);

  // Group queue for process tab
  const queueGroups = useMemo(() => {
    return [
      {
        id: 'ASSIGNED' as TicketStatus,
        title: 'Chờ nhận nhiệm vụ',
        colorClass: 'border-blue-400 bg-blue-50/50 text-blue-800',
        dotClass: 'bg-blue-500',
        tickets: tickets.filter((t) => t.status === 'ASSIGNED'),
      },
      {
        id: 'PROCESSING' as TicketStatus,
        title: 'Đang xử lý',
        colorClass: 'border-amber-400 bg-amber-50/50 text-amber-800',
        dotClass: 'bg-amber-500',
        tickets: tickets.filter((t) => t.status === 'PROCESSING'),
      },
      {
        id: 'WAITING_SUPPLY' as TicketStatus,
        title: 'Chờ vật tư linh kiện',
        colorClass: 'border-orange-400 bg-orange-50/50 text-orange-800',
        dotClass: 'bg-orange-500',
        tickets: tickets.filter((t) => t.status === 'WAITING_SUPPLY'),
      },
      {
        id: 'DONE' as TicketStatus,
        title: 'Đã hoàn thành',
        colorClass: 'border-emerald-400 bg-emerald-50/50 text-emerald-800',
        dotClass: 'bg-emerald-500',
        tickets: tickets.filter((t) => t.status === 'DONE'),
      },
    ];
  }, [tickets]);

  // Selected process ticket
  const activeProcessTicket = useMemo(() => {
    if (selectedProcessTicketId) {
      const found = tickets.find((t) => t.id === selectedProcessTicketId);
      if (found) return found;
    }
    const pending = tickets.find((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.status !== 'NEW');
    return pending || tickets[0] || null;
  }, [tickets, selectedProcessTicketId]);

  const handleSaveProcess = (updates: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
  }) => {
    if (!activeProcessTicket) return;

    storageService.updateTicketProcess(
      activeProcessTicket.id,
      updates,
      user?.fullName || 'Cán bộ xử lý'
    );

    toast.success(`Đã lưu tiến trình xử lý phiếu [${activeProcessTicket.code}]`);
    loadData();
  };

  const handleCompleteProcess = (updates: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
    completedAt: string;
  }) => {
    if (!activeProcessTicket) return;

    storageService.updateTicketProcess(
      activeProcessTicket.id,
      updates,
      user?.fullName || 'Cán bộ xử lý'
    );

    toast.success(`Phiếu [${activeProcessTicket.code}] đã hoàn thành thành công.`);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      {/* Header */}
      <Header
        showMenuButton={true}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
        rightAction={
          <button
            type="button"
            onClick={() => setIsKpiModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            title="Xem chỉ số KPI kỹ thuật"
          >
            <Award className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Báo cáo KPI</span>
          </button>
        }
      />

      {/* Main Shell: Sidebar + Content */}
      <div className="flex-1 flex w-full">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          newTicketsCount={newTicketsCount}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Tab 1: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <AdminOverview
                tickets={tickets}
                onViewTicket={(t) => setViewingTicket(t)}
                onGoToDispatch={() => setActiveTab('dispatch')}
                onGoToProcessing={() => setActiveTab('all-tickets')}  // ✅ THÊM — chuyển sang tab All Tickets
                onGoToDone={() => setActiveTab('all-tickets')}
              />
            )}

            {/* Tab 2: Create Ticket */}
            {activeTab === 'create-ticket' && (
              <div className="animate-in fade-in duration-200">
                <TicketForm
                  onSuccess={() => {
                    loadData();
                    setActiveTab('all-tickets');
                  }}
                />
              </div>
            )}

            {/* Tab 3: All Tickets */}
            {activeTab === 'all-tickets' && (
              <TicketList
                tickets={tickets}
                onSelectTicket={(t) => setViewingTicket(t)}
                title="Tất cả phiếu yêu cầu kỹ thuật toàn viện"
                showFilters={true}
                initialStatusFilter={ticketListStatusFilter}   // ✅ THÊM prop
                onFilterChange={() => setTicketListStatusFilter('ALL')} /
              />
            )}

            {/* Tab 4: Dispatch Board */}
            {activeTab === 'dispatch' && (
              <DispatchBoard
                tickets={tickets}
                technicians={allStaff}
                onDispatched={loadData}
              />
            )}

            {/* Tab 5: Technical Resolution Workspace */}
            {activeTab === 'process' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-200">
                {/* Column 1: Queue (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Hàng đợi xử lý ({tickets.filter((t) => t.status !== 'NEW').length})
                    </span>
                    <span className="text-[11px] text-neutral-400">Chọn phiếu để thao tác</span>
                  </div>

                  <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
                    {queueGroups.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <div
                          className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-bold ${group.colorClass}`}
                        >
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
                            Không có phiếu ở trạng thái này
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {group.tickets.map((t) => {
                              const isSelected = activeProcessTicket?.id === t.id;
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedProcessTicketId(t.id)}
                                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                                    ? 'bg-white border-[#B71C1C] ring-2 ring-red-800/10 shadow-md'
                                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-2xs'
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
                                      {new Date(t.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                      })}
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

                {/* Column 2: Detail panel & Process Form (8 cols) */}
                <div className="lg:col-span-8 space-y-5">
                  {activeProcessTicket ? (
                    <div className="space-y-5">
                      {/* Ticket sender info */}
                      <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-sm bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-200">
                                {activeProcessTicket.code}
                              </span>
                              <PriorityBadge priority={activeProcessTicket.priority} size="sm" />
                            </div>
                            <h2 className="text-lg font-bold text-neutral-900 leading-snug">
                              {activeProcessTicket.title}
                            </h2>
                          </div>

                          <div className="text-right text-xs text-neutral-500">
                            <div>Loại sự cố: <span className="font-semibold text-[#B71C1C]">{activeProcessTicket.category}</span></div>
                          </div>
                        </div>

                        {/* Sender details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60 text-xs">
                          <div>
                            <span className="text-neutral-400 block flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" /> Người gửi yêu cầu:
                            </span>
                            <span className="font-semibold text-neutral-800">
                              {activeProcessTicket.creatorName} ({activeProcessTicket.creatorPosition})
                            </span>
                          </div>

                          <div>
                            <span className="text-neutral-400 block flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" /> Đơn vị công tác:
                            </span>
                            <span className="font-medium text-neutral-800 truncate block">
                              {activeProcessTicket.departmentName}
                            </span>
                          </div>

                          <div>
                            <span className="text-neutral-400 block flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> Điện thoại liên hệ:
                            </span>
                            <a
                              href={`tel:${activeProcessTicket.creatorPhone}`}
                              className="font-bold text-blue-600 hover:underline"
                            >
                              {activeProcessTicket.creatorPhone}
                            </a>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-xs text-neutral-700 bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/60 whitespace-pre-wrap leading-relaxed">
                            {activeProcessTicket.description}
                          </p>
                        </div>

                        {/* BEFORE Images */}
                        {activeProcessTicket.beforeImages && activeProcessTicket.beforeImages.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                              Ảnh hiện trạng ban đầu (BEFORE)
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {activeProcessTicket.beforeImages.map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setPreviewImage(img)}
                                  className="group relative aspect-video rounded-xl overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100"
                                >
                                  <img
                                    src={img}
                                    alt={`Hiện trạng ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <ExternalLink className="w-4 h-4" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Technical Processing Form */}
                      <TicketProcessForm
                        ticket={activeProcessTicket}
                        onSave={handleSaveProcess}
                        onComplete={handleCompleteProcess}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 shadow-2xs">
                      <p className="text-sm text-neutral-500">
                        Chọn một phiếu yêu cầu bên danh sách để xem chi tiết và cập nhật xử lý.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Users Management */}
            {activeTab === 'users' && (
              <UserManager
                users={users}
                departments={departments}
                onRefresh={loadData}
              />
            )}

            {/* Tab 7: Departments Management */}
            {activeTab === 'departments' && (
              <DeptManager
                departments={departments}
                onRefresh={loadData}
              />
            )}

            {/* Tab 8: Audit Logs */}
            {activeTab === 'audit-logs' && (
              <AuditLogTable logs={auditLogs} />
            )}
          </div>
        </main>
      </div>

      {/* Modal View Ticket Detail */}
      <Modal
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        title="Chi tiết phiếu yêu cầu kỹ thuật"
        subtitle={`Mã phiếu: ${viewingTicket?.code}`}
        maxWidth="2xl"
      >
        {viewingTicket && (
          <TicketDetail
            ticket={viewingTicket}
            onClose={() => setViewingTicket(null)}
            canRate={true}
            onRate={() => {
              const current = viewingTicket;
              setViewingTicket(null);
              setRatingTicket(current);
            }}
          />
        )}
      </Modal>

      {/* Modal Rating */}
      <RatingModal
        isOpen={!!ratingTicket}
        onClose={() => setRatingTicket(null)}
        ticket={ratingTicket}
        onRated={loadData}
      />

      {/* Modal KPI */}
      <TechnicalKpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        tickets={tickets}
        technicianName={user?.fullName || 'Cán bộ'}
      />

      {/* Lightbox Preview Image */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Phóng to ảnh"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
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
