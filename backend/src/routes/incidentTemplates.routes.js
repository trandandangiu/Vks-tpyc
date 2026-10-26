import express from 'express';
import { incidentTemplatesController } from '../controllers/incidentTemplates.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

const router = express.Router();
router.use(authenticate);

// Tất cả người dùng đã đăng nhập đều có thể lấy danh sách sự cố thường gặp để tạo phiếu
router.get('/', incidentTemplatesController.list);

// ADMIN (và TECHNICAL) có thể thêm / sửa / xóa danh mục sự cố thường gặp
router.post('/', requireRole('ADMIN', 'TECHNICAL'), incidentTemplatesController.create);
router.put('/:id', requireRole('ADMIN', 'TECHNICAL'), incidentTemplatesController.update);
router.delete('/:id', requireRole('ADMIN', 'TECHNICAL'), incidentTemplatesController.remove);

export default router;
