import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';
import { deviceIpsService } from '../services/deviceIps.service.js';

const router = express.Router();

router.use(authenticate);

// Lấy danh sách thiết bị & IP
router.get('/', requireRole('TECHNICAL', 'ADMIN'), async (req, res, next) => {
  try {
    const records = await deviceIpsService.list(req.query);
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
});

// Thêm mới thiết bị & IP
router.post('/', requireRole('TECHNICAL', 'ADMIN'), async (req, res, next) => {
  try {
    const record = await deviceIpsService.create(req.body, req.user);
    res.status(201).json({ success: true, record, message: 'Đã thêm dữ liệu thiết bị & IP' });
  } catch (err) {
    next(err);
  }
});

// Cập nhật thiết bị & IP
router.put('/:id', requireRole('TECHNICAL', 'ADMIN'), async (req, res, next) => {
  try {
    const record = await deviceIpsService.update(req.params.id, req.body, req.user);
    res.json({ success: true, record, message: 'Đã cập nhật dữ liệu thiết bị & IP' });
  } catch (err) {
    next(err);
  }
});

// Xóa cứng thiết bị & IP khỏi DB
router.delete('/:id', requireRole('TECHNICAL', 'ADMIN'), async (req, res, next) => {
  try {
    const result = await deviceIpsService.remove(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
