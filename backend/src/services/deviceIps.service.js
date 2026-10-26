import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { auditLogsService } from './auditLogs.service.js';

let tableInitialized = false;

async function ensureTable() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "device_ip_records" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "unit_and_device" TEXT NOT NULL,
        "ip_address" TEXT NOT NULL,
        "device_category" TEXT NOT NULL DEFAULT 'Máy in Internet',
        "note" TEXT,
        "updated_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('Lỗi khởi tạo bảng device_ip_records:', err.message);
  }
}

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    unitAndDevice: r.unit_and_device ?? r.unitAndDevice ?? '',
    ipAddress: r.ip_address ?? r.ipAddress ?? '',
    deviceCategory: r.device_category ?? r.deviceCategory ?? 'Máy in Internet',
    note: r.note ?? null,
    updatedBy: r.updated_by ?? r.updatedBy ?? null,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

export const deviceIpsService = {
  async list(filters = {}) {
    await ensureTable();
    const conditions = [];
    const params = [];

    if (filters.deviceCategory && filters.deviceCategory !== 'ALL') {
      params.push(filters.deviceCategory);
      conditions.push(`"device_category" = $${params.length}`);
    }

    if (filters.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      const idx = params.length;
      conditions.push(
        `("unit_and_device" ILIKE $${idx} OR "ip_address" ILIKE $${idx} OR "device_category" ILIKE $${idx} OR COALESCE("note", '') ILIKE $${idx})`
      );
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "device_ip_records" ${whereSql} ORDER BY "updated_at" DESC, "created_at" DESC`,
      ...params
    );
    return rows.map(mapRow);
  },

  async create(data, currentUser) {
    await ensureTable();
    const {
      unitAndDevice,
      ipAddress,
      deviceCategory = 'Máy in Internet',
      note = null,
    } = data;

    if (!unitAndDevice?.trim() || !ipAddress?.trim()) {
      throw { status: 400, message: 'Vui lòng nhập đầy đủ Tên máy/Đơn vị và Mã IP' };
    }

    const id = crypto.randomUUID();
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "device_ip_records" ("id", "unit_and_device", "ip_address", "device_category", "note", "updated_by", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      id,
      unitAndDevice.trim(),
      ipAddress.trim(),
      deviceCategory.trim() || 'Máy in Internet',
      note?.trim() || null,
      currentUser?.fullName || currentUser?.username || 'Kỹ thuật viên'
    );

    const created = mapRow(rows[0]);

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'CREATE_DEVICE_IP',
        entityType: 'DEVICE_IP',
        entityId: created.id,
        newValue: {
          unitAndDevice: created.unitAndDevice,
          ipAddress: created.ipAddress,
          deviceCategory: created.deviceCategory,
        },
        level: 'INFO',
      });
    }

    return created;
  },

  async update(id, data, currentUser) {
    await ensureTable();
    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "device_ip_records" WHERE "id" = $1`,
      id
    );
    if (!existingRows.length) {
      throw { status: 404, message: 'Không tìm thấy dữ liệu thiết bị / IP' };
    }
    const existing = mapRow(existingRows[0]);

    const unitAndDevice =
      data.unitAndDevice !== undefined ? data.unitAndDevice.trim() : existing.unitAndDevice;
    const ipAddress =
      data.ipAddress !== undefined ? data.ipAddress.trim() : existing.ipAddress;
    const deviceCategory =
      data.deviceCategory !== undefined ? data.deviceCategory.trim() : existing.deviceCategory;
    const note =
      data.note !== undefined ? (data.note?.trim() || null) : existing.note;

    if (!unitAndDevice || !ipAddress) {
      throw { status: 400, message: 'Tên máy/Đơn vị và Mã IP không được để trống' };
    }

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "device_ip_records"
       SET "unit_and_device" = $2,
           "ip_address" = $3,
           "device_category" = $4,
           "note" = $5,
           "updated_by" = $6,
           "updated_at" = NOW()
       WHERE "id" = $1
       RETURNING *`,
      id,
      unitAndDevice,
      ipAddress,
      deviceCategory,
      note,
      currentUser?.fullName || currentUser?.username || existing.updatedBy
    );

    const updated = mapRow(rows[0]);

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'UPDATE_DEVICE_IP',
        entityType: 'DEVICE_IP',
        entityId: id,
        oldValue: { unitAndDevice: existing.unitAndDevice, ipAddress: existing.ipAddress },
        newValue: { unitAndDevice: updated.unitAndDevice, ipAddress: updated.ipAddress },
        level: 'INFO',
      });
    }

    return updated;
  },

  async remove(id, currentUser) {
    await ensureTable();
    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "device_ip_records" WHERE "id" = $1`,
      id
    );
    if (!existingRows.length) {
      throw { status: 404, message: 'Không tìm thấy dữ liệu thiết bị / IP' };
    }
    const existing = mapRow(existingRows[0]);

    // Xóa cứng khỏi CSDL
    await prisma.$executeRawUnsafe(
      `DELETE FROM "device_ip_records" WHERE "id" = $1`,
      id
    );

    if (currentUser) {
      await auditLogsService.create({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'HARD_DELETE_DEVICE_IP',
        entityType: 'DEVICE_IP',
        entityId: id,
        oldValue: { unitAndDevice: existing.unitAndDevice, ipAddress: existing.ipAddress },
        level: 'WARNING',
      });
    }

    return {
      success: true,
      message: `Đã xóa vĩnh viễn "${existing.unitAndDevice} (${existing.ipAddress})"`
    };
  },
};
