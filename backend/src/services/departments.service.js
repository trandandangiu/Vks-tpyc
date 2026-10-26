import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';

export const departmentsService = {
  async list(filters = {}) {
    const where = {};
    if (filters.active !== undefined) where.active = filters.active === 'true';
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { _count: { select: { users: true, tickets: true } } },
    });

    return { departments };
  },

  async getById(id) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: { users: { select: { id: true, username: true, fullName: true, role: true } } },
    });
    if (!dept) throw { status: 404, message: 'Không tìm thấy phòng ban' };
    return dept;
  },

  async create(data, currentUser) {
    const { code, name, description } = data; // <-- Thêm description vào đây
    if (!code || !name) throw { status: 400, message: 'Thiếu mã hoặc tên phòng' };

    const existing = await prisma.department.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) throw { status: 400, message: `Mã phòng "${code}" đã tồn tại` };

    const dept = await prisma.department.create({
      data: { code: code.trim().toUpperCase(), name: name.trim(), description: description?.trim() || null },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      newValue: { code, name, description },
      level: 'INFO',
    });

    return dept;
  },

  async update(id, data, currentUser) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Không tìm thấy phòng ban' };

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;   // ✅ thêm
    if (data.active !== undefined) updateData.active = data.active;

    const dept = await prisma.department.update({ where: { id }, data: updateData });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: id,
      newValue: updateData,
      level: 'INFO',
    });

    return dept;
  },

  async remove(id, currentUser) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true, tickets: true } } },
    });
    if (!dept) throw { status: 404, message: 'Không tìm thấy phòng ban' };

    // Gỡ liên kết đơn vị của các user thuộc phòng ban này
    if (dept._count.users > 0) {
      await prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      });
    }

    // Xóa các phiếu thuộc phòng ban này (nếu có) trước khi xóa cứng phòng ban
    if (dept._count.tickets > 0) {
      await prisma.ticket.deleteMany({
        where: { departmentId: id },
      });
    }

    // Xóa cứng (Hard Delete) phòng ban khỏi CSDL
    await prisma.department.delete({ where: { id } });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'HARD_DELETE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: id,
      oldValue: { code: dept.code, name: dept.name },
      level: 'SECURITY',
    });

    return { success: true, message: `Đã xóa vĩnh viễn đơn vị "${dept.name}" khỏi CSDL` };
  },
};