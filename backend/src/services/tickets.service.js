import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';
import { notifyRealtime } from './notification.helper.js';

async function generateCode() {
  const year = new Date().getFullYear();
  const prefix = `PYC-${year}-`;
  const last = await prisma.ticket.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const nextNum = last ? parseInt(last.code.split('-').pop()) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export const ticketsService = {
  async list(currentUser, filters = {}) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};

    if (currentUser.role === 'CUSTOMER') {
      where.creatorId = currentUser.id;
    } else if (currentUser.role === 'TECHNICAL') {
      if (filters.onlyMine === 'true') where.assigneeId = currentUser.id;
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.departmentId) where.departmentId = filters.departmentId;

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { creatorName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          supplies: true,
          _count: { select: { attachments: true, replies: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id, currentUser) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };

    if (currentUser.role === 'CUSTOMER' && ticket.creatorId !== currentUser.id) {
      throw { status: 403, message: 'Không có quyền xem phiếu này' };
    }

    return ticket;
  },

  async create(data, currentUser) {
    if (currentUser.role !== 'CUSTOMER') {
      throw { status: 403, message: 'Chỉ đơn vị (CUSTOMER) mới được tạo phiếu' };
    }

    const {
      title, description, category, priority,
      creatorName, creatorPhone, creatorPosition,
      supplies = [],
    } = data;

    if (!title || !category) {
      throw { status: 400, message: 'Thiếu tiêu đề hoặc loại sự cố' };
    }
    if (!currentUser.departmentId) {
      throw { status: 400, message: 'Tài khoản chưa được gán đơn vị' };
    }

    const dept = await prisma.department.findUnique({ where: { id: currentUser.departmentId } });
    const code = await generateCode();

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        priority: priority || 'NORMAL',
        status: 'NEW',
        creatorId: currentUser.id,
        creatorName: creatorName || currentUser.fullName,
        creatorPhone: creatorPhone || currentUser.phone,
        creatorPosition: creatorPosition || currentUser.position,
        departmentId: currentUser.departmentId,
        departmentName: dept?.name || '',
        supplies: supplies.length > 0 ? {
          create: supplies.map((s) => ({
            name: s.name,
            quantity: s.quantity || 1,
            unit: s.unit || 'Cái',
            note: s.note || null,
          })),
        } : undefined,
      },
      include: { supplies: true },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE_TICKET',
      entityType: 'TICKET',
      entityId: ticket.id,
      newValue: { code, title, priority },
      level: 'INFO',
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', active: true, deletedAt: null },
      select: { id: true },
    });
    notifyRealtime(admins.map((a) => a.id), {
      type: 'TICKET_NEW',
      title: '📋 Phiếu mới cần điều phối',
      content: `${ticket.code} — ${ticket.title}`,
      ticketId: ticket.id,
    });

    return ticket;
  },

  async assign(id, { assigneeId }, currentUser) {
    if (currentUser.role !== 'ADMIN') {
      throw { status: 403, message: 'Chỉ ADMIN được điều phối phiếu' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (ticket.status === 'DONE' || ticket.status === 'CANCELLED') {
      throw { status: 400, message: 'Phiếu đã kết thúc' };
    }

    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee || assignee.role !== 'TECHNICAL' || !assignee.active) {
      throw { status: 400, message: 'Người được gán phải là TECHNICAL đang hoạt động' };
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        assigneeId,
        assigneeName: assignee.fullName,
        dispatcherId: currentUser.id,
        dispatchedAt: new Date(),
        status: 'ASSIGNED',
      },
      include: { supplies: true },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'ASSIGN_TICKET',
      entityType: 'TICKET',
      entityId: id,
      newValue: { assigneeId, assigneeName: assignee.fullName },
      level: 'INFO',
    });

    notifyRealtime([assigneeId], {
      type: 'TICKET_ASSIGNED',
      title: '🎯 Bạn được giao phiếu mới',
      content: `${ticket.code} — ${ticket.title}`,
      ticketId: id,
    });
    notifyRealtime([ticket.creatorId], {
      type: 'TICKET_STATUS',
      title: '✅ Phiếu đã được điều phối',
      content: `${ticket.code} đã được giao cho ${assignee.fullName}`,
      ticketId: id,
    });

    return updated;
  },

  async process(id, data, currentUser) {
    if (currentUser.role !== 'TECHNICAL') {
      throw { status: 403, message: 'Chỉ TECHNICAL mới cập nhật xử lý' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (ticket.assigneeId !== currentUser.id) {
      throw { status: 403, message: 'Bạn không được gán phiếu này' };
    }
    if (ticket.status === 'DONE' || ticket.status === 'CANCELLED') {
      throw { status: 400, message: 'Phiếu đã kết thúc' };
    }

    const { status, scheduledAt, processNote, supplies } = data;
    const updateData = {};

    if (status && ['ASSIGNED', 'PROCESSING', 'WAITING_SUPPLY', 'DONE'].includes(status)) {
      updateData.status = status;
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (processNote !== undefined) updateData.processNote = processNote;
    if (status === 'DONE' && !ticket.completedAt) {
      updateData.completedAt = new Date();
    }

    if (Array.isArray(supplies)) {
      await prisma.ticketSupply.deleteMany({ where: { ticketId: id } });
      if (supplies.length > 0) {
        await prisma.ticketSupply.createMany({
          data: supplies.map((s) => ({
            ticketId: id,
            name: s.name,
            quantity: s.quantity || 1,
            unit: s.unit || 'Cái',
            note: s.note || null,
          })),
        });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: { supplies: true },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'PROCESS_TICKET',
      entityType: 'TICKET',
      entityId: id,
      newValue: updateData,
      level: 'INFO',
    });

    if (status && status !== ticket.status) {
      const statusLabel = {
        PROCESSING: 'đang xử lý',
        WAITING_SUPPLY: 'đang chờ vật tư',
        DONE: 'đã hoàn thành',
        ASSIGNED: 'đã được điều phối',
      }[status] || status;

      notifyRealtime([ticket.creatorId], {
        type: 'TICKET_STATUS',
        title: `📢 Phiếu ${ticket.code} ${statusLabel}`,
        content: status === 'DONE'
          ? 'Vui lòng vào đánh giá chất lượng dịch vụ!'
          : 'Kỹ thuật viên đã cập nhật trạng thái',
        ticketId: id,
      });
    }

    return updated;
  },

  async evaluate(id, { rating, feedback }, currentUser) {
    if (currentUser.role !== 'CUSTOMER') {
      throw { status: 403, message: 'Chỉ đơn vị tạo phiếu mới được đánh giá' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (ticket.creatorId !== currentUser.id) {
      throw { status: 403, message: 'Bạn không phải chủ phiếu này' };
    }
    if (ticket.status !== 'DONE') {
      throw { status: 400, message: 'Chỉ đánh giá được phiếu đã hoàn thành' };
    }
    if (ticket.rating) {
      throw { status: 400, message: 'Phiếu đã được đánh giá' };
    }
    if (!rating || rating < 1 || rating > 5) {
      throw { status: 400, message: 'Đánh giá phải từ 1 đến 5 sao' };
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { rating, feedback: feedback?.trim() || null, ratedAt: new Date() },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'EVALUATE_TICKET',
      entityType: 'TICKET',
      entityId: id,
      newValue: { rating, feedback },
      level: 'INFO',
    });

    return updated;
  },

  async addReply(id, { content }, currentUser) {
    if (!content?.trim()) throw { status: 400, message: 'Nội dung trả lời không được trống' };

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };

    if (currentUser.role === 'CUSTOMER' && ticket.creatorId !== currentUser.id) {
      throw { status: 403, message: 'Không có quyền' };
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        content: content.trim(),
      },
    });

    return reply;
  },

  async stats(currentUser) {
    const where = {};
    if (currentUser.role === 'CUSTOMER') where.creatorId = currentUser.id;
    else if (currentUser.role === 'TECHNICAL') where.assigneeId = currentUser.id;

    const all = await prisma.ticket.findMany({
      where,
      select: { status: true, rating: true, priority: true, createdAt: true, completedAt: true },
    });

    const total = all.length;
    const byStatus = {
      NEW: 0, ASSIGNED: 0, PROCESSING: 0, WAITING_SUPPLY: 0, DONE: 0, CANCELLED: 0,
    };
    all.forEach((t) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });

    const rated = all.filter((t) => t.rating);
    const avgRating = rated.length > 0
      ? rated.reduce((s, t) => s + t.rating, 0) / rated.length
      : 0;

    return {
      total,
      byStatus,
      avgRating: Math.round(avgRating * 10) / 10,
      ratedCount: rated.length,
    };
  },

    // ✅ THÊM MỚI: ADMIN cập nhật ticket
  async update(id, data, currentUser) {
    if (currentUser.role !== 'ADMIN') {
      throw { status: 403, message: 'Chỉ ADMIN mới được sửa phiếu' };
    }

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Không tìm thấy phiếu' };

    const {
      title, description, category, priority, status,
      creatorName, creatorPhone, creatorPosition,
      assigneeId, scheduledAt, processNote,
    } = data;

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (creatorName !== undefined) updateData.creatorName = creatorName;
    if (creatorPhone !== undefined) updateData.creatorPhone = creatorPhone;
    if (creatorPosition !== undefined) updateData.creatorPosition = creatorPosition;
    if (processNote !== undefined) updateData.processNote = processNote;

    // Nếu đổi assignee
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        updateData.assigneeId = null;
        updateData.assigneeName = null;
      } else {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (!assignee || assignee.role !== 'TECHNICAL') {
          throw { status: 400, message: 'Người được gán phải là TECHNICAL' };
        }
        updateData.assigneeId = assigneeId;
        updateData.assigneeName = assignee.fullName;
      }
    }

    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    // Nếu status → DONE thì set completedAt
    if (status === 'DONE' && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: { supplies: true },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE_TICKET',
      entityType: 'TICKET',
      entityId: id,
      oldValue: { code: existing.code, title: existing.title, status: existing.status },
      newValue: updateData,
      level: 'INFO',
    });

    return updated;
  },

  // ✅ THÊM MỚI: ADMIN xóa ticket (soft delete ở đây là xóa thật, cascade xóa supplies/attachments/replies)
  async remove(id, currentUser) {
    if (currentUser.role !== 'ADMIN') {
      throw { status: 403, message: 'Chỉ ADMIN mới được xóa phiếu' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };

    // Xóa file vật lý của attachments trước
    try {
      const attachments = await prisma.ticketAttachment.findMany({ where: { ticketId: id } });
      const fs = await import('fs');
      for (const att of attachments) {
        try { fs.unlinkSync(att.filePath); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('Lỗi xóa file attachments:', e.message);
    }

    // Xóa ticket (cascade sẽ tự xóa supplies, attachments, replies)
    await prisma.ticket.delete({ where: { id } });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'DELETE_TICKET',
      entityType: 'TICKET',
      entityId: id,
      oldValue: { code: ticket.code, title: ticket.title, status: ticket.status },
      level: 'SECURITY',
    });

    return { success: true, message: `Đã xóa phiếu [${ticket.code}]` };
  },

};