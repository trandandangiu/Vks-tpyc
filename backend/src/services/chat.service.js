import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { sseService } from './sse.service.js';

// Khóa mã hóa AES-256-GCM bảo mật hội thoại trong CSDL
const SECRET_SOURCE = process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'vks-private-chat-aes256-secret-key-2026';
const AES_KEY = crypto.createHash('sha256').update(String(SECRET_SOURCE)).digest();

function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(payload) {
  try {
    const parts = String(payload || '').split(':');
    if (parts.length !== 3) return '[Tin nhắn bảo mật]';
    const [ivHex, tagHex, contentHex] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      AES_KEY,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(contentHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '[Không thể giải mã tin nhắn]';
  }
}

let tableInitialized = false;
let cleanupTimerStarted = false;

async function ensureTable() {
  if (!tableInitialized) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "chat_messages" (
          "id" TEXT NOT NULL,
          "ticket_id" TEXT NOT NULL,
          "sender_id" TEXT NOT NULL,
          "sender_name" TEXT NOT NULL,
          "sender_role" TEXT NOT NULL,
          "recipient_id" TEXT NOT NULL,
          "encrypted_content" TEXT NOT NULL,
          "is_read" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
          CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "chat_messages_ticket_id_idx" ON "chat_messages"("ticket_id");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "chat_messages_expires_at_idx" ON "chat_messages"("expires_at");
      `);
      tableInitialized = true;
    } catch (err) {
      console.error('Lỗi khởi tạo bảng chat_messages:', err);
    }
  }

  if (!cleanupTimerStarted) {
    cleanupTimerStarted = true;
    // Tự động xóa cứng tin nhắn quá hạn 24h mỗi 5 phút
    setInterval(() => {
      purgeExpiredMessages().catch(() => {});
    }, 5 * 60 * 1000);
  }
}

/**
 * Xóa cứng (Hard Delete) toàn bộ tin nhắn đã quá 24 giờ trong CSDL
 */
export async function purgeExpiredMessages() {
  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "chat_messages"
      WHERE "expires_at" <= NOW()
         OR "created_at" <= NOW() - INTERVAL '24 hours'
    `);
  } catch (err) {
    console.error('Lỗi dọn dẹp tin nhắn quá hạn 24h:', err);
  }
}

function mapMessageRow(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    recipientId: row.recipient_id,
    content: decryptText(row.encrypted_content),
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Kiểm tra quyền truy cập phòng chat: Chỉ đúng Customer tạo phiếu và Technical được phân công
 */
async function verifyTicketChatAccess(ticketId, userId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      departmentName: true,
      creatorId: true,
      creatorName: true,
      creatorPhone: true,
      assigneeId: true,
      assigneeName: true,
    },
  });

  if (!ticket) {
    throw { statusCode: 404, message: 'Không tìm thấy phiếu công việc' };
  }
  if (!ticket.assigneeId) {
    throw { statusCode: 400, message: 'Phiếu này chưa được Admin điều phối Kỹ thuật viên' };
  }
  if (ticket.creatorId !== userId && ticket.assigneeId !== userId) {
    throw { statusCode: 403, message: 'Đoạn hội thoại này được bảo mật, chỉ người tạo phiếu và kỹ thuật viên phụ trách mới có quyền truy cập' };
  }

  return ticket;
}

/**
 * Danh sách các cuộc trò chuyện (theo phiếu đã được điều phối) của Technical hoặc Customer
 */
