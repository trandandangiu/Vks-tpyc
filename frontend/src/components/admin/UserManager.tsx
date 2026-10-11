import React, { useState } from 'react';
import { User, Department } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import {
  Users,
  UserPlus,
  Edit2,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';

interface UserManagerProps {
  users: User[];
  departments: Department[];
  onRefresh: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ users, departments, onRefresh }) => {
  const { user: currentAdmin } = useAuth();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CUSTOMER' | 'TECHNICAL'>('CUSTOMER');
  const [departmentId, setDepartmentId] = useState<string>('');

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('vks@2026');
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('CUSTOMER');
    setDepartmentId(departments[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (target: User) => {
    setEditingUser(target);
    setUsername(target.username);
    setPassword('');
    setFullName(target.fullName);
    setEmail(target.email || '');
    setPhone(target.phone || '');
    setRole((target.role as any) || 'CUSTOMER');
    setDepartmentId(target.departmentId || departments[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !fullName.trim()) {
      toast.error('Vui lòng điền đầy đủ tên đăng nhập và họ tên!');
      return;
    }

    try {
      if (editingUser) {
        const res = await apiClient.updateUser(editingUser.id, {
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          departmentId: departmentId || undefined,
          password: password.trim() || undefined,
        });
        if (res.success) {
          toast.success(`Cập nhật người dùng [${username}] thành công!`);
        } else {
          toast.error(res.message || 'Lỗi cập nhật');
          return;
        }
      } else {
        if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
          toast.error('Tên đăng nhập này đã tồn tại!');
          return;
        }

        const res = await apiClient.createUser({
          username: username.trim(),
          password: password.trim() || 'vks@2026',
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          departmentId: departmentId || undefined,
        } as any);

        if (res.success) {
          toast.success(`Thêm người dùng mới [${username}] thành công!`);
        } else {
          toast.error(res.message || 'Lỗi tạo user');
          return;
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleToggleActive = async (target: User) => {
    if (target.id === currentAdmin?.id) {
      toast.error('Không thể tự khóa tài khoản của chính mình!');
      return;
    }

    try {
      const res = await apiClient.toggleUserActive(target.id);
      if (res.success) {
        toast.info(res.message || `Đã đổi trạng thái [${target.username}]`);
        onRefresh();
      } else {
        toast.error(res.message || 'Lỗi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    }
  };

  const handleDelete = async (target: User) => {
    if (target.id === currentAdmin?.id) {
      toast.error('Không thể xóa tài khoản của chính mình!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${target.fullName}" (${target.username})?`)) return;

    try {
      const res = await apiClient.deleteUser(target.id);
      if (res.success) {
        toast.success(`Đã xóa người dùng [${target.username}]`);
        onRefresh();
      } else {
        toast.error(res.message || 'Lỗi xóa');
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
            <Users className="w-5 h-5 text-[#B71C1C]" />
            Quản lý tài khoản cán bộ
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Danh sách đơn vị và thông tin liên hệ.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#FFD700]" />
          <span>+ Thêm người dùng</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Tài khoản</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Đơn vị</th>
                <th className="py-3 px-4">Email & SĐT</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-800">{u.username}</td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">{u.fullName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      u.role === 'ADMIN' ? 'bg-red-100 text-[#B71C1C]' :
                      u.role === 'TECHNICAL' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.role || 'Đơn vị'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 max-w-[200px] truncate">
                    {u.department?.name || u.departmentName || '---'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    <div>{u.email || '---'}</div>
                    <div className="text-[11px] text-neutral-400">{u.phone || '---'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {u.active ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-neutral-600 hover:text-blue-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          u.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.active ? 'Khóa' : 'Mở khóa'}
                      >
                        {u.active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
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
        title={editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
        subtitle="Cung cấp quyền truy cập và thông tin liên hệ"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingUser}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none disabled:bg-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Mật khẩu {editingUser && '(Trống = không đổi)'}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? 'Để trống nếu không đổi' : 'vks@2026'}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
               
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
              >
                <option value="ADMIN">Quản trị viên</option>
                <option value="CUSTOMER">Đơn vị tạo phiếu</option>
                <option value="TECHNICAL">Kỹ thuật viên</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Đơn vị / Phòng ban
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none cursor-pointer"
            >
              <option value="">-- Chọn đơn vị --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">SĐT</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[#B71C1C] focus:outline-none"
              />
            </div>
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
              {editingUser ? 'LƯU THAY ĐỔI' : 'TẠO TÀI KHOẢN'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};