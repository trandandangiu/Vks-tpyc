// src/components/tickets/TicketList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Ticket, STATUS_CONFIG } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import {
  Search,
  Filter,
  ChevronDown,
  FileText,
  Calendar,
  User as UserIcon,
  Building2,
  ArrowUpDown,
  X,
  Edit2,
  Trash2,
  Printer,
} from 'lucide-react';
import { TicketPrintModal } from './TicketPrintModal';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  title?: string;
  showFilters?: boolean;
  initialStatusFilter?: string;
  onFilterChange?: () => void;
  onEdit?: (ticket: Ticket) => void;      // ✅ THÊM
  onDelete?: (ticket: Ticket) => void;    // ✅ THÊM
  canManage?: boolean;                    // ✅ THÊM — chỉ ADMIN mới thấy nút
}

type SortField = 'code' | 'title' | 'priority' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PROCESSING_GROUP = ['PROCESSING', 'ASSIGNED', 'WAITING_SUPPLY'];

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  title = 'Danh sách phiếu yêu cầu',
  showFilters = true,
  initialStatusFilter = 'ALL',
  onFilterChange,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [printingTicket, setPrintingTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setPage(1);
  }, [initialStatusFilter]);

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.code || '').toLowerCase().includes(q) ||
          (t.title || '').toLowerCase().includes(q) ||
          (t.departmentName || '').toLowerCase().includes(q) ||
          (t.creatorName || '').toLowerCase().includes(q) ||
          (t.creatorPhone || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'PROCESSING') {
      result = result.filter((t) => PROCESSING_GROUP.includes(t.status));
    } else if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tickets, searchQuery, statusFilter, priorityFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setPage(1);
    onFilterChange?.();
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  const formatDate = (val?: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const getFilterLabel = () => {
    if (statusFilter === 'PROCESSING') return 'Đang xử lý';
    if (statusFilter === 'ALL') return null;
    return STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label || statusFilter;
  };

  const currentFilterLabel = getFilterLabel();

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl px-4 sm:px-5 py-3 sm:py-4 border border-neutral-200 shadow-2xs">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 truncate">
            {title}
          </h1>
          <span className="shrink-0 text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
            {filteredTickets.length}
          </span>
          {currentFilterLabel && (
            <span className="shrink-0 text-xs font-bold text-white bg-[#B71C1C] px-2.5 py-0.5 rounded-full">
              {currentFilterLabel}
            </span>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-3.5 border border-neutral-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, tiêu đề, đơn vị, người tạo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B71C1C]/20 focus:border-[#B71C1C] bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-8 py-2 text-xs font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B71C1C]/20 focus:border-[#B71C1C] bg-white cursor-pointer appearance-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="DONE">Hoàn thành</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-8 py-2 text-xs font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B71C1C]/20 focus:border-[#B71C1C] bg-white cursor-pointer appearance-none"
              >
                <option value="ALL">Tất cả ưu tiên</option>
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  onClick={() => handleSort('code')}
                  className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Mã phiếu
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none"
                >
                  <div className="flex items-center gap-1">
                    Tiêu đề
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap">
                  Đơn vị / Người tạo
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Ưu tiên
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Trạng thái
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Ngày tạo
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {/* ✅ CỘT THAO TÁC — chỉ hiện khi canManage */}
                {canManage && (
                  <th className="px-3 py-3 text-[11px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap text-center w-24">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-16 text-center">
                    <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-400 font-medium">
                      {hasActiveFilters
                        ? 'Không tìm thấy phiếu phù hợp với bộ lọc'
                        : 'Chưa có phiếu yêu cầu nào'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                    title="Bấm để xem chi tiết"
                  >
                    <td className="px-3 py-3 align-middle">
                      <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-1 rounded-md border border-neutral-200 whitespace-nowrap">
                        {t.code}
                      </span>
                    </td>

                    <td className="px-3 py-3 align-middle min-w-[280px]">
                      <div className="font-semibold text-xs text-neutral-900 line-clamp-2">
                        {t.title}
                      </div>
                      {t.category && (
                        <div className="text-[10px] text-[#B71C1C] font-bold mt-0.5">
                          {t.category}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                        <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[160px]">
                          {t.departmentName || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                        <UserIcon className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[160px]">
                          {t.creatorName}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <PriorityBadge priority={t.priority} size="sm" />
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <StatusBadge status={t.status} size="sm" />
                    </td>

                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                        {formatDate(t.createdAt)}
                      </div>
                    </td>

                    {/* ✅ CỘT THAO TÁC — stopPropagation để không mở modal chi tiết */}
                    {canManage && (
                      <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setPrintingTicket(t)}
                            className="p-1.5 rounded-lg text-[#B71C1C] hover:bg-red-50 transition-colors cursor-pointer"
                            title="In phiếu kiểm tra"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit?.(t)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Sửa phiếu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete?.(t)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa phiếu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredTickets.length > 0 && (
          <div className="border-t border-neutral-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/50">
            <div className="text-xs text-neutral-600">
              Hiển thị{' '}
              <span className="font-bold">
                {(page - 1) * pageSize + 1}
              </span>{' '}
              -{' '}
              <span className="font-bold">
                {Math.min(page * pageSize, filteredTickets.length)}
              </span>{' '}
              trên{' '}
              <span className="font-bold">{filteredTickets.length}</span> phiếu
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs font-semibold border border-neutral-300 rounded-md bg-white cursor-pointer"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-xs font-bold rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ←
              </button>

              <span className="text-xs font-bold text-neutral-700 px-2">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 text-xs font-bold rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      <TicketPrintModal
        isOpen={!!printingTicket}
        onClose={() => setPrintingTicket(null)}
        ticket={printingTicket}
      />
    </div>
  );
};

export default TicketList;