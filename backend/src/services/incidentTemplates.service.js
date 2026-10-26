import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';

let isTableEnsured = false;

async function ensureTable() {
  if (isTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "incident_templates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'Khác',
        "network_type" TEXT NOT NULL DEFAULT 'ALL',
        "default_priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "description_hint" TEXT,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isTableEnsured = true;
  } catch (err) {
    console.error('Lỗi khởi tạo bảng incident_templates:', err.message);
  }
}

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    category: r.category || 'Khác',
    networkType: r.network_type ?? r.networkType ?? 'ALL',
    defaultPriority: r.default_priority ?? r.defaultPriority ?? 'NORMAL',
    descriptionHint: r.description_hint ?? r.descriptionHint ?? null,
    sortOrder: Number(r.sort_order ?? r.sortOrder ?? 0),
    active: Boolean(r.active),
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

export const incidentTemplatesService = {
  async list(filters = {}) {
    await ensureTable();

    const conditions = [];
    const params = [];

    if (filters.activeOnly === 'true') {
      conditions.push(`"active" = true`);
    }
    if (filters.networkType && filters.networkType !== 'ALL') {
      params.push(filters.networkType);
      conditions.push(`("network_type" = $${params.length} OR "network_type" = 'ALL')`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "incident_templates" ${whereSql} ORDER BY "sort_order" ASC, "created_at" ASC`,
      ...params
    );

    return rows.map(mapRow);
  },

  async create(data, currentUser) {
    await ensureTable();

    const {
      title,
      category = 'Khác',
      networkType = 'ALL',
      defaultPriority = 'NORMAL',
      descriptionHint = null,
      sortOrder = 0,
      active = true,
    } = data;

    if (!title || !title.trim()) {
      throw { status: 400, message: 'Vui lòng nhập tên sự cố / lỗi thường gặp' };
    }

    const crypto = await import('crypto');
    const id = crypto.randomUUID();

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "incident_templates" ("id", "title", "category", "network_type", "default_priority", "description_hint", "sort_order", "active", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      id,
      title.trim(),
      (category || 'Khác').trim(),
      networkType || 'ALL',
      defaultPriority || 'NORMAL',
      descriptionHint?.trim() || null,
      Number(sortOrder) || 0,
      Boolean(active)
    );

    const created = mapRow(rows[0]);

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'CREATE_INCIDENT_TEMPLATE',
        entityType: 'INCIDENT_TEMPLATE',
        entityId: created.id,
        newValue: { title: created.title, networkType: created.networkType },
        level: 'INFO',
      });
    }

    return created;
  },

  async update(id, data, currentUser) {
    await ensureTable();

    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "incident_templates" WHERE "id" = $1`,
      id
    );
    if (!existingRows.length) {
      throw { status: 404, message: 'Không tìm thấy mẫu sự cố' };
    }
    const existing = mapRow(existingRows[0]);

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    const category = data.category !== undefined ? data.category.trim() : existing.category;
    const networkType = data.networkType !== undefined ? data.networkType : existing.networkType;
    const defaultPriority = data.defaultPriority !== undefined ? data.defaultPriority : existing.defaultPriority;
    const descriptionHint =
      data.descriptionHint !== undefined ? (data.descriptionHint?.trim() || null) : existing.descriptionHint;
    const sortOrder = data.sortOrder !== undefined ? Number(data.sortOrder) || 0 : existing.sortOrder;
    const active = data.active !== undefined ? Boolean(data.active) : existing.active;

    if (!title) {
      throw { status: 400, message: 'Tên sự cố không được để trống' };
    }

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "incident_templates"
       SET "title" = $2,
           "category" = $3,
           "network_type" = $4,
           "default_priority" = $5,
           "description_hint" = $6,
           "sort_order" = $7,
           "active" = $8,
           "updated_at" = NOW()
       WHERE "id" = $1
       RETURNING *`,
      id,
      title,
      category,
      networkType,
      defaultPriority,
      descriptionHint,
      sortOrder,
      active
    );

    const updated = mapRow(rows[0]);

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'UPDATE_INCIDENT_TEMPLATE',
        entityType: 'INCIDENT_TEMPLATE',
        entityId: id,
        oldValue: { title: existing.title },
        newValue: { title: updated.title, active: updated.active },
        level: 'INFO',
      });
    }

    return updated;
  },

  async remove(id, currentUser) {
    await ensureTable();

    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "incident_templates" WHERE "id" = $1`,
      id
    );
    if (!existingRows.length) {
      throw { status: 404, message: 'Không tìm thấy mẫu sự cố' };
    }
    const existing = mapRow(existingRows[0]);

    await prisma.$executeRawUnsafe(
      `DELETE FROM "incident_templates" WHERE "id" = $1`,
      id
    );

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'DELETE_INCIDENT_TEMPLATE',
        entityType: 'INCIDENT_TEMPLATE',
        entityId: id,
        oldValue: { title: existing.title },
        level: 'WARNING',
      });
    }

    return { success: true, message: `Đã xóa vĩnh viễn sự cố "${existing.title}"` };
  },
};
