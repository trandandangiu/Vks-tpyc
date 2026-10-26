import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Eye, EyeOff, Lock, User, LogIn } from 'lucide-react';
import { VksLogo } from '../components/common/VksLogo';
import { LoginBackground } from '../components/common/LoginBackground';

interface LoginProps {
  onNavigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!password) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);

    if (result.success && result.role) {
      toast.success('Đăng nhập thành công! Chào mừng bạn trở lại.');
      if (result.role === 'ADMIN') onNavigate('/admin');
      else if (result.role === 'TECHNICAL') onNavigate('/technical');
      else onNavigate('/customer');
    } else {
      toast.error(result.message || 'Đăng nhập không thành công');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 selection:bg-red-200">
      <LoginBackground />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300 my-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/90 overflow-hidden ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-[#B71C1C] via-[#991414] to-[#7F0E0E] p-7 text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative mx-auto mb-3 flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
              <VksLogo className="w-24 h-24 drop-shadow-xl" />
            </div>

            <h1 className="text-base sm:text-lg font-extrabold tracking-tight uppercase leading-snug text-white drop-shadow-xs">
              HỆ THỐNG PHIẾU YÊU CẦU KỸ THUẬT
            </h1>
            <p className="text-xs sm:text-sm text-red-100 font-medium mt-1 tracking-wide">
              Bộ phận Chuyển đổi số
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 sm:p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-neutral-50/70 border border-neutral-300 focus:border-[#B71C1C] focus:bg-white focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl transition-all font-medium text-neutral-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-neutral-50/70 border border-neutral-300 focus:border-[#B71C1C] focus:bg-white focus:ring-2 focus:ring-[#B71C1C]/20 rounded-xl transition-all font-medium text-neutral-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#B71C1C] hover:bg-[#7F0E0E] text-white font-bold text-sm rounded-xl shadow-md shadow-red-900/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 text-[#FFD700]" />
              <span>{isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-500 mt-4">
          Hệ thống Quản lý Yêu cầu CNTT © 2026 • Bộ phận Chuyển đổi số
        </p>
      </div>
    </div>
  );
};
