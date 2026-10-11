import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, INCIDENT_CATEGORIES, CREATOR_POSITIONS } from '../../types';
import { Modal } from '../common/Modal';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Save } from 'lucide-react';

interface TicketEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSaved?: () => void;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSaved,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [status, setStatus] = useState<TicketStatus>('NEW');
  const [creatorName, setCreatorName] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [creatorPosition, setCreatorPosition] = useState('');

  // Sync khi mở modal
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setCategory(ticket.category || INCIDENT_CATEGORIES[0]);
      setPriority(ticket.priority || 'NORMAL');
      setStatus(ticket.status || 'NEW');
      setCreatorName(ticket.creatorName || '');
      setCreatorPhone(ticket.creatorPhone || '');
      setCreatorPosition(ticket.creatorPosition || CREATOR_POSITIONS[0]);
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { toast.error('Vui lòng nhập tiêu đề!'); return; }
    if (!category) { toast.error('Vui lòng chọn loại sự cố!'); return; }

    setIsSubmitting(true);
    try {
      const res = await apiClient.updateTicket(ticket.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        creatorName: creatorName.trim(),
        creatorPhone: creatorPhone.trim(),
        creatorPosition,
      } as any);

      if (res.success) {
        toast.success(`Đã cập nhật phiếu [${ticket.code}]`);
        onSaved?.();
        onClose();
      } else {
        toast.error(res.message || 'Lỗi cập nhật');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa phiếu yêu cầu"
      subtitle={`Mã phiếu: ${ticket.code}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Loại sự cố <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
            >
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
            Mô tả
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Mức độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
            >
              <option value="LOW">Thấp</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
            >
              <option value="NEW">Chờ điều phối</option>
              <option value="ASSIGNED">Đã phân công</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="WAITING_SUPPLY">Chờ vật tư</option>
              <option value="DONE">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Người yêu cầu
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              SĐT
            </label>
            <input
              type="tel"
              value={creatorPhone}
              onChange={(e) => setCreatorPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Vị trí
            </label>
            <select
              value={creatorPosition}
              onChange={(e) => setCreatorPosition(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
            >
              {CREATOR_POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#B71C1C] hover:bg-[#7F0E0E] rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};