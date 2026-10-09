import express from 'express';
import { usersController } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN'), usersController.list);
router.get('/:id', requireRole('ADMIN'), usersController.getById);
router.post('/', requireRole('ADMIN'), usersController.create);
router.put('/:id', requireRole('ADMIN'), usersController.update);
router.delete('/:id', requireRole('ADMIN'), usersController.remove);
router.patch('/:id/toggle-active', requireRole('ADMIN'), usersController.toggleActive);

export default router;