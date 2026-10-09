import express from 'express';
import { auditLogsController } from '../controllers/auditLogs.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', auditLogsController.list);

export default router;