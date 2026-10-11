import React, { useMemo } from 'react';
import { Ticket, STATUS_CONFIG } from '../../types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';

interface AdminOverviewProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onGoToDispatch: () => void;
  onGoToAllTickets: (statusFilter?: string) => void; // ✅ SỬA: nhận statusFilter
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  tickets,
  onViewTicket,
  onGoToDispatch,
  onGoToAllTickets,
}) => {
  const totalCount = tickets.length;
  const newCount = tickets.filter((t) => t.status === 'NEW').length;
  const processingCount = tickets.filter(
    (t) => t.status === 'PROCESSING' || t.status === 'ASSIGNED' || t.status === 'WAITING_SUPPLY'
  ).length;
  const doneCount = tickets.filter((t) => t.status === 'DONE').length;

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {
      NEW: 0,
      ASSIGNED: 0,
      PROCESSING: 0,
      WAITING_SUPPLY: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    tickets.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    const colors: Record<string, string> = {
      NEW: '#94a3b8',
      ASSIGNED: '#a855f7',
      PROCESSING: '#3b82f6',
      WAITING_SUPPLY: '#f59e0b',
      DONE: '#10b981',
      CANCELLED: '#f43f5e',
    };

    return Object.entries(counts).map(([statusKey, count]) => ({
      name: STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG]?.label || statusKey,
      value: count,
      color: colors[statusKey] || '#ccc',
    }));
  }, [tickets]);

  const last7DaysData = useMemo(() => {
    const days: Array<{ day: string; created: number; processing: number; done: number }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
      });
      const datePrefix = d.toISOString().slice(0, 10);

      const createdCount = tickets.filter((t) => t.createdAt.startsWith(datePrefix)).length;

      const processingCountOnDay = tickets.filter(
        (t) =>
          (t.status === 'PROCESSING' || t.status === 'ASSIGNED' || t.status === 'WAITING_SUPPLY') &&
          t.updatedAt &&
          t.updatedAt.startsWith(datePrefix)
      ).length;

      const doneCountOnDay = tickets.filter(
        (t) => t.status === 'DONE' && t.completedAt && t.completedAt.startsWith(datePrefix)
      ).length;

      days.push({
        day: dayStr,
        created: createdCount,
        processing: processingCountOnDay,
        done: doneCountOnDay,
      });
    }

    return days;
  }, [tickets]);

  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total — Click → ALL */}
        <div
          onClick={() => onGoToAllTickets('ALL')}
          className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-2xs relative overflow-hidden cursor-pointer hover:border-neutral-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Tổng số phiếu
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-neutral-900 tracking-tight">
              {totalCount}
            </span>
            <span className="text-xs text-neutral-400">phiếu yêu cầu</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            Toàn bộ các đơn vị trực thuộc
          </div>
        </div>

        {/* Chờ điều phối — Click → Dispatch */}
        <div
          onClick={onGoToDispatch}
          className="bg-white rounded-2xl p-5 border border-red-200/90 shadow-2xs relative overflow-hidden cursor-pointer hover:border-[#B71C1C] hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B71C1C] uppercase tracking-wider">
              Chờ điều phối
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#B71C1C] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#B71C1C] tracking-tight">
              {newCount}
            </span>
            <span className="text-xs text-red-600 font-semibold">cần xử lý ngay</span>
          </div>
          <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1 font-medium">
            <span>Bấm để phân công KTV</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Đang xử lý — Click → All Tickets filter PROCESSING */}
        <div
          onClick={() => onGoToAllTickets('PROCESSING')}
          className="bg-white rounded-2xl p-5 border border-blue-200/90 shadow-2xs relative overflow-hidden cursor-pointer hover:border-blue-600 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Đang xử lý
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-900 tracking-tight">
              {processingCount}
            </span>
            <span className="text-xs text-neutral-400">phiếu đang thực hiện</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
            <span>Bấm để xem chi tiết xử lý</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Hoàn thành — Click → All Tickets filter DONE */}
        <div
          onClick={() => onGoToAllTickets('DONE')}
          className="bg-white rounded-2xl p-5 border border-emerald-200/90 shadow-2xs relative overflow-hidden cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Hoàn thành
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-900 tracking-tight">
              {doneCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              ({totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
            <span>Bấm để xem danh sách hoàn thành</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ... phần 2 charts và recent tickets giữ nguyên ... */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-bold text-sm text-neutral-900">Cơ cấu trạng thái phiếu</h3>
            <p className="text-xs text-neutral-500">Phân bố theo quy trình 6 trạng thái xử lý</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} phiếu`, name]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs flex flex-col justify-between">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">
                Tiến độ xử lý 7 ngày gần nhất
              </h3>
              <p className="text-xs text-neutral-500">
                Cột chồng: Phiếu mới + Đang xử lý — Đường: Tỉ lệ hoàn thành
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                <span className="w-3 h-3 rounded bg-[#B71C1C]" /> Phiếu mới
              </span>
              <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                <span className="w-3 h-3 rounded bg-blue-500" /> Đang xử lý
              </span>
              <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Hoàn thành
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last7DaysData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />

                <Bar dataKey="created" name="Phiếu mới" fill="#B71C1C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="processing" name="Đang xử lý" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-neutral-900">5 Phiếu yêu cầu mới nhất</h3>
            <p className="text-xs text-neutral-500">Cập nhật nhanh tình hình sự cố gần đây nhất</p>
          </div>
          <button
            type="button"
            onClick={onGoToDispatch}
            className="text-xs text-[#B71C1C] hover:underline font-bold cursor-pointer"
          >
            Đến bảng điều phối →
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {recentTickets.map((t) => (
            <div
              key={t.id}
              onClick={() => onViewTicket(t)}
              className="py-3 px-2 hover:bg-neutral-50/80 rounded-xl transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-1 rounded-md">
                  {t.code}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 line-clamp-1 hover:text-[#B71C1C]">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {t.departmentName} • Người tạo: {t.creatorName} ({t.creatorPhone})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <PriorityBadge priority={t.priority} size="sm" />
                <StatusBadge status={t.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};