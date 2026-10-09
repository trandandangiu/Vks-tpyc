import { authService } from '../services/auth.service.js';

export const authController = {
  async login(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const result = await authService.login({ ...req.body, ip });
      res.json(result);
    } catch (err) { next(err); }
  },
  async me(req, res, next) {
    try {
      const user = await authService.me(req.user.id);
      res.json({ success: true, user });
    } catch (err) { next(err); }
  },
  async logout(req, res) {
    res.json({ success: true, message: 'Đã đăng xuất' });
  },
  async changePassword(req, res, next) {
    try {
      const result = await authService.changePassword(
        req.user.id, req.body.oldPassword, req.body.newPassword
      );
      res.json(result);
    } catch (err) { next(err); }
  },
};