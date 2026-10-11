import React, { useState } from 'react';
import { AuditLog, AuditLogLevel } from '../../types';
import { ShieldAlert, Search, Filter } from 'lucide-react';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchLevel = levelFilter === 'ALL' || log.level === levelFilter;

    return matchSearch && matchLevel;
  });

  const getLevelBadge = (level: AuditLogLevel) => {
    switch (level) {
      case 'INFO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            INFO
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            WARNING
          </span>
        );
      case 'SECURITY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            SECURITY
          </span>
        );
      case 'DANGER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            DANGER
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#B71C1C]" />
            Nhật ký hệ thống
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Lưu vết tự động tất cả các thao tác nghiệp vụ, điều phối, thay đổi trạng thái và an ninh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm hành động, người dùng..."
              className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-[#B71C1C] focus:outline-none w-52"
            />
          </div>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-neutral-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="INFO">INFO (Xanh)</option>
            <option value="WARNING">WARNING (Vàng)</option>
            <option value="SECURITY">SECURITY (Tím)</option>
            <option value="DANGER">DANGER (Đỏ)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Thời gian</th>
                <th className="py-3 px-4 w-48">Người thực hiện</th>
                <th className="py-3 px-4">Hành động ghi nhận</th>
                <th className="py-3 px-4 w-44">Đối tượng (Entity)</th>
                <th className="py-3 px-4 w-32 font-mono">Địa chỉ IP</th>
                <th className="py-3 px-4 w-24 text-center">Mức độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Không tìm thấy bản ghi nhật ký phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.userName}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType} {log.entityId && `(${log.entityId})`}</td>
                    <td>{log.ipAddress}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getLevelBadge(log.level)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
