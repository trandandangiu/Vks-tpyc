import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';
import { notifyRealtime } from './notification.helper.js';

async function generateCode() {
  const year = new Date().getFullYear();
  const prefix = `PYC-${year}-`;
  const existingCodes = await prisma.ticket.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let maxNum = 0;
  for (const item of existingCodes) {
    const num = parseInt(item.code.split('-').pop(), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

function isCustomerAuthorizedForTicket(ticket, currentUser) {
  if (!ticket || !currentUser) return false;
  if (ticket.creatorId === currentUser.id) return true;
  if (currentUser.departmentId && ticket.departmentId === currentUser.departmentId) return true;
  return false;
}

export const ticketsService = {
  async list(currentUser, filters = {}) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};

    if (currentUser.role === 'CUSTOMER') {
      if (currentUser.departmentId) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { creatorId: currentUser.id },
              { departmentId: currentUser.departmentId },
            ],
          },
        ];
      } else {
        where.creatorId = currentUser.id;
      }
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
          attachments: { orderBy: { uploadedAt: 'asc' } },
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

    if (currentUser.role === 'CUSTOMER' && !isCustomerAuthorizedForTicket(ticket, currentUser)) {
      throw { status: 403, message: 'Không có quyền xem phiếu này' };
    }

    return ticket;
  },

  async create(data, currentUser) {
    const {
      title, description, category, priority,
      creatorName, creatorPhone, creatorPosition,
      departmentId: payloadDeptId,
      supplies = [],
    } = data;

    if (!title || !category) {
      throw { status: 400, message: 'Thiếu tiêu đề hoặc loại sự cố' };
    }

    if (currentUser.role === 'TECHNICAL' && !payloadDeptId) {
      throw { status: 400, message: 'Vui lòng chọn phòng ban / đơn vị cần tạo phiếu' };
    }

    const targetDeptId = payloadDeptId || currentUser.departmentId;
    let dept = targetDeptId
      ? await prisma.department.findUnique({ where: { id: targetDeptId } })
      : await prisma.department.findFirst({ where: { active: true } });

    if (!dept) {
      throw { status: 400, message: 'Tài khoản chưa được gán đơn vị hợp lệ' };
    }

    // Khi TECHNICAL hoặc ADMIN tạo phiếu theo phòng ban, tìm tài khoản CUSTOMER đại diện phòng ban đó
    // để phiếu nhảy thẳng về trang của phòng đó phục vụ theo dõi & đánh giá KPI
    let deptCustomer = null;
    if (currentUser.role === 'TECHNICAL' || currentUser.role === 'ADMIN') {
      deptCustomer = await prisma.user.findFirst({
        where: {
          departmentId: dept.id,
          role: 'CUSTOMER',
          active: true,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!deptCustomer) {
        deptCustomer = await prisma.user.findFirst({
          where: {
            departmentId: dept.id,
            active: true,
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
        });
      }
    }

    const isCreatedByTech = currentUser.role === 'TECHNICAL';
    const resolvedCreatorId =
      (currentUser.role === 'TECHNICAL' || currentUser.role === 'ADMIN') && deptCustomer
        ? deptCustomer.id
        : currentUser.id;
    const resolvedCreatorName =
      creatorName?.trim() ||
      (deptCustomer
        ? deptCustomer.fullName
        : currentUser.role === 'CUSTOMER'
          ? currentUser.fullName
          : dept.name);
    const resolvedCreatorPhone =
      creatorPhone?.trim() ||
      (deptCustomer
        ? deptCustomer.phone
        : currentUser.role === 'CUSTOMER'
          ? currentUser.phone
          : null);
    const resolvedCreatorPosition =
      creatorPosition ||
      (deptCustomer
        ? deptCustomer.position
        : currentUser.role === 'CUSTOMER'
          ? currentUser.position
          : null);

    const code = await generateCode();

    const ticket = await prisma.ticket.create({
      data: {
        code,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        priority: priority || 'NORMAL',
        status: isCreatedByTech ? 'ASSIGNED' : 'NEW',
        creatorId: resolvedCreatorId,
        creatorName: resolvedCreatorName,
        creatorPhone: resolvedCreatorPhone,
        creatorPosition: resolvedCreatorPosition,
        departmentId: dept.id,
        departmentName: dept.name || '',
        assigneeId: isCreatedByTech ? currentUser.id : null,
        assigneeName: isCreatedByTech ? currentUser.fullName : null,
        dispatcherId: isCreatedByTech ? currentUser.id : null,
        dispatchedAt: isCreatedByTech ? new Date() : null,
        supplies: supplies.length > 0 ? {
          create: supplies.map((s) => ({
            name: s.name,
            quantity: s.quantity || 1,
            unit: s.unit || 'Cái',
            note: s.note || null,
          })),
        } : undefined,
      },
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
      },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE_TICKET',
      entityType: 'TICKET',
      entityId: ticket.id,
      newValue: { code, title, priority, departmentId: dept.id, departmentName: dept.name },
      level: 'INFO',
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', active: true, deletedAt: null },
      select: { id: true },
    });
    const adminIds = admins.map((a) => a.id).filter((aid) => aid !== currentUser.id);
    if (adminIds.length > 0) {
      notifyRealtime(adminIds, {
        type: 'TICKET_NEW',
        title: isCreatedByTech
          ? `📋 KTV ${currentUser.fullName} tạo phiếu cho ${dept.name}`
          : '📋 Phiếu mới cần điều phối',
        content: `${ticket.code} — ${ticket.title}`,
        ticketId: ticket.id,
      });
    }

    // Thông báo trực tiếp đến các tài khoản của phòng ban đó để hiện ngay trên trang của phòng
    if (currentUser.role === 'TECHNICAL' || currentUser.role === 'ADMIN') {
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: dept.id, active: true, deletedAt: null },
        select: { id: true },
      });
      const deptUserIds = deptUsers.map((u) => u.id).filter((uid) => uid !== currentUser.id);
      if (deptUserIds.length > 0) {
        notifyRealtime(deptUserIds, {
          type: 'TICKET_NEW',
          title: `📋 Phiếu hỗ trợ mới cho ${dept.name}`,
          content: `${ticket.code} — ${ticket.title} (KTV: ${currentUser.fullName})`,
          ticketId: ticket.id,
        });
      }
    }

    return ticket;
  },

  async assign(id, { assigneeId, scheduledAt }, currentUser) {
    if (currentUser.role !== 'ADMIN') {
      throw { status: 403, message: 'Chỉ ADMIN được điều phối phiếu' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (ticket.status === 'DONE' || ticket.status === 'CANCELLED') {
      throw { status: 400, message: 'Phiếu đã kết thúc' };
    }

    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee || !assignee.active) {
      throw { status: 400, message: 'Người được gán không tồn tại hoặc đang bị khóa' };
    }

    const updateData = {
      assigneeId,
      assigneeName: assignee.fullName,
      dispatcherId: currentUser.id,
      dispatchedAt: new Date(),
      status: 'ASSIGNED',
    };
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
      },
    });

    await auditLogsService.create({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'ASSIGN_TICKET',
      entityType: 'TICKET',
      entityId: id,
      newValue: { assigneeId, assigneeName: assignee.fullName, scheduledAt: updateData.scheduledAt },
      level: 'INFO',
    });

    notifyRealtime([assigneeId], {
      type: 'TICKET_ASSIGNED',
      title: '🎯 Bạn được giao phiếu mới',
      content: `${ticket.code} — ${ticket.title}`,
      ticketId: id,
    });

    const deptUsers = await prisma.user.findMany({
      where: { departmentId: ticket.departmentId, role: 'CUSTOMER', active: true, deletedAt: null },
      select: { id: true },
    });
    const customerTargets = [...new Set([ticket.creatorId, ...deptUsers.map((u) => u.id)])];
    notifyRealtime(customerTargets, {
      type: 'TICKET_STATUS',
      title: '✅ Phiếu đã được điều phối',
      content: `${ticket.code} đã được giao cho ${assignee.fullName}`,
      ticketId: id,
    });

    return updated;
  },

  async process(id, data, currentUser) {
    if (currentUser.role !== 'TECHNICAL' && currentUser.role !== 'ADMIN') {
      throw { status: 403, message: 'Chỉ TECHNICAL hoặc ADMIN mới cập nhật xử lý' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (ticket.status === 'CANCELLED' && currentUser.role !== 'ADMIN') {
      throw { status: 400, message: 'Phiếu đã hủy không thể xử lý' };
    }

    const { status, scheduledAt, processNote, supplies } = data;
    const updateData = {};

    if (!ticket.assigneeId && currentUser.role === 'TECHNICAL') {
      updateData.assigneeId = currentUser.id;
      updateData.assigneeName = currentUser.fullName;
    }

    if (status && ['ASSIGNED', 'PROCESSING', 'WAITING_SUPPLY', 'DONE'].includes(status)) {
      updateData.status = status;
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (processNote !== undefined) updateData.processNote = processNote;
    if (status === 'DONE' && !ticket.completedAt) {
      updateData.completedAt = new Date();
    } else if (status && status !== 'DONE' && ticket.completedAt) {
      updateData.completedAt = null;
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
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
      },
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

      // Thông báo cho User tạo phiếu và các tài khoản thuộc phòng ban của phiếu
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: ticket.departmentId, role: 'CUSTOMER', active: true, deletedAt: null },
        select: { id: true },
      });
      const customerIds = [...new Set([ticket.creatorId, ...deptUsers.map((u) => u.id)])].filter(
        (uid) => uid !== currentUser.id
      );
      if (customerIds.length > 0) {
        notifyRealtime(customerIds, {
          type: 'TICKET_STATUS',
          title: `📢 Phiếu ${ticket.code} ${statusLabel}`,
          content: status === 'DONE'
            ? `Phiếu "${ticket.title}" đã hoàn thành. Vui lòng đánh giá chất lượng xử lý!`
            : `Kỹ thuật viên ${currentUser.fullName} đã cập nhật: ${statusLabel}`,
          ticketId: id,
        });
      }

      // Thông báo cho các Admin biết tiến độ kỹ thuật viên xử lý
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', active: true },
        select: { id: true },
      });
      const adminIds = admins.map((a) => a.id).filter((aid) => aid !== currentUser.id);
      if (adminIds.length > 0) {
        notifyRealtime(adminIds, {
          type: 'TICKET_STATUS',
          title: `🔧 Cập nhật phiếu ${ticket.code}`,
          content: `${currentUser.fullName} chuyển trạng thái sang "${statusLabel}"`,
          ticketId: id,
        });
      }
    }

    return updated;
  },

  async evaluate(id, { rating, feedback }, currentUser) {
    if (!['CUSTOMER', 'ADMIN', 'TECHNICAL'].includes(currentUser.role)) {
      throw { status: 403, message: 'Không có quyền đánh giá phiếu' };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };
    if (currentUser.role === 'CUSTOMER' && !isCustomerAuthorizedForTicket(ticket, currentUser)) {
      throw { status: 403, message: 'Bạn không thuộc đơn vị của phiếu này' };
    }
    if (ticket.status === 'CANCELLED') {
      throw { status: 400, message: 'Không thể đánh giá phiếu đã hủy' };
    }
    if (!rating || rating < 1 || rating > 5) {
      throw { status: 400, message: 'Đánh giá phải từ 1 đến 5 sao' };
    }

    const evalUpdateData = {
      rating,
      feedback: feedback?.trim() || null,
      ratedAt: new Date(),
    };
    if (ticket.status !== 'DONE') {
      evalUpdateData.status = 'DONE';
      evalUpdateData.completedAt = ticket.completedAt || new Date();
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: evalUpdateData,
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
      },
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

    // Thông báo cho Admin và Kỹ thuật viên phụ trách khi User đánh giá phiếu
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true },
    });
    const targetIds = new Set(admins.map((a) => a.id));
    if (ticket.assigneeId) targetIds.add(ticket.assigneeId);
    targetIds.delete(currentUser.id);

    notifyRealtime([...targetIds], {
      type: 'TICKET_RATED',
      title: `⭐ Đánh giá ${rating} sao cho phiếu ${ticket.code}`,
      content: `${currentUser.fullName} vừa đánh giá phiếu "${ticket.title}"`,
      ticketId: id,
    });

    return updated;
  },

  async addReply(id, { content }, currentUser) {
    if (!content?.trim()) throw { status: 400, message: 'Nội dung trả lời không được trống' };

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };

    if (currentUser.role === 'CUSTOMER' && !isCustomerAuthorizedForTicket(ticket, currentUser)) {
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
    if (currentUser.role === 'CUSTOMER') {
      if (currentUser.departmentId) {
        where.OR = [
          { creatorId: currentUser.id },
          { departmentId: currentUser.departmentId },
        ];
      } else {
        where.creatorId = currentUser.id;
      }
    } else if (currentUser.role === 'TECHNICAL') {
      where.assigneeId = currentUser.id;
    }

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
      include: {
        supplies: true,
        attachments: { orderBy: { uploadedAt: 'asc' } },
      },
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
