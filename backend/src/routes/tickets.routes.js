import express from 'express';
import { ticketsController } from '../controllers/tickets.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

const router = express.Router();
router.use(authenticate);

// ═══ STATS — đặt trước /:id ═══
router.get('/stats', ticketsController.stats);

// ═══ CRUD ═══
router.get('/', ticketsController.list);
router.post('/', requireRole('CUSTOMER'), ticketsController.create);
router.get('/:id', ticketsController.getById);

// ✅ THÊM: ADMIN sửa & xóa ticket
router.put('/:id', requireRole('ADMIN'), ticketsController.update);
router.delete('/:id', requireRole('ADMIN'), ticketsController.remove);

// ═══ Workflow ═══
router.post('/:id/assign', requireRole('ADMIN'), ticketsController.assign);
router.post('/:id/process', requireRole('TECHNICAL'), ticketsController.process);
router.post('/:id/evaluate', requireRole('CUSTOMER'), ticketsController.evaluate);
router.post('/:id/replies', ticketsController.addReply);

export default router;