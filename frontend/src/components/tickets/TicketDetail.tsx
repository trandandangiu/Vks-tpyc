import React, { useState } from 'react';
import { Ticket } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import { StarRating } from './StarRating';
import { TicketPrintModal } from './TicketPrintModal';
import {
  User,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Wrench,
  Package,
  FileText,
  Star,
  ExternalLink,
  X,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface TicketDetailProps {
  ticket: Ticket;
  onClose?: () => void;
  onRate?: () => void;
  canRate?: boolean;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  onClose,
  onRate,
  canRate = false,
}) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

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

  const noteText = ticket.processNote || ticket.technicalNotes || '';
  const beforeImgs = ticket.beforeImages || [];
  const afterImgs = ticket.afterImages || [];

  // Parse feedback (hỗ trợ cả string từ Backend lẫn object RatingFeedback)
  const parsedFeedback = (() => {
    if (!ticket.rating && !ticket.feedback) return null;
    if (typeof ticket.feedback === 'object' && ticket.feedback !== null) {
      return {
        stars: ticket.feedback.stars || ticket.rating || 5,
        speedRating: ticket.feedback.speedRating,
        attitudeRating: ticket.feedback.attitudeRating,
        effectivenessRating: ticket.feedback.effectivenessRating,
        comment: ticket.feedback.comment,
        submittedAt: ticket.feedback.submittedAt || ticket.ratedAt,
      };
    }
    const raw = typeof ticket.feedback === 'string' ? ticket.feedback : '';
    const parts = raw.split('•').map((s) => s.trim()).filter(Boolean);
    let speedRating: string | undefined;
    let attitudeRating: string | undefined;
    let effectivenessRating: string | undefined;
    const comments: string[] = [];

    for (const p of parts) {
      if (p.startsWith('Tốc độ:')) speedRating = p.replace('Tốc độ:', '').trim();
      else if (p.startsWith('Thái độ:')) attitudeRating = p.replace('Thái độ:', '').trim();
      else if (p.startsWith('Hiệu quả:')) effectivenessRating = p.replace('Hiệu quả:', '').trim();
      else if (p.startsWith('Nhận xét:')) comments.push(p.replace('Nhận xét:', '').trim());
      else comments.push(p);
    }

    return {
      stars: ticket.rating || 5,
      speedRating,
      attitudeRating,
      effectivenessRating,
      comment: comments.join(' • ') || undefined,
      submittedAt: ticket.ratedAt,
    };
  })();

  return (
    <div className="space-y-6">
      {/* Lightbox for Images */}
      {activeImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeImage}
              alt="Phóng to ảnh"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-300 p-2 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-5 h-5" /> Đóng
            </button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono font-bold text-sm bg-neutral-100 text-neutral-800 px-3 py-1 rounded-lg border border-neutral-200">
              {ticket.code}
            </span>
            <StatusBadge status={ticket.status} size="md" />
            <PriorityBadge priority={ticket.priority} size="md" />
            <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-[#B71C1C] border border-red-100 font-medium">
              {ticket.category}
            </span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mt-2">{ticket.title}</h2>
        </div>

        <button
          type="button"
          onClick={() => setIsPrintOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#B71C1C] border border-red-200 font-bold text-xs transition-colors cursor-pointer shrink-0 self-start"
        >
          <Printer className="w-4 h-4" />
          <span>In phiếu kiểm tra</span>
        </button>
      </div>

      {/* Grid: Creator Info & Technical Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Creator Info Box */}
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#B71C1C]" /> Thông tin người yêu cầu
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs">Họ và tên:</span>
              <span className="font-semibold text-neutral-800">{ticket.creatorName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Đơn vị / Phòng:
              </span>
              <span className="text-neutral-700 font-medium text-right max-w-[200px] truncate">
                {ticket.departmentName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" /> Điện thoại liên hệ:
              </span>
              <a
                href={`tel:${ticket.creatorPhone}`}
                className="text-blue-600 hover:underline font-semibold"
              >
                {ticket.creatorPhone}
              </a>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60">
              <span className="text-neutral-500 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Thời gian gửi:
              </span>
              <span className="text-neutral-600 text-xs">{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Dispatch & Technical Info Box */}
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-blue-600" /> Tiến độ điều phối & Kỹ thuật
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs">Kỹ thuật viên phụ trách:</span>
              <span className="font-semibold text-blue-800">
                {ticket.assigneeName || 'Chưa phân công'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> Hẹn thời gian xử lý:
              </span>
              <span className="font-medium text-neutral-800">
                {ticket.scheduledAt ? formatDate(ticket.scheduledAt) : 'Chưa xếp lịch'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn thành lúc:
              </span>
              <span className="text-neutral-700 font-medium">
                {ticket.completedAt ? formatDate(ticket.completedAt) : 'Chưa hoàn thành'}
              </span>
            </div>
            {ticket.updatedAt && (
              <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60">
                <span className="text-neutral-500 text-xs">Cập nhật gần nhất:</span>
                <span className="text-neutral-600 text-xs">{formatDate(ticket.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#B71C1C]" /> Nội dung sự cố chi tiết
        </h4>
        <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
          {ticket.description}
        </p>
      </div>

      {/* Technical notes & Supplies */}
      {(noteText || (ticket.supplies && ticket.supplies.length > 0)) && (
        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 space-y-3">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-700" /> Báo cáo kỹ thuật viên
          </h4>
          {noteText && (
            <div>
              <span className="text-xs font-semibold text-amber-800 block mb-1">Ghi chú xử lý:</span>
              <p className="text-sm text-neutral-800 bg-white p-3 rounded-xl border border-amber-200 leading-relaxed whitespace-pre-wrap">
                {noteText}
              </p>
            </div>
          )}

          {ticket.supplies && ticket.supplies.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1.5">
                <Package className="w-3.5 h-3.5" /> Vật tư / Linh kiện sử dụng:
              </span>
              <div className="flex flex-wrap gap-2">
                {ticket.supplies.map((sup, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-800 border border-amber-200 shadow-2xs"
                  >
                    <span>{sup.name}</span>
                    <span className="font-bold text-[#B71C1C]">
                      x{sup.quantity} {sup.unit}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images Section (Before & After) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Before images */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Ảnh hiện trạng trước xử lý ({beforeImgs.length})
          </h4>
          {beforeImgs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {beforeImgs.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100"
                >
                  <img
                    src={img}
                    alt={`Ảnh trước ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Không có hình ảnh đính kèm trước xử lý</p>
          )}
        </div>

        {/* After images */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Ảnh nghiệm thu sau xử lý ({afterImgs.length})
          </h4>
          {afterImgs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {afterImgs.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-neutral-200 cursor-pointer bg-neutral-100"
                >
                  <img
                    src={img}
                    alt={`Ảnh sau ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Chưa có hình ảnh nghiệm thu sau xử lý</p>
          )}
        </div>
      </div>

      {/* Customer Feedback / Rating Section */}
      {parsedFeedback ? (
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Đánh giá từ đơn vị
            </h4>
            <span className="text-xs text-emerald-700">
              {formatDate(parsedFeedback.submittedAt)}
            </span>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100">
            <StarRating value={parsedFeedback.stars} readOnly size="lg" />
            <span className="font-bold text-neutral-800 text-sm">
              {parsedFeedback.stars} / 5 Sao
            </span>
          </div>

          {(parsedFeedback.speedRating || parsedFeedback.attitudeRating || parsedFeedback.effectivenessRating) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-neutral-500 block">Tốc độ xử lý:</span>
                <span className="font-bold text-emerald-800">
                  {parsedFeedback.speedRating || '---'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-neutral-500 block">Thái độ phục vụ:</span>
                <span className="font-bold text-emerald-800">
                  {parsedFeedback.attitudeRating || '---'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-neutral-500 block">Hiệu quả công việc:</span>
                <span className="font-bold text-emerald-800">
                  {parsedFeedback.effectivenessRating || '---'}
                </span>
              </div>
            </div>
          )}

          {parsedFeedback.comment && (
            <div className="bg-white p-3 rounded-xl border border-emerald-100 text-sm text-neutral-800 italic">
              "{parsedFeedback.comment}"
            </div>
          )}
        </div>
      ) : canRate && ticket.status === 'DONE' ? (
        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-amber-900">Phiếu đã hoàn thành xử lý!</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Vui lòng để lại đánh giá chất lượng dịch vụ để bộ phận kỹ thuật hoàn thiện hơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onRate}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Star className="w-4 h-4 fill-white" /> Đánh giá ngay ⭐
          </button>
        </div>
      ) : null}

      {/* Footer Close & Print */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setIsPrintOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-[#B71C1C] border border-[#B71C1C]/40 font-bold text-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>In phiếu kiểm tra</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          Đóng cửa sổ
        </button>
      </div>

      <TicketPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        ticket={ticket}
      />
    </div>
  );
};
