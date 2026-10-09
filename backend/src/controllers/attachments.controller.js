import { attachmentsService } from '../services/attachments.service.js';
import fs from 'fs';

export const attachmentsController = {
  async upload(req, res, next) {
    try {
      const attachment = await attachmentsService.upload(
        req.params.id, req.file, req.body, req.user
      );
      res.status(201).json({ success: true, message: 'Upload thành công', attachment });
    } catch (err) { next(err); }
  },
  async list(req, res, next) {
    try {
      const attachments = await attachmentsService.list(req.params.id);
      res.json({ success: true, attachments });
    } catch (err) { next(err); }
  },
  async download(req, res, next) {
    try {
      const att = await attachmentsService.getForDownload(req.params.id);
      const isInline = req.query.inline === '1';
      const disposition = isInline ? 'inline' : 'attachment';
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename="${encodeURIComponent(att.fileName)}"`
      );
      res.setHeader('Content-Type', att.fileType);
      fs.createReadStream(att.filePath).pipe(res);
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { res.json(await attachmentsService.remove(req.params.id, req.user)); }
    catch (err) { next(err); }
  },
};