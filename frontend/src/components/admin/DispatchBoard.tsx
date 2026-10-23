import React, { useState } from 'react';
import { Ticket, User } from '../../types';
import { PriorityBadge } from '../common/StatusBadge';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { GitPullRequest, UserCheck, Building2, CheckCircle } from 'lucide-react';

interface DispatchBoardProps {
  tickets: Ticket[];
  technicians: User[];
  onDispatched?: () => void;
}

export const DispatchBoard: React.FC<DispatchBoardProps> = ({
  tickets,
  technicians,
  onDispatched,
}) => {
  const toast = useToast();
  const newTickets = tickets.filter((t) => t.status === 'NEW');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    newTickets.length > 0 ? newTickets[0].id : null
  );
  const [selectedTechId, setSelectedTechId] = useState<string>(
    technicians.length > 0 ? technicians[0].id : ''
  );
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const activeTicket = newTickets.find((t) => t.id === selectedTicketId)
    || (newTickets.length > 0 ? newTickets[0] : null);

  const handleAssign = async () => {
    if (!activeTicket) {
      toast.error('Vui lòng chọn phiếu yêu cầu cần điều phối!');
      return;
    }
    if (!selectedTechId) {
      toast.error('Vui lòng chọn kỹ thuật viên để phân công!');
      return;
    }

    const tech = technicians.find((t) => t.id === selectedTechId);
    if (!tech) return;

    setIsAssigning(true);
    try {
      const scheduledIso = scheduledTime ? new Date(scheduledTime).toISOString() : undefined;
      const res = await apiClient.assignTicket(activeTicket.id, selectedTechId, scheduledIso);
      if (res.success) {
        toast.success(`Đã phân công phiếu [${activeTicket.code}] cho ${tech.fullName}`);
        const remaining = newTickets.filter((t) => t.id !== activeTicket.id);
        setSelectedTicketId(remaining.length > 0 ? remaining[0].id : null);
        setScheduledTime('');
        if (onDispatched) onDispatched();
      } else {
        toast.error(res.message || 'Lỗi điều phối');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-[#B71C1C]" />
            Bảng điều phối kỹ thuật
          </h2>

        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-[#B71C1C] border border-red-200 text-xs font-bold">
          <span>Đang chờ phân công:</span>
          <span className="w-5 h-5 rounded-full bg-[#B71C1C] text-white flex items-center justify-center text-xs">
            {newTickets.length}
          </span>
        </div>
      </div>

      {newTickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200/90 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-neutral-800 text-base"></h3>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
              Danh sách phiếu mới ({newTickets.length})
            </div>
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {newTickets.map((t) => {
                const isSelected = activeTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/70 border-[#B71C1C] shadow-sm'
                        : 'bg-white border-neutral-200/90 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                        {t.code}
                      </span>
                      <PriorityBadge priority={t.priority} size="sm" />
                    </div>
                    <h4 className="font-bold text-sm text-neutral-900 line-clamp-1 mb-1">
                      {t.title}
                    </h4>
                    <div className="text-xs text-neutral-500 space-y-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{t.departmentName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-700 font-medium">{t.creatorName}</span>
                        <span className="text-[11px] text-neutral-400">{formatDate(t.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            {activeTicket && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-sm space-y-6 sticky top-20">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <span className="font-mono font-bold text-xs bg-red-100 text-[#B71C1C] px-2.5 py-1 rounded-md">
                      {activeTicket.code}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 mt-2">
                      {activeTicket.title}
                    </h3>
                  </div>
                  <PriorityBadge priority={activeTicket.priority} size="md" />
                </div>

                <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/70 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 block">Đơn vị gửi:</span>
                    <span className="font-semibold text-neutral-800">{activeTicket.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Người gửi:</span>
                    <span className="font-semibold text-neutral-800">
                      {activeTicket.creatorName} ({activeTicket.creatorPosition})
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">SĐT:</span>
                    <span className="font-semibold text-blue-600">{activeTicket.creatorPhone}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Loại sự cố:</span>
                    <span className="font-semibold text-[#B71C1C]">{activeTicket.category}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Mô tả sự cố:
                  </h5>
                  <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50/50 p-3 rounded-xl border border-neutral-100">
                    {activeTicket.description}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-50 to-red-50/30 border border-red-100 space-y-4">
                  <h4 className="text-xs font-bold text-[#B71C1C] uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Phân công kỹ thuật viên
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Kỹ thuật viên  <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTechId}
                        onChange={(e) => setSelectedTechId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-medium focus:border-[#B71C1C] focus:outline-none cursor-pointer"
                      >
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.fullName} ({tech.phone || tech.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Hẹn giờ (tùy chọn)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-medium focus:border-[#B71C1C] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={isAssigning}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4 text-[#FFD700]" />
                      <span>{isAssigning ? 'ĐANG GÁN...' : 'GÁN VÀ ĐIỀU PHỐI'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};