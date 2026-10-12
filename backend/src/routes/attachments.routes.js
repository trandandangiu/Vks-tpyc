import express from 'express';
import { attachmentsController } from '../controllers/attachments.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../config/multer.js';

const router = express.Router();

// Upload — cần login
router.post(
  '/tickets/:id/attachments',
  authenticate,
  upload.single('file'),
  attachmentsController.upload
);

// List — cần login
router.get(
  '/tickets/:id/attachments',
  authenticate,
  attachmentsController.list
);


router.get(
  '/attachments/:id/download',
  authenticate, // <-- Chỉ cần gọi một lần
  attachmentsController.download
);

// Delete
router.delete(
  '/attachments/:id',
  authenticate,
  attachmentsController.remove
);

export default router;