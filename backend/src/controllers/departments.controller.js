import { departmentsService } from '../services/departments.service.js';

export const departmentsController = {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await departmentsService.list(req.query)) }); }
    catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try { res.json({ success: true, department: await departmentsService.getById(req.params.id) }); }
    catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      const department = await departmentsService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo phòng ban thành công', department });
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const department = await departmentsService.update(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Cập nhật thành công', department });
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { res.json(await departmentsService.remove(req.params.id, req.user)); }
    catch (err) { next(err); }
  },
};