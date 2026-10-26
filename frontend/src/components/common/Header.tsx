// src/components/common/Header.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import logoUrl from '../../public/icon.ico';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  showMenuButton,
  rightAction,
}) => {
  const { user, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 shadow-md border-b-2 text-white"
      style={{ backgroundColor: '#B71C1C', borderColor: '#7F0E0E' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-3">
          {/* ═══ LEFT: Menu + Logo + Tiêu đề ═══ */}
          <div className="flex items-center gap-3 min-w-0">
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuToggle}
                className="md:hidden p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 focus:outline-none transition-colors shrink-0"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Logo */}
            <div className="shrink-0 group">
              <img
                src={logoUrl}
                alt="Logo VKSND"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                draggable={false}
              />
            </div>

            {/* Tên cơ quan + Tiêu đề */}
            <div className="min-w-0 space-y-0.5">
              {/* Dòng 1: Tên cơ quan — CHỮ VÀNG GOLD */}
              <div className="text-[9px] sm:text-[11px] font-bold tracking-wider uppercase truncate text-[#FFD700]">
                VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ HỒ CHÍ MINH
              </div>

              {/* Dòng 2: Tiêu đề — CHỮ TRẮNG ĐẬM */}
              <h1 className="text-xs sm:text-base lg:text-lg font-black tracking-wide uppercase text-white leading-tight truncate">
                HỆ THỐNG PHIẾU YÊU CẦU KỸ THUẬT
              </h1>
            </div>
          </div>

          {/* ═══ RIGHT: Action + Notifications + User ═══ */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {rightAction}

            {user && <NotificationCenter />}

            {user && (
              <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l sm:border-white/20">
                <div className="hidden sm:flex flex-col items-end text-right min-w-0">
                  <span className="text-sm font-bold text-white truncate max-w-[180px]">
                    {user.fullName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all cursor-pointer backdrop-blur-sm"
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