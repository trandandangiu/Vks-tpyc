import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';

export const authService = {
  async login({ username, password, ip }) {
    if (!username || !password) {
      throw { status: 400, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' };
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { department: { select: { id: true, code: true, name: true } } },
    });

    if (!user || user.deletedAt) {
      throw { status: 401, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
    }
    if (!user.active) {
      throw { status: 403, message: 'Tài khoản đã bị khóa' };
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      await auditLogsService.create({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: ip,
        level: 'SECURITY',
      });
      throw { status: 401, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await auditLogsService.create({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: ip,
      level: 'INFO',
    });

    const { passwordHash, ...safe } = user;
    return { success: true, user: safe, token };
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: { select: { id: true, code: true, name: true } } },
    });
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };
    const { passwordHash, ...safe } = user;
    return safe;
  },

  async changePassword(userId, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw { status: 400, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' };
    }
    if (newPassword.length < 6) {
      throw { status: 400, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) throw { status: 401, message: 'Mật khẩu hiện tại không chính xác' };

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await auditLogsService.create({
      userId,
      userName: user.fullName,
      userRole: user.role,
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: userId,
      level: 'SECURITY',
    });

    return { success: true, message: 'Đổi mật khẩu thành công' };
  },
};