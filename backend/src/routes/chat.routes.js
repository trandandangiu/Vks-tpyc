import express from 'express';
import * as chatService from '../services/chat.service.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();
router.use(authenticate);

// Danh sách các cuộc hội thoại (phiếu đã được điều phối) của Technical hoặc Customer
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await chatService.listRooms(req.user);
    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
});

// Lấy lịch sử tin nhắn của 1 phiếu (chỉ lưu trong 24h)
router.get('/rooms/:ticketId/messages', async (req, res, next) => {
  try {
    const data = await chatService.listMessages(req.params.ticketId, req.user);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// Gửi tin nhắn mới trong phòng hội thoại của phiếu
router.post('/rooms/:ticketId/messages', async (req, res, next) => {
  try {
    const message = await chatService.sendMessage(req.params.ticketId, req.body.content, req.user);
    res.status(201).json({ success: true, message, info: 'Đã gửi tin nhắn bảo mật' });
  } catch (err) {
    next(err);
  }
});

// Xóa cứng đoạn hội thoại của phiếu ngay lập tức
router.delete('/rooms/:ticketId/messages', async (req, res, next) => {
  try {
    const result = await chatService.clearTicketMessages(req.params.ticketId, req.user);
    res.json({ success: true, ...result, message: 'Đã xóa vĩnh viễn đoạn hội thoại khỏi CSDL' });
  } catch (err) {
    next(err);
  }
});

export default router;
