import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, SupplyItem } from '../../types';
import { Clock, Wrench, Package, Plus, Trash2, Upload, X, Check, Save } from 'lucide-react';
import { useToast } from '../common/Toast';
import { apiClient } from '@/src/services/apiClient';

interface TicketProcessFormProps {
  ticket: Ticket;
  onSave: (data: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
  }) => void;
  onComplete: (data: {
    status: TicketStatus;
    scheduledAt?: string;
    technicalNotes?: string;
    supplies: SupplyItem[];
    afterImages: string[];
    completedAt: string;
  }) => void;
}

const COMMON_SUPPLIES = [
  { name: 'Switch 8-port Gigabit', defaultUnit: 'cái' },
  { name: 'Cáp mạng Cat6', defaultUnit: 'mét' },
  { name: 'Hạt mạng RJ45', defaultUnit: 'hạt' },
  { name: 'SSD 512GB NVMe', defaultUnit: 'ổ' },
  { name: 'RAM 8GB DDR4', defaultUnit: 'thanh' },
  { name: 'Cao su kéo giấy máy scan', defaultUnit: 'bộ' },
];

export const TicketProcessForm: React.FC<TicketProcessFormProps> = ({
  ticket,
  onSave,
  onComplete,
}) => {
  const toast = useToast();

  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    if (!ticket.scheduledAt) return '';
    try {
      const d = new Date(ticket.scheduledAt);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  });
  const [technicalNotes, setTechnicalNotes] = useState<string>(ticket.technicalNotes || '');
  const [supplies, setSupplies] = useState<SupplyItem[]>(ticket.supplies || []);
  const [afterImages, setAfterImages] = useState<string[]>(ticket.afterImages || []);
  const [customSupplyName, setCustomSupplyName] = useState('');
  const [customSupplyUnit, setCustomSupplyUnit] = useState('cái');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync state if ticket changes
  useEffect(() => {
    setStatus(ticket.status);
    if (ticket.scheduledAt) {
      try {
        const d = new Date(ticket.scheduledAt);
        setScheduledAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } catch {
        setScheduledAt('');
      }
    } else {
      setScheduledAt('');
    }
    setTechnicalNotes(ticket.technicalNotes || '');
    setSupplies(ticket.supplies || []);
    setAfterImages(ticket.afterImages || []);
  }, [ticket.id]);

  // Toggle common supply item
  const handleToggleCommonSupply = (name: string, unit: string) => {
    const existing = supplies.find((s) => s.name === name);
    if (existing) {
      setSupplies((prev) => prev.filter((s) => s.name !== name));
    } else {
      setSupplies((prev) => [...prev, { name, quantity: 1, unit }]);
    }
  };

  const handleUpdateSupplyQty = (name: string, qty: number) => {
    if (qty <= 0) {
      setSupplies((prev) => prev.filter((s) => s.name !== name));
      return;
    }
    setSupplies((prev) =>
      prev.map((s) => (s.name === name ? { ...s, quantity: qty } : s))
    );
  };

  const handleAddCustomSupply = () => {
    if (!customSupplyName.trim()) return;
    setSupplies((prev) => [
      ...prev,
      { name: customSupplyName.trim(), quantity: 1, unit: customSupplyUnit || 'cái' },
    ]);
    setCustomSupplyName('');
    setIsAddingCustom(false);
  };

  // After image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processAfterFiles(Array.from(e.target.files));
  };

  const processAfterFiles = async (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/')).slice(0, 4 - afterImages.length);
    if (valid.length === 0) {
      toast.warning('Chỉ chấp nhận tệp hình ảnh');
      return;
    }

    for (const file of valid) {
      try {
        // ✅ Upload lên BE
        await apiClient.uploadAttachment(ticket.id, file, 'AFTER');
      } catch (err) {
        console.error('Lỗi upload AFTER:', err);
        toast.error(`Lỗi upload ảnh ${file.name}`);
      }
    }
    // Reload lại attachments
    onSave({ /* ... */ });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processAfterFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeAfterImage = (index: number) => {
    setAfterImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveClick = () => {
    onSave({
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      technicalNotes,
      supplies,
      afterImages,
    });
  };

  const handleCompleteClick = () => {
    onComplete({
      status: 'DONE',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      technicalNotes,
      supplies,
      afterImages,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-6">
      <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600" />
          Tiến trình xử lý kỹ thuật
        </h3>
        <span className="text-xs text-neutral-400">Cập nhật bởi Kỹ thuật viên</span>
      </div>

      {/* Row 1: Scheduled Time & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Scheduled time */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" /> Hẹn giờ xử lý
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm font-medium text-neutral-800"
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Trạng thái phiếu
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            className="w-full px-3 py-2 bg-white border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm font-semibold text-neutral-800 cursor-pointer"
          >
            <option value="ASSIGNED">Đã phân công (Chờ nhận)</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="WAITING_SUPPLY">Chờ vật tư linh kiện</option>
            <option value="DONE">Đã hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Section: Supplies */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-amber-600" /> Vật tư & Linh kiện cần bổ sung
        </label>

        {/* Checkbox list with quantities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COMMON_SUPPLIES.map((item) => {
            const selected = supplies.find((s) => s.name === item.name);
            return (
              <div
                key={item.name}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${selected
                    ? 'bg-blue-50/70 border-blue-200 text-neutral-900'
                    : 'bg-neutral-50/70 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => handleToggleCommonSupply(item.name, item.defaultUnit)}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-medium text-xs truncate">{item.name}</span>
                </label>

                {selected && (
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={selected.quantity}
                      onChange={(e) =>
                        handleUpdateSupplyQty(item.name, parseInt(e.target.value) || 1)
                      }
                      className="w-14 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-center focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500">{selected.unit}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom supply items */}
        {supplies.filter((s) => !COMMON_SUPPLIES.some((cs) => cs.name === s.name)).length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-semibold text-neutral-600 block mb-1.5">
              Vật tư khác đã thêm:
            </span>
            <div className="flex flex-wrap gap-2">
              {supplies
                .filter((s) => !COMMON_SUPPLIES.some((cs) => cs.name === s.name))
                .map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800"
                  >
                    <span>{s.name}</span>
                    <span className="text-[#B71C1C] font-bold">
                      x{s.quantity} {s.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSupplies((prev) => prev.filter((item) => item.name !== s.name))}
                      className="text-neutral-400 hover:text-red-600 ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Add custom supply toggle */}
        {isAddingCustom ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Tên vật tư mới..."
              value={customSupplyName}
              onChange={(e) => setCustomSupplyName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Đơn vị (cái, mét...)"
              value={customSupplyUnit}
              onChange={(e) => setCustomSupplyUnit(e.target.value)}
              className="w-28 px-3 py-1.5 text-xs border border-neutral-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustomSupply}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCustom(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer py-1"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm vật tư khác
          </button>
        )}
      </div>

      {/* Technical Notes Textarea */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Ghi chú kỹ thuật / Tiến độ thực hiện
        </label>
        <textarea
          rows={3}
          value={technicalNotes}
          onChange={(e) => setTechnicalNotes(e.target.value)}
          placeholder="Ghi lại nguyên nhân lỗi, biện pháp đã thực hiện, kết quả kiểm tra..."
          className="w-full px-3.5 py-2.5 bg-neutral-50/50 border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-neutral-800 leading-relaxed"
        />
      </div>

      {/* Upload AFTER images Drag & Drop */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Ảnh nghiệm thu sau xử lý (AFTER)
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-neutral-300 hover:border-blue-400 bg-neutral-50/50'
            }`}
        >
          <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
          <p className="text-xs text-neutral-600">
            Kéo thả ảnh kết quả hoặc{' '}
            <label className="text-blue-600 font-bold hover:underline cursor-pointer">
              tải ảnh lên
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </p>
        </div>

        {/* After images previews */}
        {afterImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
            {afterImages.map((img, idx) => (
              <div
                key={idx}
                className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100"
              >
                <img src={img} alt="Ảnh sau xử lý" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAfterImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons: LƯU (xám) + HOÀN THÀNH (xanh lá) */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleSaveClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4 text-neutral-600" />
          <span>LƯU TIẾN TRÌNH</span>
        </button>

        <button
          type="button"
          onClick={handleCompleteClick}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <Check className="w-4 h-4 text-white" />
          <span>HOÀN THÀNH PHIẾU</span>
        </button>
      </div>
    </div>
  );
};
