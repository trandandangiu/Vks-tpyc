import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Ticket, TicketPriority, IncidentTemplate, Department } from '../../types';
import {
  Send,
  Upload,
  X,
  Building2,
  User,
  Phone,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Camera,
} from 'lucide-react';

interface TicketWanFormProps {
  onSuccess: (createdTicket?: Ticket) => void;
  departments?: Department[];
  selectedDeptId?: string;
  onSelectDepartment?: (deptId: string) => void;
}

export const TicketWanForm: React.FC<TicketWanFormProps> = ({
  onSuccess,
  departments: propDepartments,
  selectedDeptId: propSelectedDeptId,
  onSelectDepartment,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const isAdmin =
    user?.role === 'ADMIN' ||
    (user as any)?.isAdmin === true ||
    (user as any)?.roleName === 'Admin';
  const canSelectDepartment = isAdmin || user?.role === 'TECHNICAL';

  const [localDepartments, setLocalDepartments] = useState<Department[]>([]);
  const [localSelectedDeptId, setLocalSelectedDeptId] = useState<string>('');

  const departments = propDepartments || localDepartments;
  const selectedDeptId = propSelectedDeptId !== undefined ? propSelectedDeptId : localSelectedDeptId;

  const [incidentTemplates, setIncidentTemplates] = useState<IncidentTemplate[]>([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [selectedHint, setSelectedHint] = useState('');
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [isAddingPreset, setIsAddingPreset] = useState(false);

  const [creatorName, setCreatorName] = useState(user?.fullName || '');
  const [creatorPhone, setCreatorPhone] = useState(user?.phone || '');
  const [category, setCategory] = useState('Phần mềm Quản lý án');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('HIGH'); // mặc định Cao
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Nếu không truyền departments từ cha thì tự tải
  useEffect(() => {
    if (!canSelectDepartment || propDepartments) return;
    apiClient
      .getDepartments()
      .then((list) => {
        const sorted = [...list].sort((a, b) => {
          if (a.code === 'CNTT') return 1;
          if (b.code === 'CNTT') return -1;
          return a.code.localeCompare(b.code);
        });
        setLocalDepartments(sorted);
        if (sorted.length > 0 && !localSelectedDeptId) {
          setLocalSelectedDeptId(sorted[0].id);
        }
      })
      .catch(() => {});
  }, [canSelectDepartment, propDepartments]);

  // Tự động điền thông tin liên hệ của phòng ban khi chọn phòng ban
  useEffect(() => {
    if (!canSelectDepartment || !selectedDeptId || departments.length === 0) return;
    const dept = departments.find((d) => d.id === selectedDeptId);
    if (!dept) return;
    const deptCustomer =
      dept.users?.find((u) => u.role === 'CUSTOMER') || dept.users?.[0];
    if (deptCustomer) {
      setCreatorName(deptCustomer.fullName || dept.name);
      setCreatorPhone(deptCustomer.phone || '');
    } else {
      setCreatorName(dept.name);
      setCreatorPhone('');
    }
  }, [canSelectDepartment, selectedDeptId, departments]);

  const handleDeptChange = (deptId: string) => {
    if (onSelectDepartment) {
      onSelectDepartment(deptId);
    } else {
      setLocalSelectedDeptId(deptId);
    }
  };

  const loadWanPresets = async () => {
    try {
      const list = await apiClient.getIncidentTemplates({
        networkType: 'WAN',
        activeOnly: true,
      });
      setIncidentTemplates(Array.isArray(list) ? list : []);
    } catch {
      setIncidentTemplates([]);
    }
  };

  useEffect(() => {
    loadWanPresets();
  }, []);

  const handleSelectPreset = (item: IncidentTemplate) => {
    setTicketTitle(item.title);
    if (item.category) setCategory(item.category);
    if (item.defaultPriority === 'URGENT' || item.defaultPriority === 'HIGH') {
      setPriority(item.defaultPriority);
    }
    setSelectedHint(item.descriptionHint || '');
  };

  const handleQuickAddPreset = async () => {
    if (!newPresetTitle.trim()) {
      toast.warning('Vui lòng nhập tên sự cố WAN cần thêm');
      return;
    }
    try {
      const res = await apiClient.createIncidentTemplate({
        title: newPresetTitle.trim(),
        category: 'Khác',
        networkType: 'WAN',
        defaultPriority: priority,
        active: true,
      });
      if (res.success) {
        toast.success(`Đã thêm sự cố WAN "${newPresetTitle.trim()}" vào Danh mục sự cố`);
        setNewPresetTitle('');
        setIsAddingPreset(false);
        loadWanPresets();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm sự cố mẫu');
    }
  };

  const handleQuickDeletePreset = async (e: React.MouseEvent, item: IncidentTemplate) => {
    e.stopPropagation();
    if (!confirm(`Xóa vĩnh viễn sự cố "${item.title}" khỏi Danh mục sự cố?`)) return;
    try {
      const res = await apiClient.deleteIncidentTemplate(item.id);
      if (res.success) {
        toast.success('Đã xóa sự cố khỏi Danh mục sự cố');
        if (ticketTitle === item.title) setTicketTitle('');
        loadWanPresets();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa sự cố mẫu');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const processFiles = (files: File[]) => {
    const validFiles = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 4 - images.length);
    if (validFiles.length === 0) {
      toast.warning('Chỉ chấp nhận tệp hình ảnh (tối đa 4 ảnh)');
      return;
    }
    setImages((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrls((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (canSelectDepartment && !selectedDeptId) {
      toast.error('Vui lòng chọn phòng ban / đơn vị cần tạo phiếu!');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập mô tả sự cố!');
      return;
    }
    if (!canSelectDepartment && !creatorPhone.trim()) {
      toast.error('Vui lòng nhập SĐT liên hệ!');
      return;
    }

    setIsSubmitting(true);

    try {
      const resolvedTitle = ticketTitle.trim()
        ? `[QLAHS] ${ticketTitle.trim()}`
        : `[QLAHS] ${category}`;

      const res = await apiClient.createTicket({
        title: resolvedTitle,
        description: description.trim(),
        category,
        priority, // chỉ HIGH hoặc URGENT
        departmentId: canSelectDepartment ? selectedDeptId : user?.departmentId,
        creatorName: creatorName.trim() || user?.fullName || 'Khách hàng',
        creatorPhone: creatorPhone.trim(),
        supplies: [],
      });

      if (!res.success || !res.ticket) {
        toast.error(res.message || 'Lỗi gửi phiếu');
        return;
      }

      const newTicketId = res.ticket.id;

      for (const file of images) {
        try {
          await apiClient.uploadAttachment(newTicketId, file, 'BEFORE');
        } catch (uploadErr) {
          console.error('Lỗi upload ảnh:', uploadErr);
        }
      }

      if (canSelectDepartment) {
        toast.success(
          `Đã tạo phiếu [${res.ticket.code}] và chuyển thẳng về trang của "${res.ticket.departmentName}"!`
        );
      } else {
        toast.success(`Gửi phiếu [${res.ticket.code}] thành công!`);
      }
      setTicketTitle('');
      setDescription('');
      setImages([]);
      setPreviewUrls([]);
      onSuccess(res.ticket);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chỉ 2 mức ưu tiên cho WAN
  const wanPriorityOptions = [
    { id: 'HIGH' as TicketPriority, label: 'Cao', bg: 'peer-checked:bg-amber-500' },
    { id: 'URGENT' as TicketPriority, label: 'Khẩn cấp', bg: 'peer-checked:bg-[#B71C1C]' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B71C1C]" />
          Tạo phiếu yêu cầu hỗ trợ kỹ thuật nền tảng QLAHS
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          {canSelectDepartment
            ? 'Chọn phòng ban từ CSDL để tạo phiếu trực tiếp về trang của đơn vị đó (hỗ trợ đơn vị đánh giá KPI).'
            : 'Điền đầy đủ thông tin để Bộ phận "Công nghệ thông tin - Chuyển đổi số" tiếp nhận và xử lý nhanh chóng.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#B71C1C]" /> Phòng ban / Đơn vị{' '}
            {canSelectDepartment && <span className="text-red-500">*</span>}
          </label>
          {canSelectDepartment ? (
            <select
              required
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-neutral-900 text-sm font-bold cursor-pointer"
            >
              <option value="">-- Chọn phòng ban trong CSDL --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.code}] {d.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={user?.departmentName || user?.department?.name || 'Chưa gán đơn vị'}
              className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 text-sm font-medium cursor-not-allowed"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-neutral-500" /> Người yêu cầu / Đại diện phòng{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Nhập tên cán bộ hoặc tên phòng..."
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-neutral-800 text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-neutral-500" /> SĐT liên hệ{' '}
            {!canSelectDepartment && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            required={!canSelectDepartment}
            value={creatorPhone}
            onChange={(e) => setCreatorPhone(e.target.value)}
            placeholder={canSelectDepartment ? 'SĐT liên hệ (nếu có)' : 'Nhập SĐT liên hệ'}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm font-medium"
          />
        </div>
      </div>

      {/* ============ SỰ CỐ THƯỜNG GẶP QLAHS / WAN ============ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-neutral-700 uppercase flex items-center gap-1.5">
            Sự cố thường gặp trên hệ thống mạng Wan
            {isAdmin && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700 font-bold normal-case">
                Admin có thể thêm / xóa
              </span>
            )}
          </label>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddingPreset((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#B71C1C] text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingPreset ? 'Đóng' : 'Thêm sự cố mẫu'}</span>
            </button>
          )}
        </div>

        {isAdmin && isAddingPreset && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newPresetTitle}
              onChange={(e) => setNewPresetTitle(e.target.value)}
              placeholder="Nhập sự cố QLAHS / mạng WAN mới để User chọn nhanh..."
              className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-neutral-800 outline-none focus:border-[#B71C1C]"
            />
            <button
              type="button"
              onClick={handleQuickAddPreset}
              className="px-4 py-2 rounded-lg bg-[#B71C1C] hover:bg-[#8E1515] text-white text-xs font-bold cursor-pointer shrink-0"
            >
              Lưu vào danh sách
            </button>
          </div>
        )}

        {incidentTemplates.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 text-center">
            Chưa có sự cố thường gặp nào trong danh mục. Vui lòng nhập mô tả sự cố bên dưới{isAdmin ? ' hoặc bấm "Thêm sự cố mẫu"' : ''}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {incidentTemplates.map((item) => {
              const active = ticketTitle === item.title;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectPreset(item)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all cursor-pointer ${
                    active
                      ? 'border-[#B71C1C] bg-red-50/60 text-[#B71C1C] font-semibold shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#B71C1C]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#B71C1C]' : 'text-neutral-300'
                      }`}
                    />
                    <span className="leading-tight truncate">{item.title}</span>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickDeletePreset(e, item)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                      title="Xóa sự cố mẫu này khỏi Danh mục sự cố"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Mức độ <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {wanPriorityOptions.map((p) => (
            <label key={p.id} className="relative cursor-pointer">
              <input
                type="radio"
                name="priority"
                value={p.id}
                checked={priority === p.id}
                onChange={() => setPriority(p.id)}
                className="sr-only peer"
              />
              <div
                className={`text-center py-2 px-1 text-xs font-semibold rounded-xl border border-neutral-200 peer-checked:text-white peer-checked:border-transparent transition-all ${p.bg}`}
              >
                {p.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Mô tả sự cố <span className="text-red-500">*</span>
        </label>
        {selectedHint && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Gợi ý: {selectedHint}</span>
          </div>
        )}
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={selectedHint || 'Mô tả chi tiết lỗi trên phần mềm QLAHS hoặc đường truyền...'}
          className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Đính kèm hiện trạng 
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-colors ${
            isDragging
              ? 'border-[#B71C1C] bg-red-50/50'
              : 'border-neutral-300 hover:border-[#B71C1C]/50 bg-neutral-50/50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white text-xs font-bold shadow-xs cursor-pointer transition-all">
              <Camera className="w-4 h-4 text-[#FFD700]" />
              <span>Chụp ảnh</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-xs font-bold cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-[#B71C1C]" />
              <span>Chọn ảnh </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[11px] text-neutral-500">
           
          </p>
        </div>

        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {previewUrls.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100"
              >
                <img
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4 text-[#FFD700]" />
          <span>{isSubmitting ? 'ĐANG GỬI...' : 'GỬI PHIẾU WAN'}</span>
        </button>
      </div>
    </form>
  );
};
