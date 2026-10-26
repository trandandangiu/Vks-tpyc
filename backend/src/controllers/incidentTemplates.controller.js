import { incidentTemplatesService } from '../services/incidentTemplates.service.js';

export const incidentTemplatesController = {
  async list(req, res, next) {
    try {
      const templates = await incidentTemplatesService.list(req.query);
      res.json({ success: true, templates });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const template = await incidentTemplatesService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Đã thêm sự cố mới', template });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const template = await incidentTemplatesService.update(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Đã cập nhật sự cố', template });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await incidentTemplatesService.remove(req.params.id, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
