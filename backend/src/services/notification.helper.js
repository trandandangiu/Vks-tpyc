import { sseService } from './sse.service.js';

export function notifyRealtime(userIds, eventData) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;

  setImmediate(() => {
    try {
      sseService.sendToUsers(userIds, 'notification', {
        id: `notif-${Date.now()}`,
        ...eventData,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('❌ Lỗi SSE:', err.message);
    }
  });
}