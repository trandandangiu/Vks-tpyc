import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Check,
  Printer,
  Monitor,
  Network,
  RefreshCw,
  X,
  Save,
} from 'lucide-react';
import { DeviceIpRecord } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';

const CATEGORY_OPTIONS = [
  'Máy QLAHS',
  'Máy in Internet',
  'Máy tính QLAHS',
  'Máy in QLAHS',
  'Máy tính Internet',
];

export const DeviceIpManager: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<DeviceIpRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DeviceIpRecord | null>(null);
  const [unitAndDevice, setUnitAndDevice] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('Máy QLAHS');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDeviceIps();
      setRecords(data);
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải dữ liệu Máy & Mã IP', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (categoryFilter !== 'ALL' && r.deviceCategory !== categoryFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.unitAndDevice.toLowerCase().includes(q) ||
          r.ipAddress.toLowerCase().includes(q) ||
          r.deviceCategory.toLowerCase().includes(q) ||
          (r.note || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, categoryFilter, searchTerm]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setUnitAndDevice('');
    setIpAddress('');
    setDeviceCategory('Máy QLAHS');
    setNote('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: DeviceIpRecord) => {
    setEditingRecord(rec);
    setUnitAndDevice(rec.unitAndDevice);
    setIpAddress(rec.ipAddress);
    setDeviceCategory(rec.deviceCategory || 'Máy QLAHS');
    setNote(rec.note || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitAndDevice.trim()) {
      showToast('Vui lòng nhập tên Máy in / Máy tính đơn vị', 'error');
      return;
    }
    if (!ipAddress.trim()) {
      showToast('Vui lòng nhập Mã IP', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingRecord) {
        await apiClient.updateDeviceIp(editingRecord.id, {
          unitAndDevice: unitAndDevice.trim(),
          ipAddress: ipAddress.trim(),
          deviceCategory: deviceCategory.trim() || 'Máy QLAHS',
          note: note.trim() || undefined,
        });
        showToast('Đã cập nhật thông tin Máy & Mã IP', 'success');
      } else {
        await apiClient.createDeviceIp({
          unitAndDevice: unitAndDevice.trim(),
          ipAddress: ipAddress.trim(),
          deviceCategory: deviceCategory.trim() || 'Máy QLAHS',
          note: note.trim() || undefined,
        });
        showToast('Đã thêm mới dữ liệu Máy & Mã IP', 'success');
      }
      setIsModalOpen(false);
      await loadRecords();
    } catch (err: any) {
      showToast(err?.message || 'Lỗi lưu dữ liệu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rec: DeviceIpRecord) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn "${rec.unitAndDevice} — IP: ${rec.ipAddress}" khỏi Cơ sở dữ liệu?`
      )
    ) {
      return;
    }
    try {
      await apiClient.deleteDeviceIp(rec.id);
      showToast('Đã xóa cứng dữ liệu khỏi CSDL', 'info');
      await loadRecords();
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa dữ liệu', 'error');
    }
  };

  const handleCopyIp = (id: string, ip: string) => {
    navigator.clipboard?.writeText(ip);
    setCopiedId(id);
    showToast(`Đã sao chép IP: ${ip}`, 'info');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getCategoryStyle = (category: string) => {
    if (category.toLowerCase().includes('qlahs')) {
      return 'bg-red-50 text-[#B71C1C] border-red-200';
    }
    if (category.toLowerCase().includes('in')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#B71C1C] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Network className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Dữ liệu Máy in / Máy tính Đơn vị & Mã IP
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tra cứu và quản lý danh sách Máy in / Máy tính đơn vị — Mã IP — Máy QLAHS / Máy in Internet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD700]" />
              Thêm Thiết bị & IP
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhanh theo tên phòng/đơn vị, máy in, máy tính hoặc mã IP (VD: 10.10...)"
              className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'Máy QLAHS', 'Máy in Internet'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#B71C1C] text-white border-[#B71C1C]'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-red-50 hover:text-[#B71C1C]'
                }`}
              >
                {cat === 'ALL' ? `Tất cả (${records.length})` : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table / Cards */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        {loading && records.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            Đang tải dữ liệu thiết bị & mã IP...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Server className="w-10 h-10 text-neutral-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-neutral-700">
              Chưa có dữ liệu Máy in / Máy tính & Mã IP phù hợp
            </p>
            <p className="text-xs text-neutral-400 mt-1 mb-4">
              Bấm nút &ldquo;Thêm Thiết bị &amp; IP&rdquo; để lưu thông tin tra cứu nhanh cho Kỹ thuật viên
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD700]" />
              Thêm bản ghi đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Máy in / Máy tính đơn vị</th>
                  <th className="py-3 px-4">Mã IP</th>
                  <th className="py-3 px-4">Máy QLAHS / Máy in Internet</th>
                  <th className="py-3 px-4">Ghi chú</th>
                  <th className="py-3 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredRecords.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#B71C1C] flex items-center justify-center shrink-0">
                          {item.unitAndDevice.toLowerCase().includes('in') ||
                          item.deviceCategory.toLowerCase().includes('in') ? (
                            <Printer className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{item.unitAndDevice}</p>
                          {item.updatedBy && (
                            <p className="text-[11px] text-neutral-400">
                              Cập nhật bởi: {item.updatedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-[#B71C1C] font-mono text-xs font-extrabold">
                        <span>Mã IP: {item.ipAddress}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyIp(item.id, item.ipAddress)}
                          className="ml-1 p-0.5 rounded hover:bg-red-100 text-[#B71C1C] transition-colors cursor-pointer"
                          title="Sao chép mã IP"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getCategoryStyle(
                          item.deviceCategory
                        )}`}
                      >
                        {item.deviceCategory}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-neutral-600 max-w-xs truncate">
                      {item.note || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-[#B71C1C] hover:bg-red-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Xóa cứng khỏi CSDL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#B71C1C] to-[#8B0000] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Network className="w-5 h-5 text-[#FFD700]" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingRecord
                    ? 'Chỉnh sửa Máy in / Máy tính & Mã IP'
                    : 'Thêm dữ liệu Máy in / Máy tính & Mã IP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-red-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  1. Máy in / Máy tính đơn vị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={unitAndDevice}
                  onChange={(e) => setUnitAndDevice(e.target.value)}
                  placeholder="VD: Phòng 1 - Máy in Canon 2900 / Máy tính Đ/c Nam (Phòng 7)..."
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Mã IP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="VD: 192.168.1.150"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    2. Máy QLAHS / Máy in Internet <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deviceCategory}
                    onChange={(e) => setDeviceCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C]"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Ghi chú thêm (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Cổng Switch số 8, chia sẻ máy in qua LAN..."
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C]"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-[#FFD700]" />
                  {submitting ? 'Đang lưu...' : editingRecord ? 'Lưu cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
