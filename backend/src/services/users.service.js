import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';

const DEFAULT_PASSWORD = 'vks@2026';

export const usersService = {
  async list(filters = {}) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { deletedAt: null };
    if (filters.role) where.role = filters.role;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.active !== undefined) where.active = filters.active === 'true';
    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, fullName: true, email: true, phone: true,
          role: true, position: true, active: true, lastLoginAt: true,
          createdAt: true, departmentId: true,
          department: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { department: { select: { id: true, code: true, name: true } } },
    });
    if (!user || user.deletedAt) throw { status: 404, message: 'Không tìm thấy user' };
    const { passwordHash, ...safe } = user;
    return safe;
  },

  async create(data, currentUser) {
    const { username, password, fullName, email, phone, role, position, departmentId } = data;

    if (!username || !fullName || !role) {
      throw { status: 400, message: 'Thiếu username, họ tên hoặc vai trò' };
    }
    if (!['ADMIN', 'CUSTOMER', 'TECHNICAL'].includes(role)) {
      throw { status: 400, message: 'Vai trò không hợp lệ' };
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (existing) throw { status: 400, message: 'Username đã tồn tại' };

    if (email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) throw { status: 400, message: 'Email đã tồn tại' };
    }

    const passwordHash = await bcrypt.hash(password || DEFAULT_PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        email: email || null,
        phone: phone || null,
        role,
        position: position || null,
        departmentId: departmentId || null,
      },
      include: { department: { select: { id: true, code: true, name: true } } },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: user.id,
      newValue: { username, fullName, role },
      level: 'SECURITY',
    });

    const { passwordHash: _, ...safe } = user;
    return safe;
  },

  async update(id, data, currentUser) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw { status: 404, message: 'Không tìm thấy user' };
    }

    const updateData = {};
    const allowed = ['fullName', 'email', 'phone', 'role', 'position', 'departmentId', 'active'];
    allowed.forEach((f) => {
      if (data[f] !== undefined) updateData[f] = data[f];
    });

    if (data.password && data.password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { department: { select: { id: true, code: true, name: true } } },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      oldValue: { fullName: existing.fullName },
      newValue: updateData,
      level: 'INFO',
    });

    const { passwordHash, ...safe } = updated;
    return safe;
  },

  async remove(id, currentUser) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw { status: 404, message: 'Không tìm thấy user' };
    if (user.id === currentUser.id) throw { status: 400, message: 'Không thể xóa chính mình' };
    if (user.username === 'admin') throw { status: 400, message: 'Không thể xóa admin gốc' };

    const stamp = Date.now();
    await prisma.user.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
        username: `${user.username}__deleted_${stamp}`,
        email: user.email ? `${user.email}__deleted_${stamp}` : null,
      },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      oldValue: { username: user.username, fullName: user.fullName },
      level: 'SECURITY',
    });

    return { success: true, message: `Đã xóa tài khoản "${user.fullName}"` };
  },

  async toggleActive(id, currentUser) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw { status: 404, message: 'Không tìm thấy user' };
    if (user.id === currentUser.id) throw { status: 400, message: 'Không thể khóa chính mình' };
    if (user.username === 'admin') throw { status: 400, message: 'Không thể khóa admin gốc' };

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !user.active },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: updated.active ? 'UNLOCK_USER' : 'LOCK_USER',
      entityType: 'USER',
      entityId: id,
      level: 'SECURITY',
    });

    return {
      success: true,
      message: updated.active ? 'Đã mở khóa' : 'Đã khóa',
      active: updated.active,
    };
  },
};