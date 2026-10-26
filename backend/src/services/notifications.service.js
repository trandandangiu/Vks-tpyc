import crypto from 'crypto';
import prisma from '../config/prisma.js';

let tableInitialized = false;

async function ensureTable() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'INFO',
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "ticket_id" TEXT,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('Lỗi khởi tạo bảng notifications:', err.message);
  }
}

export const notificationsService = {
  async createManyForUsers(userIds, { type = 'INFO', title, content, ticketId = null }) {
    await ensureTable();
    const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
    const created = [];
    const now = new Date();

    for (const uid of uniqueIds) {
      const id = crypto.randomUUID();
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "notifications" ("id", "user_id", "type", "title", "content", "ticket_id", "is_read", "created_at")
           VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
          id,
          uid,
          type,
          title,
          content,
          ticketId,
          now
        );
        created.push({
          id,
          userId: uid,
          type,
          title,
          content,
          ticketId,
          isRead: false,
          createdAt: now.toISOString(),
        });
      } catch (err) {
        console.error('Lỗi lưu notification vào DB:', err.message);
      }
    }
    return created;
  },

  async listByUser(userId, limit = 50) {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         "id",
         "user_id" AS "userId",
         "type",
         "title",
         "content",
         "ticket_id" AS "ticketId",
         "is_read" AS "isRead",
         "created_at" AS "createdAt"
       FROM "notifications"
       WHERE "user_id" = $1
       ORDER BY "created_at" DESC
       LIMIT $2`,
      userId,
      Number(limit) || 50
    );
    return rows;
  },

  async markAsRead(id, userId) {
    await ensureTable();
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications" SET "is_read" = true WHERE "id" = $1 AND "user_id" = $2`,
      id,
      userId
    );
    return { success: true };
  },

  async markAllAsRead(userId) {
    await ensureTable();
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications" SET "is_read" = true WHERE "user_id" = $1`,
      userId
    );
    return { success: true };
  },

  async remove(id, userId) {
    await ensureTable();
    // Xóa cứng khỏi DB
    await prisma.$executeRawUnsafe(
      `DELETE FROM "notifications" WHERE "id" = $1 AND "user_id" = $2`,
      id,
      userId
    );
    return { success: true };
  },

  async clearAll(userId) {
    await ensureTable();
    // Xóa cứng toàn bộ thông báo của user khỏi DB
    await prisma.$executeRawUnsafe(
      `DELETE FROM "notifications" WHERE "user_id" = $1`,
      userId
    );
    return { success: true };
  },
};
