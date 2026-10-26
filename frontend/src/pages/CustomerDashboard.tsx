import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Ticket, Department } from '../types';
import { Header } from '../components/common/Header';
import { TicketForm } from '../components/tickets/TicketForm';
import { TicketCard } from '../components/tickets/TicketCard';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { RatingModal } from '../components/tickets/RatingModal';
import { Modal } from '../components/common/Modal';
import { TicketChatWidget } from '../components/chat/TicketChatWidget';
import { PlusCircle, Layers, Inbox, ArrowLeft, Building2 } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'my-tickets'>('my-tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<Ticket | null>(null);
  const [selectedTicketForRate, setSelectedTicketForRate] = useState<Ticket | null>(null);

  const [viewingDeptId, setViewingDeptId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('deptId') || '';
  });

  const isTechOrAdmin = user?.role === 'TECHNICAL' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!isTechOrAdmin) return;
    apiClient
      .getDepartments()
      .then((list) => {
        const sorted = [...list].sort((a, b) => {
          if (a.code === 'CNTT') return 1;
          if (b.code === 'CNTT') return -1;
          return a.code.localeCompare(b.code);
        });
        setDepartments(sorted);
        if (!viewingDeptId && sorted.length > 0) {
          setViewingDeptId(sorted[0].id);
        }
      })
      .catch(() => {});
  }, [isTechOrAdmin]);

  const currentDepartment = useMemo(() => {
    if (viewingDeptId) {
      return departments.find((d) => d.id === viewingDeptId) || null;
    }
    return null;
  }, [departments, viewingDeptId]);

  const loadTickets = async () => {
    try {
      const all = await apiClient.getTickets({ limit: 200 });
      if (isTechOrAdmin && viewingDeptId) {
        setTickets(all.filter((t) => t.departmentId === viewingDeptId));
        return;
      }
      const userDeptId = user?.departmentId || user?.department?.id;
      const my = user
        ? all.filter(
            (t) =>
              t.creatorId === user.id ||
              t.creatorName === user.fullName ||
              (userDeptId && t.departmentId === userDeptId)
          )
        : all;
      setTickets(my);
    } catch (err) {
      console.error('Lỗi tải tickets:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    const timer = setInterval(loadTickets, 15000);
    const handleRealtimeUpdate = () => loadTickets();
    window.addEventListener('ticket-updated', handleRealtimeUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('ticket-updated', handleRealtimeUpdate);
    };
  }, [user?.id, viewingDeptId]);

  const handleTicketCreated = (createdTicket?: Ticket) => {
    if (createdTicket?.departmentId && isTechOrAdmin) {
      setViewingDeptId(createdTicket.departmentId);
      window.history.replaceState({}, '', `/customer?deptId=${encodeURIComponent(createdTicket.departmentId)}`);
    }
    loadTickets();
    setActiveTab('my-tickets');
  };

  const handleBackToWorkspace = () => {
    const targetPath = user?.role === 'TECHNICAL' ? '/technical' : '/admin';
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleChangeViewingDept = (deptId: string) => {
    setViewingDeptId(deptId);
    window.history.replaceState({}, '', `/customer?deptId=${encodeURIComponent(deptId)}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      <Header
        rightAction={
          isTechOrAdmin ? (
            <button
              type="button"
              onClick={handleBackToWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all cursor-pointer backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 text-[#FFD700]" />
              <span>
                {user?.role === 'TECHNICAL' ? 'Về trang Kỹ thuật viên' : 'Về trang Quản trị'}
              </span>
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isTechOrAdmin && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-red-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B71C1C] flex items-center justify-center shrink-0 border border-red-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#B71C1C] uppercase tracking-wider">
                  Đang xem trang phiếu yêu cầu của đơn vị
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-900">
                  {currentDepartment
                    ? `[${currentDepartment.code}] ${currentDepartment.name}`
                    : tickets[0]?.departmentName || 'Chọn đơn vị'}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {departments.length > 0 && (
                <select
                  value={viewingDeptId}
                  onChange={(e) => handleChangeViewingDept(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:border-[#B71C1C] outline-none cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleBackToWorkspace}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại xử lý kỹ thuật</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('my-tickets')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'my-tickets'
                  ? 'bg-[#B71C1C] text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Phiếu yêu cầu ({tickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#B71C1C] text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#FFD700]" />
              <span>Tạo phiếu mới</span>
            </button>
          </div>
        </div>

        {activeTab === 'create' && (
          <TicketForm onSuccess={handleTicketCreated} />
        )}

        {activeTab === 'my-tickets' && (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/90 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-neutral-800 text-base">Chưa có phiếu yêu cầu nào</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Hãy bấm "Tạo phiếu mới" để gửi yêu cầu hỗ trợ.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onViewDetail={(item) => setSelectedTicketForDetail(item)}
                    onRate={(item) => setSelectedTicketForRate(item)}
                    showRateButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cửa sổ Trò chuyện bảo mật 24h liên thông Customer <-> Technical */}
      <TicketChatWidget />

      <Modal
        isOpen={!!selectedTicketForDetail}
        onClose={() => setSelectedTicketForDetail(null)}
        title="Chi tiết phiếu"
        subtitle={`Mã phiếu: ${selectedTicketForDetail?.code}`}
        maxWidth="2xl"
      >
        {selectedTicketForDetail && (
          <TicketDetail
            ticket={selectedTicketForDetail}
            onClose={() => setSelectedTicketForDetail(null)}
            canRate={true}
            onRate={() => {
              const current = selectedTicketForDetail;
              setSelectedTicketForDetail(null);
              setSelectedTicketForRate(current);
            }}
          />
        )}
      </Modal>

      <RatingModal
        isOpen={!!selectedTicketForRate}
        onClose={() => setSelectedTicketForRate(null)}
        ticket={selectedTicketForRate}
        onRated={loadTickets}
      />
    </div>
  );
};
