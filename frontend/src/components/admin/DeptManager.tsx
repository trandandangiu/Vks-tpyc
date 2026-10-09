import React, { useState } from 'react';
import { Department } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { Building, Plus, Edit2, Trash2 } from 'lucide-react';

interface DeptManagerProps {
  departments: Department[];
  onRefresh: () => void;
}

export const DeptManager: React.FC<DeptManagerProps> = ({ departments, onRefresh }) => {
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const openCreateModal = () => {
    setEditingDept(null);
    setCode('');
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setCode(dept.code);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !name.trim()) {
      toast.error('Vui lòng nhập mã và tên đơn vị!');
      return;
    }

    try {
      if (editingDept) {
        const res = await apiClient.updateDepartment(editingDept.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        if (res.success) {
          toast.success(`Cập nhật đơn vị [${code.toUpperCase()}] thành công!`);
        } else {
          toast.error('Lỗi cập nhật đơn vị');
          return;
        }
      } else {
        if (departments.some((d) => d.code.toUpperCase() === code.trim().toUpperCase())) {
          toast.error('Mã đơn vị này đã tồn tại!');
          return;
        }

        const res = await apiClient.createDepartment({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
        });

        if (res.success) {
          toast.success(`Thêm đơn vị [${code.toUpperCase()}] thành công!`);
        } else {
          toast.error('Lỗi thêm đơn vị');
          return;
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Bạn có chắc muốn xóa đơn vị "${dept.name}" (${dept.code})?`)) return;

    try {
      const res = await apiClient.deleteDepartment(dept.id);
      if (res.success) {
        toast.success(`Đã xóa đơn vị [${dept.code}]`);
        onRefresh();
      } else {
        toast.error(res.message || 'Lỗi xóa đơn vị');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-[#B71C1C]" />
            Quản lý Đơn vị / Phòng ban
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Danh mục các phòng ban, đơn vị trực thuộc có phát sinh yêu cầu kỹ thuật.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#FFD700]" />
          <span>+ Thêm đơn vị</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-32">Mã đơn vị</th>
                <th className="py-3 px-4">Tên đơn vị / Phòng ban</th>
                <th className="py-3 px-4">Mô tả chức năng</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#B71C1C]">
                    <span className="bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      {d.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-neutral-900">
                    {d.name}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-500">
                    {d.description || '---'}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(d)}
                        className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị mới'}
        subtitle="Quản lý mã viết tắt và tên phòng ban trong viện"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Mã đơn vị (Viết tắt) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!editingDept}
              placeholder="ví dụ: P1, P2, VP, TCKT..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none font-mono font-bold disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Tên đầy đủ của đơn vị <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ví dụ: Phòng 1 (THQCT & KSĐT Án hình sự)..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Mô tả chi tiết (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nhiệm vụ, vị trí phòng..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#B71C1C] hover:bg-[#7F0E0E] rounded-xl shadow-xs cursor-pointer"
            >
              {editingDept ? 'LƯU THAY ĐỔI' : 'TẠO ĐƠN VỊ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};