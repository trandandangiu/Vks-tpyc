import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, SupplyItem } from '../../types';
import {
  Clock,
  Wrench,
  Package,
  Plus,
  Upload,
  X,
  Check,
  Save,
  Printer,
  Camera,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { apiClient } from '../../services/apiClient';
import { TicketPrintModal } from './TicketPrintModal';
import { useAuth } from '../../context/AuthContext';

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

// Chuyển ISO string → giá trị cho input datetime-local (theo local timezone)
const toLocalDatetimeValue = (iso?: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export const TicketProcessForm: React.FC<TicketProcessFormProps> = ({
  ticket,
  onSave,
  onComplete,
}) => {
  const toast = useToast();
  const { user } = useAuth();

  // ─── State form ───
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [scheduledAt, setScheduledAt] = useState<string>(
    toLocalDatetimeValue(ticket.scheduledAt)
  );
  const [technicalNotes, setTechnicalNotes] = useState<string>(
    ticket.processNote || ticket.technicalNotes || ''
  );
  const [supplies, setSupplies] = useState<SupplyItem[]>(ticket.supplies || []);
  const [afterImages, setAfterImages] = useState<string[]>(
    ticket.afterImages || []
  );
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // ─── State cho phần nhập vật tư tự do ───
  const [customSupplyName, setCustomSupplyName] = useState('');
  const [customSupplyQty, setCustomSupplyQty] = useState<number>(1);
  const [customSupplyUnit, setCustomSupplyUnit] = useState('cái');

  // ─── State kéo-thả ảnh ───
  const [isDragging, setIsDragging] = useState(false);

  // ─── Sync state khi đổi ticket ───
  useEffect(() => {
    setStatus(ticket.status);
    setScheduledAt(toLocalDatetimeValue(ticket.scheduledAt));
    setTechnicalNotes(ticket.processNote || ticket.technicalNotes || '');
    setSupplies(ticket.supplies || []);
    setAfterImages(ticket.afterImages || []);

    // Reset ô nhập vật tư
    setCustomSupplyName('');
    setCustomSupplyQty(1);
    setCustomSupplyUnit('cái');
  }, [ticket.id, ticket.updatedAt]);

  // ─── Thêm vật tư ───
  const handleAddCustomSupply = () => {
    const name = customSupplyName.trim();
    if (!name) return;

    const qty = Math.max(1, Number(customSupplyQty) || 1);
    const unit = customSupplyUnit.trim() || 'cái';

    // Nếu trùng tên (không phân biệt hoa thường) → cộng dồn số lượng
    const existingIndex = supplies.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex >= 0) {
      setSupplies((prev) =>
        prev.map((s, i) =>
          i === existingIndex ? { ...s, quantity: s.quantity + qty } : s
        )
      );
    } else {
      setSupplies((prev) => [...prev, { name, quantity: qty, unit }]);
    }

    // Reset ô nhập
    setCustomSupplyName('');
    setCustomSupplyQty(1);
    setCustomSupplyUnit('cái');
  };

  const handleRemoveSupply = (index: number) => {
    setSupplies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllSupplies = () => {
    if (supplies.length === 0) return;
    if (!confirm(`Xóa tất cả ${supplies.length} vật tư đã nhập?`)) return;
    setSupplies([]);
  };

  // ─── Upload ảnh AFTER ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processAfterFiles(Array.from(e.target.files));
    e.target.value = ''; // cho phép chọn lại cùng file
  };

  const processAfterFiles = async (files: File[]) => {
    const valid = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 4 - afterImages.length);

    if (valid.length === 0) {
      toast.warning('Chỉ chấp nhận tệp hình ảnh (tối đa 4 ảnh)');
      return;
    }

    for (const file of valid) {
      try {
        const res = await apiClient.uploadAttachment(ticket.id, file, 'AFTER');
        const url = res?.attachment?.id
          ? apiClient.getAttachmentUrl(res.attachment.id, true)
          : res?.attachment?.url ||
            res?.attachment?.filePath ||
            URL.createObjectURL(file);

        setAfterImages((prev) => [...prev, url]);
        toast.success(`Đã tải ảnh: ${file.name}`);
      } catch (err: any) {
        console.error('Lỗi upload AFTER:', err);
        toast.error(`Lỗi upload ảnh ${file.name}: ${err.message || ''}`);
      }
    }
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

  const removeAfterImage = async (index: number) => {
    const targetUrl = afterImages[index];
    const match = targetUrl?.match(/\/attachments\/([^/?]+)\/download/);
    if (match?.[1]) {
      try {
        await apiClient.deleteAttachment(match[1]);
      } catch (err) {
        console.error('Lỗi xóa ảnh trên server:', err);
      }
    }
    setAfterImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Submit ───
  const handleSaveClick = () => {
    onSave({
      status,
      scheduledAt: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined,
      technicalNotes,
      supplies,
      afterImages,
    });
  };

  const handleCompleteClick = () => {
    if (supplies.length === 0) {
      const ok = confirm(
        'Chưa nhập vật tư nào. Vẫn hoàn thành phiếu?'
      );
      if (!ok) return;
    }

    onComplete({
      status: 'DONE',
      scheduledAt: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined,
      technicalNotes,
      supplies,
      afterImages,
      completedAt: new Date().toISOString(),
    });
  };

  // ─── Render ───
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-100 pb-3 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#B71C1C]" />
          Tiến trình xử lý kỹ thuật
        </h3>
        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#B71C1C] border border-red-200 font-bold text-xs transition-colors cursor-pointer"
          title="Xem trước và in phiếu kiểm tra kỹ thuật (A4)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>In phiếu kiểm tra</span>
        </button>
      </div>

      {/* Row 1: Hẹn giờ + Trạng thái */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" /> Hẹn giờ xử lý
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-sm font-medium text-neutral-800 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Trạng thái phiếu
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            className="w-full px-3 py-2 bg-white border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-sm font-semibold text-neutral-800 cursor-pointer outline-none"
          >
            <option value="ASSIGNED">Đã phân công (Chờ nhận)</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="WAITING_SUPPLY">Chờ vật tư linh kiện</option>
            <option value="DONE">Đã hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Vật tư & Linh kiện */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-amber-600" />
          Vật tư cần bổ sung
        </label>

        {/* Ô nhập vật tư */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="Tên vật tư (vd: Switch 8-port, Cáp Cat6...)"
            value={customSupplyName}
            onChange={(e) => setCustomSupplyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomSupply();
              }
            }}
            className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 outline-none"
          />

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={999}
              placeholder="SL"
              value={customSupplyQty}
              onChange={(e) =>
                setCustomSupplyQty(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-16 px-2 py-2 text-xs border border-neutral-300 rounded-xl text-center font-bold focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 outline-none"
            />

            <input
              type="text"
              placeholder="Đơn vị"
              value={customSupplyUnit}
              onChange={(e) => setCustomSupplyUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSupply();
                }
              }}
              className="w-24 px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 outline-none"
            />

            <button
              type="button"
              onClick={handleAddCustomSupply}
              disabled={!customSupplyName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#B71C1C] hover:bg-[#7F0E0E] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>
        </div>

        {/* Danh sách vật tư đã nhập */}
        {supplies.length > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Đã thêm ({supplies.length})
              </span>
              <button
                type="button"
                onClick={handleClearAllSupplies}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {supplies.map((s, idx) => (
                <span
                  key={`${s.name}-${idx}`}
                  className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-neutral-800"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#B71C1C] text-white text-[11px] font-bold">
                    x{s.quantity} {s.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSupply(idx)}
                    className="p-0.5 text-neutral-400 hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Xóa vật tư này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-400 italic px-1">
          
          </p>
        )}
      </div>

      {/* Ghi chú kỹ thuật */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Ghi chú kỹ thuật / Tiến độ thực hiện
        </label>
        <textarea
          rows={3}
          value={technicalNotes}
          onChange={(e) => setTechnicalNotes(e.target.value)}
          placeholder="Ghi lại nguyên nhân lỗi, biện pháp đã thực hiện, kết quả kiểm tra..."
          className="w-full px-3.5 py-2.5 bg-neutral-50/50 border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-sm text-neutral-800 leading-relaxed outline-none"
        />
      </div>

      {/* Upload ảnh AFTER */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Ảnh nghiệm thu sau xử lý (Hỗ trợ chụp trực tiếp trên điện thoại)
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            isDragging
              ? 'border-[#B71C1C] bg-red-50/50'
              : 'border-neutral-300 hover:border-[#B71C1C]/50 bg-neutral-50/50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-1.5">
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white text-xs font-bold shadow-xs cursor-pointer transition-all">
              <Camera className="w-4 h-4 text-[#FFD700]" />
              <span>Chụp ảnh nghiệm thu (Camera)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-xs font-bold cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-[#B71C1C]" />
              <span>Chọn ảnh từ máy</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            Tối đa 4 ảnh • Hỗ trợ chụp trực tiếp từ Camera điện thoại
          </p>
        </div>

        {afterImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
            {afterImages.map((img, idx) => (
              <div
                key={idx}
                className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100"
              >
                <img
                  src={img}
                  alt={`Ảnh sau xử lý ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAfterImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                  title="Xóa ảnh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-[#B71C1C] border border-[#B71C1C]/40 font-bold text-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>IN PHIẾU KIỂM TRA</span>
        </button>

        <div className="flex items-center gap-3 ml-auto">
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

      <TicketPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ticket={ticket}
        draftNotes={technicalNotes}
        draftSupplies={supplies}
        draftScheduledAt={scheduledAt ? new Date(scheduledAt).toISOString() : ticket.scheduledAt}
        draftStatus={status}
        technicianName={user?.fullName}
      />
    </div>
  );
};