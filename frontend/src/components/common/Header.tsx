import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Laptop, Building2 } from 'lucide-react';
import { VksLogo } from './VksLogo';

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, showMenuButton, rightAction }) => {
  const { user, logout } = useAuth();

  const roleBadge = () => {
    switch (user?.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-[#B71C1C] border border-red-200">
            <Shield className="w-3 h-3" />
            QUẢN TRỊ VIÊN
          </span>
        );
      case 'TECHNICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Laptop className="w-3 h-3" />
            KỸ THUẬT VIÊN
          </span>
        );
      case 'CUSTOMER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building2 className="w-3 h-3" />
            KHÁCH HÀNG
          </span>
        );
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuToggle}
                className="md:hidden p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div className="flex items-center gap-3">
              {/* Official VKS Logo */}
              <div className="shrink-0 transition-transform hover:scale-105 duration-200">
                <VksLogo className="w-11 h-11 drop-shadow-md" />
              </div>

              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-[#B71C1C] tracking-tight leading-snug line-clamp-1">
                  HỆ THỐNG PHIẾU YÊU CẦU KỸ THUẬT
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Bộ phận Chuyển đổi số
                </p>
              </div>
            </div>
          </div>

          {/* Right Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {rightAction}

            {user && (
              <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-neutral-200">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-neutral-800">{user.fullName}</span>
                    {roleBadge()}
                  </div>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {user.departmentName || user.email}
                  </span>
                </div>

                <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 font-bold text-sm shrink-0 shadow-2xs">
                  {user.fullName ? user.fullName.charAt(user.fullName.lastIndexOf(' ') + 1) || user.fullName.charAt(0) : <UserIcon className="w-4 h-4" />}
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 hover:text-[#B71C1C] hover:bg-red-50 border border-neutral-200 hover:border-red-200 transition-all cursor-pointer"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
