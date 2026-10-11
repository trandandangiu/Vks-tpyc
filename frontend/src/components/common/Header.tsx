import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import logoUrl from '../../public/icon.ico';

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
    <header className="sticky top-0 z-30 shadow-lg">
      <div className="bg-gradient-to-r from-[#8E0000] via-[#B71C1C] to-[#8E0000] relative">
        {/* Họa tiết chìm nhẹ */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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

              {/* Logo — không khung, to hơn */}
              <div className="shrink-0">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-16 h-16 object-contain drop-shadow-md"
                  draggable={false}
                />
              </div>

              {/* Tên hệ thống */}
              <div className="min-w-0">
                <h1 className="text-[15px] sm:text-lg font-extrabold text-white tracking-tight leading-tight truncate">
                  HỆ THỐNG PHIẾU YÊU CẦU KỸ THUẬT
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-red-100 uppercase tracking-widest mt-0.5">
                  Công nghệ thông tin - Chuyển đổi số
                </p>
              </div>
            </div>

            {/* ═══ RIGHT: Action + User ═══ */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {rightAction}

              {user && (
                <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l sm:border-white/20">
                  <div className="hidden sm:flex flex-col items-end text-right min-w-0">
                    <span className="text-sm font-bold text-white truncate max-w-[200px]">
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
      </div>
    </header>
  );
};