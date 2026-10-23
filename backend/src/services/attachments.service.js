import prisma from '../config/prisma.js';
import fs from 'fs';

export const attachmentsService = {
  async upload(ticketId, file, { stage = 'BEFORE' }, currentUser) {
    if (!file) throw { status: 400, message: 'Chưa chọn file' };

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw { status: 404, message: 'Không tìm thấy phiếu' };

    if (currentUser.role === 'CUSTOMER' && ticket.creatorId !== currentUser.id) {
      throw { status: 403, message: 'Không có quyền' };
    }

    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        stage,
        uploadedBy: currentUser.id,
      },
    });

    return attachment;
  },

  async list(ticketId) {
    return prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: 'asc' },
    });
  },

  async getForDownload(attachmentId) {
    const att = await prisma.ticketAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw { status: 404, message: 'Không tìm thấy file' };
    if (!fs.existsSync(att.filePath)) {
      throw { status: 404, message: 'File không tồn tại trên server' };
    }
    return att;
  },

  async remove(attachmentId, currentUser) {
    const att = await prisma.ticketAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw { status: 404, message: 'Không tìm thấy file' };

    if (att.uploadedBy !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'TECHNICAL') {
      throw { status: 403, message: 'Không có quyền xóa file này' };
    }

    try { fs.unlinkSync(att.filePath); } catch (e) { /* ignore */ }
    await prisma.ticketAttachment.delete({ where: { id: attachmentId } });

    return { success: true, message: 'Đã xóa file' };
  },
};