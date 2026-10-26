import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { notificationsService } from '../services/notifications.service.js';

const router = express.Router();

router.use(authenticate);

// Lấy danh sách thông báo của user hiện tại từ DB
router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationsService.listByUser(
      req.user.id,
      req.query.limit || 50
    );
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// Đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'Đã đánh dấu đọc tất cả' });
  } catch (err) {
    next(err);
  }
});

// Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', async (req, res, next) => {
  try {
    await notificationsService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Xóa cứng toàn bộ thông báo của user
router.delete('/', async (req, res, next) => {
  try {
    await notificationsService.clearAll(req.user.id);
    res.json({ success: true, message: 'Đã xóa toàn bộ thông báo khỏi CSDL' });
  } catch (err) {
    next(err);
  }
});

// Xóa cứng 1 thông báo
router.delete('/:id', async (req, res, next) => {
  try {
    await notificationsService.remove(req.params.id, req.user.id);
    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (err) {
    next(err);
  }
});

export default router;
