import { sseService } from './sse.service.js';
import { notificationsService } from './notifications.service.js';

export function notifyRealtime(userIds, eventData) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;

  setImmediate(async () => {
    try {
      const savedList = await notificationsService.createManyForUsers(userIds, eventData);
      if (savedList.length > 0) {
        for (const item of savedList) {
          sseService.sendToUser(item.userId, 'notification', item);
        }
      } else {
        sseService.sendToUsers(userIds, 'notification', {
          id: `notif-${Date.now()}`,
          ...eventData,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('❌ Lỗi gửi thông báo:', err.message);
    }
  });
}