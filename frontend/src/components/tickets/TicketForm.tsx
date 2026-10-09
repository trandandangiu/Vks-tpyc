import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { TicketPriority, CREATOR_POSITIONS, INCIDENT_CATEGORIES } from '../../types';
import { Send, Upload, X, Building2, User, Phone, Briefcase } from 'lucide-react';

interface TicketFormProps {
  onSuccess: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [creatorName, setCreatorName] = useState(user?.fullName || '');
  const [creatorPhone, setCreatorPhone] = useState(user?.phone || '');
  const [creatorPosition, setCreatorPosition] = useState(CREATOR_POSITIONS[1]);
  const [category, setCategory] = useState(INCIDENT_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/')).slice(0, 4 - images.length);
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
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

    if (!title.trim()) { toast.error('Vui lòng nhập tiêu đề sự cố!'); return; }
    if (!description.trim()) { toast.error('Vui lòng nhập mô tả sự cố!'); return; }
    if (!creatorPhone.trim()) { toast.error('Vui lòng nhập SĐT liên hệ!'); return; }

    setIsSubmitting(true);

    try {
      const res = await apiClient.createTicket({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        creatorName: creatorName.trim() || user?.fullName || 'Khách hàng',
        creatorPhone: creatorPhone.trim(),
        creatorPosition,
        supplies: [],
      });

      if (!res.success || !res.ticket) {
        toast.error(res.message || 'Lỗi gửi phiếu');
        return;
      }

      const newTicketId = res.ticket.id;

      // Upload ảnh nếu có
      for (const file of images) {
        try {
          await apiClient.uploadAttachment(newTicketId, file, 'BEFORE');
        } catch (uploadErr) {
          console.error('Lỗi upload ảnh:', uploadErr);
        }
      }

      toast.success(`Gửi phiếu [${res.ticket.code}] thành công!`);
      setTitle('');
      setDescription('');
      setImages([]);
      setPreviewUrls([]);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/90 shadow-sm max-w-4xl mx-auto space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B71C1C]" />
          Tạo phiếu yêu cầu hỗ trợ kỹ thuật
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Điền đầy đủ thông tin để Bộ phận Chuyển đổi số xử lý kịp thời.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#B71C1C]" /> Đơn vị (Tự động)
          </label>
          <input
            type="text"
            readOnly
            value={user?.departmentName || user?.department?.name || 'Chưa gán đơn vị'}
            className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 text-sm font-medium cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-neutral-500" /> Tên người yêu cầu <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl text-neutral-800 text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-neutral-500" /> Vị trí công tác
          </label>
          <select
            value={creatorPosition}
            onChange={(e) => setCreatorPosition(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm font-medium cursor-pointer"
          >
            {CREATOR_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-neutral-500" /> SĐT liên hệ <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={creatorPhone}
            onChange={(e) => setCreatorPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
            Loại sự cố <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm font-medium cursor-pointer"
          >
            {INCIDENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
            Mức độ ưu tiên <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'LOW' as TicketPriority, label: 'Thấp', bg: 'peer-checked:bg-emerald-500' },
              { id: 'NORMAL' as TicketPriority, label: 'Bình thường', bg: 'peer-checked:bg-blue-600' },
              { id: 'HIGH' as TicketPriority, label: 'Cao', bg: 'peer-checked:bg-amber-500' },
              { id: 'URGENT' as TicketPriority, label: 'Khẩn cấp', bg: 'peer-checked:bg-[#B71C1C]' },
            ].map((p) => (
              <label key={p.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={p.id}
                  checked={priority === p.id}
                  onChange={() => setPriority(p.id)}
                  className="sr-only peer"
                />
                <div className={`text-center py-2 px-1 text-xs font-semibold rounded-xl border border-neutral-200 peer-checked:text-white peer-checked:border-transparent transition-all ${p.bg}`}>
                  {p.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Tiêu đề sự cố <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Máy in Canon phòng 1 không kết nối mạng LAN..."
          className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Mô tả chi tiết <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả cụ thể triệu chứng, vị trí máy tính/thiết bị, thông báo lỗi..."
          className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 focus:border-[#B71C1C] rounded-xl text-neutral-800 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
          Đính kèm ảnh hiện trạng (Tối đa 4 ảnh)
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-colors ${
            isDragging ? 'border-[#B71C1C] bg-red-50/50' : 'border-neutral-300 hover:border-[#B71C1C]/50 bg-neutral-50/50'
          }`}
        >
          <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-600 font-medium">
            Kéo thả ảnh hoặc{' '}
            <label className="text-[#B71C1C] font-bold hover:underline cursor-pointer">
              chọn từ máy
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </p>
        </div>

        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100">
                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
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
          <span>{isSubmitting ? 'ĐANG GỬI...' : 'GỬI PHIẾU YÊU CẦU'}</span>
        </button>
      </div>
    </form>
  );
};