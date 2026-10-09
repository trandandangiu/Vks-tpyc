import { auditLogsService } from '../services/auditLogs.service.js';

export const auditLogsController = {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await auditLogsService.list(req.query)) }); }
    catch (err) { next(err); }
  },
};