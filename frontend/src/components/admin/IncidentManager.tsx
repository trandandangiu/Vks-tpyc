import React, { useState, useEffect, useMemo } from 'react';
import {
  IncidentTemplate,
  IncidentNetworkType,
  TicketPriority,
  PRIORITY_LABELS,
} from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Wrench,
  Globe,
  Network,
  Layers,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface IncidentManagerProps {
  onUpdated?: () => void;
}

const NETWORK_BADGES: Record<
  IncidentNetworkType,
  { label: string; className: string; icon: React.ReactNode }
> = {
  LAN: {
    label: 'Mạng LAN (Internet)',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Network className="w-3.5 h-3.5" />,
  },
  WAN: {
    label: 'QLAHS (Mạng WAN)',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  ALL: {
    label: 'Dùng chung (LAN & WAN)',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
};

export const IncidentManager: React.FC<IncidentManagerProps> = ({ onUpdated }) => {
  const toast = useToast();

  const [templates, setTemplates] = useState<IncidentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState<'ALL_FILTER' | IncidentNetworkType>('ALL_FILTER');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IncidentTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields (đã bỏ ô Nhóm/Thiết bị theo yêu cầu)
  const [title, setTitle] = useState('');
  const [networkType, setNetworkType] = useState<IncidentNetworkType>('ALL');
  const [defaultPriority, setDefaultPriority] = useState<TicketPriority>('NORMAL');
  const [descriptionHint, setDescriptionHint] = useState('');
  const [active, setActive] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getIncidentTemplates();
      setTemplates(list);
    } catch (err: any) {
      toast.error(err.message || 'Không tải được danh mục sự cố');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      if (networkFilter !== 'ALL_FILTER' && item.networkType !== networkFilter && item.networkType !== 'ALL') {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.descriptionHint || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, networkFilter, search]);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setNetworkType('ALL');
    setDefaultPriority('NORMAL');
    setDescriptionHint('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: IncidentTemplate) => {
    setEditingItem(item);
    setTitle(item.title);
    setNetworkType(item.networkType || 'ALL');
    setDefaultPriority(item.defaultPriority || 'NORMAL');
    setDescriptionHint(item.descriptionHint || '');
    setActive(item.active !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên sự cố thường gặp');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await apiClient.updateIncidentTemplate(editingItem.id, {
          title: title.trim(),
          category: 'Khác',
          networkType,
          defaultPriority,
          descriptionHint: descriptionHint.trim(),
          active,
        });
        if (res.success) {
          toast.success('Đã cập nhật sự cố mẫu');
          setIsModalOpen(false);
          loadTemplates();
          onUpdated?.();
        }
      } else {
        const res = await apiClient.createIncidentTemplate({
          title: title.trim(),
          category: 'Khác',
          networkType,
          defaultPriority,
          descriptionHint: descriptionHint.trim(),
          active,
        });
        if (res.success) {
          toast.success('Đã thêm sự cố thường gặp mới');
          setIsModalOpen(false);
          loadTemplates();
          onUpdated?.();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu sự cố');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: IncidentTemplate) => {
    try {
      const res = await apiClient.updateIncidentTemplate(item.id, {
        active: !item.active,
      });
      if (res.success) {
        toast.success(
          !item.active
            ? `Đã bật hiển thị "${item.title}" ở trang Tạo phiếu`
            : `Đã ẩn "${item.title}" khỏi trang Tạo phiếu`
        );
        loadTemplates();
        onUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleDelete = async (item: IncidentTemplate) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn sự cố:\n"${item.title}"?`)) return;
    try {
      const res = await apiClient.deleteIncidentTemplate(item.id);
      if (res.success) {
        toast.success('Đã xóa vĩnh viễn sự cố khỏi CSDL');
        loadTemplates();
        onUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa sự cố');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#B71C1C] shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900">
              Danh mục Sự cố thường gặp
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Danh mục này liên kết trực tiếp 100% với mục "Sự cố thường gặp" trong chức năng Tạo phiếu mới (cả LAN và WAN).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm sự cố mới</span>
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL_FILTER', label: `Tất cả (${templates.length})` },
            {
              id: 'LAN',
              label: `Mạng LAN - Internet (${templates.filter((t) => t.networkType === 'LAN' || t.networkType === 'ALL').length})`,
            },
            {
              id: 'WAN',
              label: `QLAHS - Mạng WAN (${templates.filter((t) => t.networkType === 'WAN' || t.networkType === 'ALL').length})`,
            },
          ].map((tab) => {
            const isActive = networkFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNetworkFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#B71C1C] text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên sự cố, gợi ý..."
            className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-[#B71C1C] rounded-xl text-xs text-neutral-800 outline-none"
          />
        </div>
      </div>

      {/* Danh sách sự cố */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            Đang tải danh sách sự cố thường gặp...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-neutral-600">
              Chưa có sự cố nào trong danh mục.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-[#B71C1C] font-bold text-xs hover:bg-red-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm sự cố đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tên sự cố thường gặp</th>
                  <th className="py-3.5 px-4">Hiển thị ở biểu mẫu</th>
                  <th className="py-3.5 px-4">Mức ưu tiên mặc định</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredTemplates.map((item) => {
                  const netBadge = NETWORK_BADGES[item.networkType] || NETWORK_BADGES.ALL;
                  const prioBadge = PRIORITY_LABELS[item.defaultPriority] || PRIORITY_LABELS.NORMAL;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        !item.active ? 'opacity-60 bg-neutral-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{item.title}</div>
                        {item.descriptionHint && (
                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Gợi ý mô tả: {item.descriptionHint}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${netBadge.className}`}
                        >
                          {netBadge.icon}
                          {netBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${prioBadge.badgeClass}`}
                        >
                          {prioBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                            item.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                          }`}
                          title="Bấm để Bật / Tắt hiển thị ở chức năng Tạo phiếu"
                        >
                          {item.active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đang hiện
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Đang ẩn
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa sự cố"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-2 rounded-lg text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa sự cố"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm / Sửa sự cố (đã bỏ ô Nhóm/Thiết bị theo yêu cầu) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa sự cố thường gặp' : 'Thêm sự cố thường gặp mới'}
        subtitle="Sự cố này sẽ hiển thị trực tiếp ở mục Sự cố thường gặp khi tạo phiếu yêu cầu"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              Tên sự cố thường gặp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Máy in bị kẹt giấy / hết mực, Không ký số được văn bản..."
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-sm font-medium text-neutral-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              Hiển thị ở biểu mẫu nào?
            </label>
            <select
              value={networkType}
              onChange={(e) => setNetworkType(e.target.value as IncidentNetworkType)}
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-sm font-medium text-neutral-800 outline-none cursor-pointer"
            >
              <option value="ALL">Dùng chung cả 2 (Mạng LAN & QLAHS - WAN)</option>
              <option value="LAN">Chỉ biểu mẫu INTERNET (Mạng LAN)</option>
              <option value="WAN">Chỉ biểu mẫu QLAHS (Mạng WAN)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              Mức độ ưu tiên tự động gán khi User chọn
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as TicketPriority[]).map((p) => {
                const activePrio = defaultPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDefaultPriority(p)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activePrio
                        ? 'bg-[#B71C1C] text-white border-[#B71C1C]'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {PRIORITY_LABELS[p].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              Gợi ý mô tả chi tiết (Tùy chọn)
            </label>
            <textarea
              rows={2}
              value={descriptionHint}
              onChange={(e) => setDescriptionHint(e.target.value)}
              placeholder="VD: Ghi rõ tên máy in (Canon 2900/HP...) và số phòng để kỹ thuật mang theo hộp mực phù hợp..."
              className="w-full px-3.5 py-2 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-sm text-neutral-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 accent-[#B71C1C] rounded"
              />
              <span className="text-xs font-semibold text-neutral-700">
                Hiển thị ngay cho User chọn khi tạo phiếu
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm sự cố'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
