import React, { useState, useEffect, useRef } from 'react';
import { AppNotification } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  MonitorDown,
  X,
  CheckCircle2,
  Volume2,
  Sparkles,
} from 'lucide-react';

// Phát âm thanh chuông báo nhẹ bằng Web Audio API (không cần file mp3 ngoài)
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12); // D6
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Trình duyệt chặn autoplay trước khi user tương tác
  }
}

// Hiển thị thông báo ra ngoài màn hình Desktop / Điện thoại (Native OS Notification)
async function showSystemDesktopNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icon.ico',
          badge: '/icon.ico',
          tag: tag || `vks-notif-${Date.now()}`,
          requireInteraction: false,
        });
        return;
      }
    }
    const n = new Notification(title, {
      body,
      icon: '/icon.ico',
      tag: tag || `vks-notif-${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error('Lỗi hiển thị Desktop Notification:', err);
  }
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef(false);

  // Bắt sự kiện cài đặt PWA về Desktop (beforeinstallprompt)
  useEffect(() => {
    const checkStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any)?.standalone === true;
    setIsInstalled(checkStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('Đã cài đặt ứng dụng về màn hình Desktop thành công!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải danh sách thông báo từ Database
  const fetchNotifications = async (triggerAlertForNew = false) => {
    if (!user) return;
    try {
      const data = await apiClient.getNotifications(50);
      const list = data.notifications || [];
      setNotifications(list);
      setUnreadCount(data.unreadCount || 0);

      if (!initialLoadedRef.current) {
        list.forEach((n) => knownIdsRef.current.add(n.id));
        initialLoadedRef.current = true;
      } else if (triggerAlertForNew) {
        for (const item of list) {
          if (!knownIdsRef.current.has(item.id)) {
            knownIdsRef.current.add(item.id);
            if (!item.isRead) {
              playNotificationSound();
              toast.info(`${item.title}: ${item.content}`);
              showSystemDesktopNotification(item.title, item.content, item.id);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // Kết nối SSE thời gian thực + Polling dự phòng từ DB
  useEffect(() => {
    if (!user) return;
    initialLoadedRef.current = false;
    knownIdsRef.current.clear();
    fetchNotifications(false);

    const token = apiClient.getToken();
    let es: EventSource | null = null;

    if (token && typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(`/api/sse/stream?token=${encodeURIComponent(token)}`);
        es.addEventListener('notification', (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            const notif: AppNotification = parsed?.data || parsed;
            if (notif && notif.title) {
              if (!knownIdsRef.current.has(notif.id)) {
                knownIdsRef.current.add(notif.id);
                setNotifications((prev) => [notif, ...prev]);
                setUnreadCount((c) => c + 1);
                playNotificationSound();
                toast.info(`${notif.title}: ${notif.content}`);
                showSystemDesktopNotification(notif.title, notif.content, notif.id);
                window.dispatchEvent(new CustomEvent('ticket-updated', { detail: notif }));
              }
            }
          } catch {
            fetchNotifications(true);
          }
        });
      } catch {
        // Fallback sang polling
      }
    }

    const timer = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    return () => {
      if (es) es.close();
      clearInterval(timer);
    };
  }, [user?.id]);

  // Xin quyền bật thông báo trên Desktop / Điện thoại
  const handleEnableDesktopNotification = async () => {
    if (!('Notification' in window)) {
      toast.warning('Trình duyệt của bạn không hỗ trợ thông báo màn hình.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        playNotificationSound();
        toast.success('Đã bật thông báo màn hình Desktop thành công!');
        await showSystemDesktopNotification(
          '🔔 Đã bật thông báo Hệ Thống Phiếu Kỹ Thuật',
          `Xin chào ${user?.fullName || ''}, khi có phiếu mới hoặc cập nhật trạng thái, thông báo sẽ hiển thị ngay tại đây!`
        );
      } else {
        toast.warning(
          'Bạn đã từ chối quyền thông báo. Hãy bấm vào biểu tượng ổ khóa trên thanh địa chỉ trình duyệt để Cho phép (Allow).'
        );
      }
    } catch {
      toast.error('Không thể yêu cầu quyền thông báo.');
    }
  };

  // Gửi thử 1 thông báo ra màn hình Desktop
  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      await handleEnableDesktopNotification();
      return;
    }
    playNotificationSound();
    await showSystemDesktopNotification(
      '🔔 Thông báo kiểm tra — VKSND TP.HCM',
      'Hệ thống thông báo trên màn hình Desktop đang hoạt động tốt!'
    );
    toast.success('Đã đẩy thông báo kiểm tra ra màn hình!');
  };

  // Cài đặt ứng dụng về Desktop
  const handleInstallDesktopApp = async () => {
    // Tự động xin quyền thông báo luôn khi tải app
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((res) => setPermission(res));
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleMarkRead = async (n: AppNotification) => {
    if (n.isRead) return;
    try {
      await apiClient.markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đọc tất cả thông báo');
    } catch {
      // ignore
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const target = notifications.find((n) => n.id === id);
      await apiClient.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error('Lỗi xóa thông báo');
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Xóa vĩnh viễn tất cả thông báo của bạn khỏi Cơ sở dữ liệu?')) return;
    try {
      await apiClient.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Đã xóa sạch thông báo trong CSDL');
    } catch {
      toast.error('Lỗi xóa thông báo');
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      {/* Nút Tải ứng dụng về Desktop */}
      {!isInstalled && (
        <button
          type="button"
          onClick={handleInstallDesktopApp}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#B71C1C] bg-[#FFD700] hover:bg-amber-300 shadow-xs transition-all cursor-pointer"
          title="Cài đặt hệ thống về màn hình Desktop / Điện thoại và nhận thông báo"
        >
          <MonitorDown className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">Tải về Desktop</span>
        </button>
      )}

      {/* Nút Chuông Thông Báo */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="relative p-2.5 rounded-xl text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all cursor-pointer"
          title="Thông báo hệ thống"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-[#FFD700] animate-bounce" />
          ) : (
            <Bell className="w-4 h-4 text-white" />
          )}

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#FFD700] text-[#B71C1C] text-[11px] font-black flex items-center justify-center shadow-sm border border-[#B71C1C]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Danh sách Thông báo */}
        {isOpen && (
          <div className="fixed sm:absolute right-2 sm:right-0 top-[76px] sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 text-neutral-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Dropdown */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#B71C1C]" />
                <span className="font-extrabold text-sm text-neutral-900">
                  Thông báo ({unreadCount} chưa đọc)
                </span>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1"
                    title="Đánh dấu đã đọc tất cả"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Đọc hết
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-1"
                    title="Xóa toàn bộ khỏi CSDL"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa hết
                  </button>
                )}
              </div>
            </div>

            {/* Thanh trạng thái Bật Thông Báo Màn Hình Desktop */}
            <div className="px-4 py-2.5 bg-red-50/70 border-b border-red-100 flex items-center justify-between gap-2">
              {permission === 'granted' ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đã bật thông báo màn hình</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 text-[#B71C1C] border border-red-200 text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-3 h-3" /> Thử chuông báo
                  </button>
                </>
              ) : (
                <>
                  <div className="text-[11px] text-neutral-700 font-medium leading-tight">
                    Bật thông báo để hiện ngay trên màn hình Desktop khi có phiếu mới:
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableDesktopNotification}
                    className="px-3 py-1.5 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white text-[11px] font-bold shadow-2xs cursor-pointer shrink-0"
                  >
                    Bật ngay
                  </button>
                </>
              )}
            </div>

            {/* Danh sách thông báo */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-neutral-400">
                  Hiện chưa có thông báo nào.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleMarkRead(item)}
                    className={`px-4 py-3 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                      !item.isRead
                        ? 'bg-red-50/40 hover:bg-red-50/70'
                        : 'bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#B71C1C] shrink-0" />
                        )}
                        <p
                          className={`text-xs truncate ${
                            !item.isRead
                              ? 'font-extrabold text-neutral-900'
                              : 'font-semibold text-neutral-700'
                          }`}
                        >
                          {item.title}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-snug break-words">
                        {item.content}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(e, item.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Xóa thông báo này khỏi CSDL"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Chân Dropdown: nút cài đặt về Desktop nếu chưa cài */}
            {!isInstalled && (
              <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 font-medium">
                  Chạy độc lập trên màn hình Desktop
                </span>
                <button
                  type="button"
                  onClick={handleInstallDesktopApp}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#B71C1C] hover:underline cursor-pointer"
                >
                  <MonitorDown className="w-3.5 h-3.5" /> Cài đặt về máy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal hướng dẫn cài đặt về Desktop khi trình duyệt cần bấm nút trên thanh địa chỉ */}
      {showInstallGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="bg-white text-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-50 text-[#B71C1C]">
                  <MonitorDown className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-neutral-900">
                  Cài đặt Ứng dụng về Desktop & Bật thông báo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#B71C1C]" />
                  Cách 1: Trên máy tính (Chrome / Microsoft Edge / Cốc Cốc)
                </p>
                <p>
                  Nhìn lên góc phải của <b>Thanh địa chỉ trình duyệt (URL)</b>, bấm vào biểu tượng{' '}
                  <b>Màn hình có mũi tên tải xuống (Cài đặt ứng dụng)</b> hoặc vào menu{' '}
                  <b>⋮ &rarr; Lưu và chia sẻ &rarr; Cài đặt trang làm ứng dụng</b>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <p className="font-bold text-neutral-900">
                  Cách 2: Trên điện thoại (iPhone / Android)
                </p>
                <p>
                  Bấm nút <b>Chia sẻ (Share)</b> hoặc menu <b>⋮</b> &rarr; chọn{' '}
                  <b>"Thêm vào màn hình chính" (Add to Home Screen)</b>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#B71C1C]">Nhận thông báo trên màn hình</p>
                  <p className="text-[11px] text-neutral-600">
                    {permission === 'granted'
                      ? 'Trình duyệt của bạn ĐÃ BẬT thông báo màn hình.'
                      : 'Bấm nút bên cạnh để cho phép hiển thị thông báo khi có phiếu mới.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={
                    permission === 'granted'
                      ? handleTestNotification
                      : handleEnableDesktopNotification
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#8E1515] text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  {permission === 'granted' ? 'Thử thông báo' : 'Bật thông báo'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="px-5 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
