import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  X,
  ShieldCheck,
  Clock,
  Trash2,
  UserCheck,
  Phone,
  Sparkles,
  ChevronDown,
  Building2,
  FileText,
  Lock,
} from 'lucide-react';
import { ChatRoom, ChatMessage } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

const QUICK_REPLIES_TECHNICAL = [
  'Chào anh/chị, em là kỹ thuật phụ trách phiếu. Anh/chị thử khởi động lại máy xem còn lỗi không nhé!',
  'Anh/chị bật UltraViewer / AnyDesk và gửi ID + Mật khẩu vào đây để em xử lý từ xa luôn nhé.',
  'Anh/chị kiểm tra giúp em dây cáp nguồn và cáp mạng/USB máy in đã cắm chặt chưa ạ?',
  'Em đã cấu hình lại từ xa xong, anh/chị kiểm tra thử xem máy đã hoạt động ổn định chưa nhé!',
];

const QUICK_REPLIES_CUSTOMER = [
  'Chào kỹ thuật, hỗ trợ kiểm tra từ xa giúp mình sự cố này nhé!',
  'Mình đã làm theo hướng dẫn và máy đã hoạt động bình thường rồi, cảm ơn kỹ thuật!',
  'Lỗi vẫn chưa hết, nhờ kỹ thuật sắp xếp xuống phòng kiểm tra trực tiếp giúp mình nhé.',
];

