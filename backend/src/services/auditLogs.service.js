import prisma from '../config/prisma.js';

export const auditLogsService = {
  async create(data) {
    try {
      return await prisma.auditLog.create({ data });
    } catch (err) {
      console.error('❌ Lỗi audit log:', err.message);
      return null;
    }
  },

  async list(filters = {}) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.level) where.level = filters.level;
    if (filters.entityType) where.entityType = filters.entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
};