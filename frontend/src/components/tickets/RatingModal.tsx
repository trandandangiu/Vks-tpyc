import React, { useState } from 'react';
import { Ticket } from '../../types';
import { Modal } from '../common/Modal';
import { StarRating } from './StarRating';
import { Send } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onRated?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, ticket, onRated }) => {
  const toast = useToast();

  const [stars, setStars] = useState<number>(5);
  const [speedRating, setSpeedRating] = useState<'Rất nhanh' | 'Đúng hạn' | 'Chậm'>('Rất nhanh');
  const [attitudeRating, setAttitudeRating] = useState<'Nhiệt tình' | 'Bình thường' | 'Không tốt'>('Nhiệt tình');
  const [effectivenessRating, setEffectivenessRating] = useState<'Triệt để' | 'Tạm ổn' | 'Chưa đạt'>('Triệt để');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars < 1) {
      toast.warning('Vui lòng chọn số sao đánh giá!');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackText = [
        `Tốc độ: ${speedRating}`,
        `Thái độ: ${attitudeRating}`,
        `Hiệu quả: ${effectivenessRating}`,
        comment.trim() ? `Nhận xét: ${comment.trim()}` : '',
      ].filter(Boolean).join(' • ');

      const res = await apiClient.evaluateTicket(ticket.id, {
        rating: stars,
        feedback: feedbackText,
      });

      if (res.success) {
        toast.success('Cảm ơn bạn đã gửi đánh giá!');
        if (onRated) onRated();
        onClose();
      } else {
        toast.error(res.message || 'Lỗi gửi đánh giá');
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
      title="Đánh giá chất lượng dịch vụ"
      subtitle={`Phiếu: ${ticket.code} — ${ticket.title}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 text-center">
          <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
            Mức độ hài lòng chung
          </label>
          <div className="py-2">
            <StarRating value={stars} onChange={setStars} size="xl" showLabel />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              1. Tốc độ xử lý
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Rất nhanh', 'Đúng hạn', 'Chậm'] as const).map((opt) => (
                <label key={opt} className="cursor-pointer">
                  <input
                    type="radio"
                    name="speedRating"
                    value={opt}
                    checked={speedRating === opt}
                    onChange={() => setSpeedRating(opt)}
                    className="sr-only peer"
                  />
                  <div className="py-2 px-3 text-center rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 cursor-pointer hover:bg-neutral-50">
                    {opt}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              2. Thái độ phục vụ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Nhiệt tình', 'Bình thường', 'Không tốt'] as const).map((opt) => (
                <label key={opt} className="cursor-pointer">
                  <input
                    type="radio"
                    name="attitudeRating"
                    value={opt}
                    checked={attitudeRating === opt}
                    onChange={() => setAttitudeRating(opt)}
                    className="sr-only peer"
                  />
                  <div className="py-2 px-3 text-center rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 cursor-pointer hover:bg-neutral-50">
                    {opt}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              3. Hiệu quả khắc phục
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Triệt để', 'Tạm ổn', 'Chưa đạt'] as const).map((opt) => (
                <label key={opt} className="cursor-pointer">
                  <input
                    type="radio"
                    name="effectivenessRating"
                    value={opt}
                    checked={effectivenessRating === opt}
                    onChange={() => setEffectivenessRating(opt)}
                    className="sr-only peer"
                  />
                  <div className="py-2 px-3 text-center rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 peer-checked:bg-purple-600 peer-checked:text-white peer-checked:border-purple-600 cursor-pointer hover:bg-neutral-50">
                    {opt}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Nhận xét thêm (Tùy chọn)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhận xét chi tiết..."
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>{isSubmitting ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};