import { usersService } from '../services/users.service.js';

export const usersController = {
  async list(req, res, next) {
    try { res.json({ success: true, ...(await usersService.list(req.query)) }); }
    catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try { res.json({ success: true, user: await usersService.getById(req.params.id) }); }
    catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      const user = await usersService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', user });
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const user = await usersService.update(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Cập nhật thành công', user });
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { res.json(await usersService.remove(req.params.id, req.user)); }
    catch (err) { next(err); }
  },
  async toggleActive(req, res, next) {
    try { res.json(await usersService.toggleActive(req.params.id, req.user)); }
    catch (err) { next(err); }
  },
};