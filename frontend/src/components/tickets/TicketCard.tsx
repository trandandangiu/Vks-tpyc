import React from 'react';
import { Ticket } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import { Calendar, User, Clock, Star, Eye, Tag, MessageSquare } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onViewDetail: (ticket: Ticket) => void;
  onRate?: (ticket: Ticket) => void;
  showRateButton?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onViewDetail,
  onRate,
  showRateButton = true,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
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

  const isDone = ticket.status === 'DONE';
  const hasRated = !!ticket.rating;

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 hover:border-neutral-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top bar: Code, Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200">
              {ticket.code}
            </span>
            <PriorityBadge priority={ticket.priority} size="sm" />
          </div>
          <StatusBadge status={ticket.status} size="sm" />
        </div>

        {/* Title & Category */}
        <div className="mb-2.5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium mb-1">
            <Tag className="w-3.5 h-3.5 text-[#B71C1C]" />
            <span>{ticket.category}</span>
          </div>
          <h3 className="font-bold text-neutral-900 text-base leading-snug line-clamp-2 hover:text-[#B71C1C] transition-colors">
            {ticket.title}
          </h3>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-neutral-600 line-clamp-2 mb-4 leading-relaxed">
          {ticket.description}
        </p>

        {/* Metadata info */}
        <div className="space-y-1.5 text-xs text-neutral-600 py-3 border-t border-neutral-100 mb-4 bg-neutral-50/50 rounded-xl px-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Người xử lý:
            </span>
            <span className="font-medium text-neutral-800">
              {ticket.assigneeName || 'Chưa phân công'}
            </span>
          </div>

          {ticket.scheduledAt && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hẹn xử lý:
              </span>
              <span className="font-medium text-blue-700">
                {formatDate(ticket.scheduledAt)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Ngày tạo:
            </span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>

          {hasRated && (
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
              <span className="text-neutral-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Đánh giá:
              </span>
              <span className="font-bold text-amber-600 flex items-center gap-0.5">
                {ticket.rating} / 5 ⭐
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onViewDetail(ticket)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem chi tiết</span>
        </button>

        {ticket.assigneeId && ticket.status !== 'CANCELLED' && (
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('open-ticket-chat', {
                  detail: { ticketId: ticket.id },
                })
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#003366] hover:bg-[#002244] text-white transition-all cursor-pointer"
            title={`Trò chuyện với Kỹ thuật viên ${ticket.assigneeName || ''}`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
            <span>Trò chuyện</span>
          </button>
        )}

        {showRateButton && isDone && (
          <button
            type="button"
            onClick={() => onRate && onRate(ticket)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              hasRated
                ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs hover:from-amber-600 hover:to-amber-700'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${hasRated ? 'fill-amber-500' : 'fill-white'}`} />
            <span>{hasRated ? 'Xem đánh giá' : 'Đánh giá ⭐'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