export const TicketChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedTicketIdRef = useRef<string | null>(null);
  const isOpenRef = useRef<boolean>(false);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId;
  }, [selectedTicketId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const loadRooms = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient.getChatRooms();
      setRooms(data);
      if (data.length > 0 && !selectedTicketIdRef.current) {
        setSelectedTicketId(data[0].ticketId);
      } else if (
        selectedTicketIdRef.current &&
        !data.some((r) => r.ticketId === selectedTicketIdRef.current)
      ) {
        setSelectedTicketId(data[0]?.ticketId || null);
      }
    } catch {
      // ignore background error
    }
  }, [user]);

  const loadMessages = useCallback(
    async (ticketId: string) => {
      try {
        setLoadingMessages(true);
        const data = await apiClient.getChatMessages(ticketId);
        setMessages(data.messages || []);
        setRooms((prev) =>
          prev.map((r) => (r.ticketId === ticketId ? { ...r, unreadCount: 0 } : r))
        );
        scrollToBottom();
      } catch (err: any) {
        showToast(err?.message || 'Không thể tải hội thoại', 'error');
      } finally {
        setLoadingMessages(false);
      }
    },
    [showToast]
  );

  // Initial load & periodic refresh (including 24h expiration check)
  useEffect(() => {
    if (!user) return;
    loadRooms();
    const timer = setInterval(loadRooms, 25000);
    return () => clearInterval(timer);
  }, [user, loadRooms]);

  // Load messages when opening chat or switching ticket room
  useEffect(() => {
    if (isOpen && selectedTicketId) {
      loadMessages(selectedTicketId);
    }
  }, [isOpen, selectedTicketId, loadMessages]);

  // Listen for custom event to open a specific ticket's chat directly from ticket cards
  useEffect(() => {
    const handleOpenTicketChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ ticketId?: string }>;
      const ticketId = customEvent.detail?.ticketId;
      setIsOpen(true);
      loadRooms().then(() => {
        if (ticketId) {
          setSelectedTicketId(ticketId);
          const matchedRoom = rooms.find((r) => r.ticketId === ticketId);
          if (matchedRoom) {
            setSelectedDepartment(matchedRoom.departmentName || 'ALL');
          }
        }
      });
    };
    window.addEventListener('open-ticket-chat', handleOpenTicketChat);
    return () => window.removeEventListener('open-ticket-chat', handleOpenTicketChat);
  }, [loadRooms, rooms]);

  // Real-time SSE connection for instant messages & new ticket assignments
  useEffect(() => {
    if (!user) return;
    const token = apiClient.getToken();
    if (!token) return;

    const es = new EventSource(`/api/sse/stream?token=${encodeURIComponent(token)}`);

    es.addEventListener('chat_message', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const msg: ChatMessage = parsed.data || parsed;
        if (!msg || !msg.ticketId) return;

        if (isOpenRef.current && selectedTicketIdRef.current === msg.ticketId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
          if (msg.senderId !== user.id) {
            apiClient.getChatMessages(msg.ticketId).catch(() => {});
          }
        } else if (msg.senderId !== user.id) {
          showToast(
            `💬 Tin nhắn mới từ ${msg.senderName} (${msg.ticketCode || 'Phiếu hỗ trợ'})`,
            'info'
          );
        }

        loadRooms();
      } catch {
        // ignore parse error
      }
    });

    es.addEventListener('chat_cleared', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed.data || parsed;
        if (payload?.ticketId && selectedTicketIdRef.current === payload.ticketId) {
          setMessages([]);
        }
        loadRooms();
      } catch {
        // ignore
      }
    });

    es.addEventListener('notification', () => {
      loadRooms();
    });

    return () => {
      es.close();
    };
  }, [user, loadRooms, showToast]);

  // Danh sách Đơn vị (Phòng ban) kèm số lượng phiếu và số tin chưa đọc
  const departmentsSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; unread: number }>();
    rooms.forEach((r) => {
      const dept = r.departmentName || 'Đơn vị khác';
      const existing = map.get(dept) || { name: dept, count: 0, unread: 0 };
      existing.count += 1;
      existing.unread += r.unreadCount || 0;
      map.set(dept, existing);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread;
      return b.count - a.count;
    });
  }, [rooms]);

  // Lọc danh sách mã phiếu theo Đơn vị đang chọn ở Sidebar
  const filteredRooms = useMemo(() => {
    if (selectedDepartment === 'ALL') return rooms;
    return rooms.filter((r) => (r.departmentName || 'Đơn vị khác') === selectedDepartment);
  }, [rooms, selectedDepartment]);

  // Khi bấm chọn Đơn vị khác, tự động chọn mã phiếu đầu tiên của Đơn vị đó
  const handleSelectDepartment = (deptName: string) => {
    setSelectedDepartment(deptName);
    const list =
      deptName === 'ALL'
        ? rooms
        : rooms.filter((r) => (r.departmentName || 'Đơn vị khác') === deptName);
    if (list.length > 0 && !list.some((r) => r.ticketId === selectedTicketId)) {
      setSelectedTicketId(list[0].ticketId);
    }
  };

  if (!user) return null;

  const activeRoom =
    filteredRooms.find((r) => r.ticketId === selectedTicketId) ||
    rooms.find((r) => r.ticketId === selectedTicketId) ||
    filteredRooms[0] ||
    rooms[0] ||
    null;

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = (customText !== undefined ? customText : inputText).trim();
    if (!content || !activeRoom || sending) return;

    try {
      setSending(true);
      if (customText === undefined) setInputText('');
      setShowQuickReplies(false);
      const newMsg = await apiClient.sendChatMessage(activeRoom.ticketId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
      loadRooms();
    } catch (err: any) {
      showToast(err?.message || 'Không thể gửi tin nhắn', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeRoom) return;
    if (
      !window.confirm(
        `Xóa vĩnh viễn toàn bộ lịch sử trò chuyện của phiếu ${activeRoom.ticketCode} khỏi CSDL ngay bây giờ?`
      )
    ) {
      return;
    }
    try {
      await apiClient.clearChatMessages(activeRoom.ticketId);
      setMessages([]);
      showToast('Đã xóa cứng đoạn hội thoại khỏi CSDL', 'info');
      loadRooms();
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa hội thoại', 'error');
    }
  };

  const formatRemainingHours = (expiresAt?: string) => {
    if (!expiresAt) return '24h';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Sắp tự hủy';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `Tự xóa sau ${hours}h${mins}p` : `Tự xóa sau ${mins}p`;
  };

  const quickReplies =
    user.role === 'TECHNICAL' ? QUICK_REPLIES_TECHNICAL : QUICK_REPLIES_CUSTOMER;

  return (
    <>
      {/* Nút Chatbox tròn màu đỏ nổi bật ở góc phải dưới */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={
            activeRoom
              ? `Trò chuyện bảo mật 24h (${rooms.length} phiếu đang mở)`
              : 'Mở cửa sổ Trò chuyện bảo mật 24h'
          }
          className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-[#B71C1C] to-[#7F0E0E] hover:from-[#991B1B] hover:to-[#600808] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 border-2 border-amber-300/60 flex items-center justify-center transition-all duration-200 cursor-pointer"
        >
          {/* Vòng sáng hiệu ứng khi có phiếu đang được phân công */}
          {rooms.length > 0 && !isOpen && (
            <span className="absolute inset-0 rounded-full bg-[#B71C1C] opacity-25 animate-ping pointer-events-none" />
          )}

          {isOpen ? (
            <X className="w-6 h-6 text-white relative z-10" />
          ) : (
            <MessageSquare className="w-6 h-6 text-[#FFD700] relative z-10" />
          )}

          {/* Badge số tin nhắn chưa đọc */}
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-[#7F0E0E] border-2 border-white text-[11px] font-extrabold flex items-center justify-center shadow-sm z-20 animate-bounce">
              {totalUnread}
            </span>
          )}

          {/* Badge số lượng phiếu đang kết nối (khi không có tin chưa đọc) */}
          {totalUnread === 0 && rooms.length > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white border-2 border-white text-[10px] font-bold flex items-center justify-center shadow-xs z-20">
              {rooms.length}
            </span>
          )}
        </button>
      </div>

      {/* Cửa sổ Trò chuyện có Sidebar phân loại Đơn vị -> Mã phiếu */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[700px] lg:w-[760px] h-[540px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-red-200 flex flex-col overflow-hidden print:hidden">
          {/* Header màu đỏ đồng bộ */}
          <div className="bg-gradient-to-r from-[#B71C1C] to-[#8B0000] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate flex items-center gap-1.5">
                  <span>Hội thoại Trực tuyến</span>
                  <Lock className="w-3.5 h-3.5 text-[#FFD700]" />
                </h3>
                <p className="text-[11px] text-red-100 flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-[#FFD700] shrink-0" />
                
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {activeRoom && messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 rounded-lg text-red-100 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Xóa cứng đoạn hội thoại của phiếu này khỏi CSDL"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-red-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {rooms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2.5 bg-neutral-50">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#B71C1C] flex items-center justify-center">
                <UserCheck className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-neutral-800">
                Chưa có phiếu công việc nào được điều phối trò chuyện
              </p>
              <p className="text-xs text-neutral-500 max-w-md leading-relaxed">
                Khi Admin điều phối phiếu công việc giữa <strong>Kỹ thuật viên</strong> và{' '}
                <strong>Đơn vị yêu cầu</strong>, danh sách Đơn vị và Mã phiếu sẽ tự động hiển thị ở
                Sidebar này để hai bên trao đổi khắc phục nhanh.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
              {/* ═══ SIDEBAR TRÁI: PHÂN LOẠI ĐƠN VỊ & MÃ PHIẾU ═══ */}
              <div className="w-full sm:w-[265px] border-b sm:border-b-0 sm:border-r border-neutral-200 bg-neutral-50/80 flex flex-col shrink-0 max-h-[210px] sm:max-h-none">
                {/* 1. Chọn Đơn vị (Phòng ban) */}
                <div className="p-2.5 border-b border-neutral-200 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#B71C1C] mb-1.5 px-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>1. Chọn Đơn vị ({departmentsSummary.length})</span>
                  </div>
                  <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto sm:max-h-36 pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => handleSelectDepartment('ALL')}
                      className={`shrink-0 w-auto sm:w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedDepartment === 'ALL'
                          ? 'bg-[#B71C1C] text-white shadow-2xs'
                          : 'bg-neutral-100/80 text-neutral-700 hover:bg-red-50 hover:text-[#B71C1C]'
                      }`}
                    >
                      <span className="truncate">Tất cả đơn vị</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          selectedDepartment === 'ALL'
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {rooms.length}
                      </span>
                    </button>

                    {departmentsSummary.map((dept) => {
                      const isDeptSelected = selectedDepartment === dept.name;
                      return (
                        <button
                          key={dept.name}
                          type="button"
                          onClick={() => handleSelectDepartment(dept.name)}
                          className={`shrink-0 w-auto sm:w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isDeptSelected
                              ? 'bg-[#B71C1C] text-white font-bold shadow-2xs'
                              : 'bg-white text-neutral-700 border border-neutral-200/80 hover:border-red-200 hover:bg-red-50/60 hover:text-[#B71C1C]'
                          }`}
                        >
                          <span className="truncate text-left">{dept.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {dept.unread > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-[#7F0E0E] text-[10px] font-extrabold">
                                {dept.unread} mới
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isDeptSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {dept.count}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Danh sách Mã phiếu thuộc Đơn vị đã chọn */}
                <div className="flex-1 flex flex-col min-h-0 p-2.5 overflow-y-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 px-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#B71C1C]" />
                      2. Mã phiếu thuộc đơn vị ({filteredRooms.length})
                    </span>
                  </div>

                  {filteredRooms.map((room) => {
                    const isSelected = room.ticketId === activeRoom?.ticketId;
                    return (
                      <button
                        key={room.ticketId}
                        type="button"
                        onClick={() => setSelectedTicketId(room.ticketId)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 border-[#B71C1C] ring-1 ring-[#B71C1C]/30 shadow-2xs'
                            : 'bg-white border-neutral-200 hover:border-red-200 hover:bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span
                            className={`font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-[#B71C1C] text-white'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {room.ticketCode}
                          </span>

                          {room.unreadCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#B71C1C] text-white text-[10px] font-extrabold animate-pulse">
                              {room.unreadCount} tin mới
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-neutral-400 truncate">
                              {room.departmentName}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {room.partnerRole === 'CUSTOMER' ? '👤 ' : '🛠️ '}
                          {room.partnerName}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {room.ticketTitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ═══ KHUNG PHẢI: NỘI DUNG TRÒ CHUYỆN CỦA MÃ PHIẾU ĐÃ CHỌN ═══ */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
                {/* Thanh thông tin người trò chuyện */}
                {activeRoom && (
                  <div className="px-4 py-2.5 bg-red-50/60 border-b border-red-100 flex items-center justify-between gap-2 text-xs shrink-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded bg-[#B71C1C] text-white">
                          {activeRoom.ticketCode}
                        </span>
                        <span className="font-bold text-neutral-900 truncate">
                          {activeRoom.partnerRole === 'CUSTOMER'
                            ? `Cán bộ: ${activeRoom.partnerName}`
                            : `Kỹ thuật viên: ${activeRoom.partnerName}`}
                        </span>
                        <span className="text-[11px] font-semibold text-[#B71C1C] bg-white px-2 py-0.5 rounded-full border border-red-200">
                          {activeRoom.departmentName}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                        Sự cố: <strong>{activeRoom.ticketTitle}</strong>
                      </p>
                    </div>

                    {activeRoom.partnerPhone && (
                      <a
                        href={`tel:${activeRoom.partnerPhone}`}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] text-white text-[11px] font-bold shadow-2xs"
                        title="Gọi điện trực tiếp"
                      >
                        <Phone className="w-3 h-3 text-[#FFD700]" />
                        {activeRoom.partnerPhone}
                      </a>
                    )}
                  </div>
                )}

                {/* Danh sách tin nhắn */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-neutral-50/50">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-neutral-400">
                      Đang giải mã cuộc trò chuyện bảo mật...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 px-4 text-center space-y-2">
                      <div className="w-11 h-11 rounded-full bg-red-50 text-[#B71C1C] border border-red-100 flex items-center justify-center mx-auto">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-800">
                        Trao đổi nhanh mã phiếu {activeRoom?.ticketCode} với{' '}
                        {activeRoom?.partnerName}
                      </p>
                      <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                        Hướng dẫn khắc phục nhanh từ xa mà không cần kiểm tra trực tiếp. Mọi tin
                        nhắn được mã hóa và tự động xóa khỏi CSDL sau 24 giờ.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                              isMine
                                ? 'bg-[#B71C1C] text-white rounded-br-xs'
                                : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-xs'
                            }`}
                          >
                            {!isMine && (
                              <p className="text-[10px] font-bold text-[#B71C1C] mb-0.5">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 px-1 text-[10px] text-neutral-400">
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span>{formatRemainingHours(msg.expiresAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Gợi ý mẫu câu phản hồi nhanh */}
                {showQuickReplies && (
                  <div className="px-3 py-2 bg-red-50/70 border-t border-red-100 space-y-1 max-h-36 overflow-y-auto shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#B71C1C] mb-1">
                      <span>Mẫu câu hỗ trợ từ xa nhanh</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(false)}
                        className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {quickReplies.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(undefined, tpl)}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-neutral-700 hover:text-[#B71C1C] border border-red-100 transition-colors cursor-pointer"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                )}

                {/* Ô nhập tin nhắn */}
                <form
                  onSubmit={(e) => handleSend(e)}
                  className="p-2.5 bg-white border-t border-neutral-200 flex items-center gap-1.5 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies((prev) => !prev)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                      showQuickReplies
                        ? 'bg-red-50 border-red-300 text-[#B71C1C]'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-red-50 hover:text-[#B71C1C]'
                    }`}
                    title="Mẫu câu xử lý nhanh từ xa"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Nhắn cho ${activeRoom?.partnerName || 'đối tác'} (${activeRoom?.ticketCode || ''})...`}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#B71C1C] focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="px-3.5 py-2 rounded-xl bg-[#B71C1C] hover:bg-[#7F0E0E] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>Gửi</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
