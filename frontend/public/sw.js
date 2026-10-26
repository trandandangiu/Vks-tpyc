// Service Worker cho Hệ Thống Phiếu Yêu Cầu Kỹ Thuật (PWA Desktop & Thông báo)
const CACHE_NAME = 'vks-ticket-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Hỗ trợ PWA installable criteria (fetch handler)
self.addEventListener('fetch', (event) => {
  // Luôn ưu tiên kết nối mạng trực tiếp tới Database / API
  return;
});

// Khi người dùng bấm vào thông báo trên màn hình Desktop / Điện thoại
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
