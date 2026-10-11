import { ticketsService } from '../services/tickets.service.js';

export const ticketsController = {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await ticketsService.list(req.user, req.query)) }); }
    catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try { res.json({ success: true, ticket: await ticketsService.getById(req.params.id, req.user) }); }
    catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      const ticket = await ticketsService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo phiếu thành công', ticket });
    } catch (err) { next(err); }
  },
  // ✅ THÊM
  async update(req, res, next) {
    try {
      const ticket = await ticketsService.update(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Cập nhật phiếu thành công', ticket });
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try {
      res.json(await ticketsService.remove(req.params.id, req.user));
    } catch (err) { next(err); }
  },

  async assign(req, res, next) {
    try {
      const ticket = await ticketsService.assign(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Đã điều phối phiếu', ticket });
    } catch (err) { next(err); }
  },
  async process(req, res, next) {
    try {
      const ticket = await ticketsService.process(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Đã cập nhật xử lý', ticket });
    } catch (err) { next(err); }
  },
  async evaluate(req, res, next) {
    try {
      const ticket = await ticketsService.evaluate(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Đã gửi đánh giá', ticket });
    } catch (err) { next(err); }
  },
  async addReply(req, res, next) {
    try {
      const reply = await ticketsService.addReply(req.params.id, req.body, req.user);
      res.status(201).json({ success: true, reply });
    } catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try { res.json({ success: true, stats: await ticketsService.stats(req.user) }); }
    catch (err) { next(err); }
  },
};