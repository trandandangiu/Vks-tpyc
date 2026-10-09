import React from 'react';
import { LayoutDashboard, Ticket, GitPullRequest, Users, Building, ShieldAlert, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VksLogo } from './VksLogo';

export type AdminTab = 'dashboard' | 'all-tickets' | 'dispatch' | 'users' | 'departments' | 'audit-logs';

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
  const { logout, user } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Tổng quan (Dashboard)',
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
      badgeColor: 'bg-[#B71C1C] text-white',
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
      label: 'Nhật ký hệ thống (Audit)',
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
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar element */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-50 md:z-20 h-[100dvh] md:h-[calc(100vh-4rem)] w-[260px] bg-white border-r border-neutral-200 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out shadow-sm md:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <VksLogo className="w-8 h-8 drop-shadow-sm" />
            <span className="font-bold text-sm text-[#B71C1C]">QUẢN TRỊ VIÊN</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="p-3.5 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Menu Quản trị
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#B71C1C] text-white shadow-sm font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFD700]' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-[#FFD700] text-[#B71C1C]' : 'bg-[#B71C1C] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom User info & Logout */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/50">
          <div className="px-2 py-2 mb-2">
            <p className="text-xs font-bold text-neutral-800 truncate">{user?.fullName}</p>
            <p className="text-[11px] text-neutral-500 font-mono">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};