export async function listRooms(user) {
  await ensureTable();
  await purgeExpiredMessages();

  const tickets = await prisma.ticket.findMany({
    where: {
      assigneeId: { not: null },
      OR: [
        { creatorId: user.id },
        { assigneeId: user.id },
      ],
      status: {
        in: ['ASSIGNED', 'PROCESSING', 'WAITING_SUPPLY', 'DONE'],
      },
    },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      priority: true,
      departmentName: true,
      creatorId: true,
      creatorName: true,
      creatorPhone: true,
      assigneeId: true,
      assigneeName: true,
      dispatchedAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (tickets.length === 0) return [];

  const rooms = await Promise.all(
    tickets.map(async (t) => {
      const isTechnicalSide = t.assigneeId === user.id && t.creatorId !== user.id;
      const partnerId = isTechnicalSide ? t.creatorId : t.assigneeId;
      const partnerName = isTechnicalSide ? t.creatorName : (t.assigneeName || 'Kỹ thuật viên');
      const partnerRole = isTechnicalSide ? 'CUSTOMER' : 'TECHNICAL';

      const unreadRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS cnt FROM "chat_messages" WHERE "ticket_id" = $1 AND "recipient_id" = $2 AND "is_read" = false AND "expires_at" > NOW()`,
        t.id,
        user.id
      );

      const lastMsgRows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "chat_messages" WHERE "ticket_id" = $1 AND "expires_at" > NOW() ORDER BY "created_at" DESC LIMIT 1`,
        t.id
      );

      const lastMsg = lastMsgRows[0] ? mapMessageRow(lastMsgRows[0]) : null;

      return {
        ticketId: t.id,
        ticketCode: t.code,
        ticketTitle: t.title,
        ticketStatus: t.status,
        ticketPriority: t.priority,
        departmentName: t.departmentName,
        partnerId,
        partnerName,
        partnerRole,
        partnerPhone: isTechnicalSide ? t.creatorPhone : null,
        unreadCount: unreadRows[0]?.cnt || 0,
        lastMessage: lastMsg ? lastMsg.content : null,
        lastMessageAt: lastMsg ? lastMsg.createdAt : t.dispatchedAt || t.updatedAt,
        expiresAt: lastMsg ? lastMsg.expiresAt : null,
      };
    })
  );

  // Ưu tiên phòng có tin nhắn chưa đọc, sau đó là phiếu đang xử lý (chưa DONE), rồi đến thời gian cập nhật
  return rooms.sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
    const aActive = a.ticketStatus !== 'DONE' ? 1 : 0;
    const bActive = b.ticketStatus !== 'DONE' ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
  });
}

/**
 * Lấy danh sách tin nhắn trong 1 phiếu (đánh dấu đã đọc tin nhắn gửi cho mình)
 */
export async function listMessages(ticketId, user) {
  await ensureTable();
  await purgeExpiredMessages();

  const ticket = await verifyTicketChatAccess(ticketId, user.id);

  // Đánh dấu đã đọc các tin nhắn gửi tới user
  await prisma.$executeRawUnsafe(
    `UPDATE "chat_messages" SET "is_read" = true WHERE "ticket_id" = $1 AND "recipient_id" = $2 AND "is_read" = false`,
    ticketId,
    user.id
  );

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "chat_messages" WHERE "ticket_id" = $1 AND "expires_at" > NOW() ORDER BY "created_at" ASC`,
    ticketId
  );

  return {
    ticket: {
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      status: ticket.status,
      departmentName: ticket.departmentName,
      creatorId: ticket.creatorId,
      creatorName: ticket.creatorName,
      assigneeId: ticket.assigneeId,
      assigneeName: ticket.assigneeName,
    },
    messages: rows.map(mapMessageRow),
  };
}

/**
 * Gửi tin nhắn mới (mã hóa AES-256-GCM, tự động hết hạn sau 24 giờ, đẩy SSE tức thì)
 */
export async function sendMessage(ticketId, content, user) {
  await ensureTable();
  await purgeExpiredMessages();

  if (!content || !String(content).trim()) {
    throw { statusCode: 400, message: 'Nội dung tin nhắn không được để trống' };
  }

  const ticket = await verifyTicketChatAccess(ticketId, user.id);
  const recipientId = user.id === ticket.assigneeId ? ticket.creatorId : ticket.assigneeId;

  const id = crypto.randomUUID();
  const encrypted = encryptText(String(content).trim());

  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO "chat_messages" (
      "id", "ticket_id", "sender_id", "sender_name", "sender_role", "recipient_id", "encrypted_content", "is_read", "created_at", "expires_at"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW() + INTERVAL '24 hours'
    ) RETURNING *`,
    id,
    ticketId,
    user.id,
    user.fullName,
    user.role,
    recipientId,
    encrypted
  );

  const message = mapMessageRow(rows[0]);

  // Đẩy realtime qua SSE cho người nhận và người gửi
  sseService.sendToUser(recipientId, 'chat_message', {
    ...message,
    ticketCode: ticket.code,
    ticketTitle: ticket.title,
  });
  sseService.sendToUser(user.id, 'chat_message', {
    ...message,
    ticketCode: ticket.code,
    ticketTitle: ticket.title,
  });

  return message;
}

/**
 * Xóa cứng toàn bộ cuộc trò chuyện của phiếu ngay lập tức theo yêu cầu
 */
export async function clearTicketMessages(ticketId, user) {
  await ensureTable();
  const ticket = await verifyTicketChatAccess(ticketId, user.id);

  await prisma.$executeRawUnsafe(
    `DELETE FROM "chat_messages" WHERE "ticket_id" = $1`,
    ticketId
  );

  const partnerId = user.id === ticket.assigneeId ? ticket.creatorId : ticket.assigneeId;
  sseService.sendToUser(partnerId, 'chat_cleared', { ticketId });
  sseService.sendToUser(user.id, 'chat_cleared', { ticketId });

  return { deleted: true, ticketId };
}
