import React, { useMemo } from 'react';
import { Ticket, INCIDENT_CATEGORIES } from '../../types';
import { Modal } from '../common/Modal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Award, CheckCircle2, Clock, Star, Inbox } from 'lucide-react';

interface TechnicalKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  technicianName?: string;
  technicianId?: string;
}

const PIE_COLORS = ['#B71C1C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export const TechnicalKpiModal: React.FC<TechnicalKpiModalProps> = ({
  isOpen,
  onClose,
  tickets,
  technicianName = 'Kỹ thuật viên',
  technicianId,
}) => {
  // Filter tickets assigned to this technician (or all if not strictly filtered)
  const myTickets = useMemo(() => {
    if (!technicianId) return tickets;
    return tickets.filter((t) => t.assigneeId === technicianId);
  }, [tickets, technicianId]);

  // 1. KPI Stats
  const totalAssigned = myTickets.length;
  const totalDone = myTickets.filter((t) => t.status === 'DONE').length;

  // Average rating
  const ratedTickets = myTickets.filter((t) => t.rating && t.rating > 0);
  const avgRating =
    ratedTickets.length > 0
      ? (
          ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length
        ).toFixed(1)
      : '5.0';

  // Average completion time (computed from completedAt and dispatchedAt/createdAt)
  const avgHours = useMemo(() => {
    const doneWithTime = myTickets.filter((t) => t.status === 'DONE' && t.completedAt);
    if (doneWithTime.length === 0) return '---';
    const totalMs = doneWithTime.reduce((sum, t) => {
      const start = new Date(t.dispatchedAt || t.createdAt).getTime();
      const end = new Date(t.completedAt!).getTime();
      const diff = Math.max(0, end - start);
      return sum + diff;
    }, 0);
    const hours = totalMs / doneWithTime.length / (1000 * 60 * 60);
    return `${Math.max(0.1, Math.round(hours * 10) / 10)} giờ`;
  }, [myTickets]);

  // 2. BarChart 7 days
  const last7DaysData = useMemo(() => {
    const days: Array<{ day: string; done: number }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
      const datePrefix = d.toISOString().slice(0, 10);

      const doneCount = myTickets.filter(
        (t) => t.status === 'DONE' && t.completedAt && t.completedAt.startsWith(datePrefix)
      ).length;

      days.push({
        day: dayStr,
        done: doneCount,
      });
    }

    return days;
  }, [myTickets]);

  // 3. PieChart: Loại sự cố
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    myTickets.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [myTickets]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo cáo Hiệu suất & Chỉ số KPI Kỹ thuật"
      subtitle={`Thống kê kết quả công việc của đồng chí: ${technicianName}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Nhận */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
              <Inbox className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-blue-900">{totalAssigned}</div>
            <div className="text-[11px] font-semibold text-blue-700 uppercase mt-0.5">
              Phiếu tiếp nhận
            </div>
          </div>

          {/* 2. Hoàn thành */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-900">{totalDone}</div>
            <div className="text-[11px] font-semibold text-emerald-700 uppercase mt-0.5">
              Đã hoàn thành
            </div>
          </div>

          {/* 3. TG Trung bình */}
          <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-center">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-purple-900">{avgHours}</div>
            <div className="text-[11px] font-semibold text-purple-700 uppercase mt-0.5">
              Thời gian xử lý TB
            </div>
          </div>

          {/* 4. Đánh giá TB */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-900">{avgRating} / 5.0</div>
            <div className="text-[11px] font-semibold text-amber-700 uppercase mt-0.5">
              Đánh giá hài lòng
            </div>
          </div>
        </div>

        {/* Charts: BarChart 7 ngày + PieChart Loại sự cố */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BarChart */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
              Số phiếu hoàn thành theo ngày
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="done" name="Phiếu xong" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PieChart: Loại sự cố */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
              Phân loại theo loại sự cố
            </h4>
            <div className="h-48 w-full">
              {categoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  Chưa có dữ liệu loại sự cố
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} phiếu`, name]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
          >
            Đóng bảng KPI
          </button>
        </div>
      </div>
    </Modal>
  );
};
