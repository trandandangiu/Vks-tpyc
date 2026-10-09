import express from 'express';
import { departmentsController } from '../controllers/departments.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

const router = express.Router();
router.use(authenticate);

router.get('/', departmentsController.list);
router.get('/:id', departmentsController.getById);
router.post('/', requireRole('ADMIN'), departmentsController.create);
router.put('/:id', requireRole('ADMIN'), departmentsController.update);
router.delete('/:id', requireRole('ADMIN'), departmentsController.remove);

export default router;