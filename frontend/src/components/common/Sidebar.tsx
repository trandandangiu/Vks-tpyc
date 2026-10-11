import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  GitPullRequest,
  Users,
  Building,
  ShieldAlert,
  X,
} from 'lucide-react';
import logoUrl from '../../public/icon.ico';

export type AdminTab =
  | 'dashboard'
  | 'all-tickets'
  | 'dispatch'
  | 'users'
  | 'departments'
  | 'audit-logs';

interface SidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  newTicketsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  newTicketsCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Tổng quan',
      icon: LayoutDashboard,
    },
    {
      id: 'all-tickets' as AdminTab,
      label: 'Tất cả phiếu',
      icon: Ticket,
    },
    {
      id: 'dispatch' as AdminTab,
      label: 'Điều phối kỹ thuật',
      icon: GitPullRequest,
      badge: newTicketsCount > 0 ? newTicketsCount : null,
    },
    {
      id: 'users' as AdminTab,
      label: 'Quản lý người dùng',
      icon: Users,
    },
    {
      id: 'departments' as AdminTab,
      label: 'Quản lý đơn vị',
      icon: Building,
    },
    {
      id: 'audit-logs' as AdminTab,
      label: 'Nhật ký hệ thống',
      icon: ShieldAlert,
    },
  ];

  const handleSelect = (tab: AdminTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 md:top-[72px] z-50 md:z-20 h-[100dvh] md:h-[calc(100vh-72px)] w-[260px] bg-white border-r border-neutral-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out shadow-sm md:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header trên sidebar */}
        <div className="flex items-center gap-2.5 px-4 h-[72px] border-b border-neutral-200 shrink-0">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain shrink-0"
            draggable={false}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-[#B71C1C] leading-tight truncate">
          PHIẾU YÊU CẦU KỸ THUẬT
            </p>
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider truncate">
              Quản trị hệ thống
            </p>
          </div>

          {/* Nút đóng trên mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden ml-auto p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Menu chính
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer relative ${
                  isActive
                    ? 'bg-red-50 text-[#B71C1C] font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium'
                }`}
              >
                {/* Vạch đỏ bên trái khi active */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#B71C1C]" />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive
                        ? 'text-[#B71C1C]'
                        : 'text-neutral-500 group-hover:text-neutral-700'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full ${
                      isActive
                        ? 'bg-[#B71C1C] text-white'
                        : 'bg-red-100 text-[#B71C1C]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Chân sidebar — chỉ hiện dòng version mảnh */}
        <div className="px-4 py-3 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-400 text-center">
            v1.0.0 • © 2026
          </p>
        </div>
      </aside>
    </>
  );
};