import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed...');

  // ═══ DEPARTMENTS ═══
  const departments = [
    { code: 'P1', name: 'Phòng 1' },
    { code: 'P2', name: 'Phòng 2' },
    { code: 'P7', name: 'Phòng 7' },
    { code: 'VP', name: 'Văn phòng' },
    { code: 'CNTT', name: 'Bộ phận CNTT & CĐS' },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
  }
  console.log(`✅ ${departments.length} phòng ban`);

  // ═══ USERS ═══
  const hash = (pwd) => bcrypt.hash(pwd, 10);
  const p1 = await prisma.department.findUnique({ where: { code: 'P1' } });
  const p2 = await prisma.department.findUnique({ where: { code: 'P2' } });
  const cntt = await prisma.department.findUnique({ where: { code: 'CNTT' } });

  const users = [
    {
      username: 'admin',
      passwordHash: await hash('admin123'),
      fullName: 'Quản trị viên',
      email: 'admin@vks.gov.vn',
      phone: '0900000001',
      role: 'ADMIN',
      departmentId: cntt.id,
      position: 'Quản trị hệ thống',
    },
    {
      username: 'customer',
      passwordHash: await hash('customer123'),
      fullName: 'Nguyễn Văn A',
      email: 'customer@vks.gov.vn',
      phone: '0900000002',
      role: 'CUSTOMER',
      departmentId: p1.id,
      position: 'KSV trung cấp',
    },
    {
      username: 'customer2',
      passwordHash: await hash('customer123'),
      fullName: 'Trần Thị B',
      email: 'customer2@vks.gov.vn',
      phone: '0900000003',
      role: 'CUSTOMER',
      departmentId: p2.id,
      position: 'Chuyên viên',
    },
    {
      username: 'technical',
      passwordHash: await hash('technical123'),
      fullName: 'Lê Văn C',
      email: 'technical@vks.gov.vn',
      phone: '0900000004',
      role: 'TECHNICAL',
      departmentId: cntt.id,
      position: 'Cán bộ CNTT',
    },
    {
      username: 'technical2',
      passwordHash: await hash('technical123'),
      fullName: 'Phạm Thị D',
      email: 'technical2@vks.gov.vn',
      phone: '0900000005',
      role: 'TECHNICAL',
      departmentId: cntt.id,
      position: 'Cán bộ CNTT',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }
  console.log(`✅ ${users.length} users`);

  // ═══ TICKETS MẪU ═══
  const existing = await prisma.ticket.count();
  if (existing === 0) {
    const customer = await prisma.user.findUnique({ where: { username: 'customer' } });
    const customer2 = await prisma.user.findUnique({ where: { username: 'customer2' } });
    const tech = await prisma.user.findUnique({ where: { username: 'technical' } });
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });

    const tickets = [
      {
        code: 'PYC-2026-001',
        title: 'Mất mạng LAN không vào được phần mềm án',
        description: 'Máy tính báo "No Internet". Không vào được phần mềm án từ sáng nay.',
        category: 'Mạng LAN / Internet',
        priority: 'URGENT',
        status: 'DONE',
        creatorId: customer.id,
        creatorName: customer.fullName,
        creatorPhone: customer.phone,
        creatorPosition: customer.position,
        departmentId: p1.id,
        departmentName: p1.name,
        assigneeId: tech.id,
        assigneeName: tech.fullName,
        dispatcherId: admin.id,
        dispatchedAt: new Date('2026-10-09T09:30:00'),
        scheduledAt: new Date('2026-10-09T14:00:00'),
        completedAt: new Date('2026-10-09T15:30:00'),
        processNote: 'Đã thay switch 8-port mới, mạng đã ổn định.',
        rating: 5,
        feedback: 'Xử lý nhanh, nhiệt tình!',
        ratedAt: new Date('2026-10-09T16:00:00'),
      },
      {
        code: 'PYC-2026-002',
        title: 'Cài lại Win + Chữ ký số Ban Cơ yếu',
        description: 'Máy tính bị lỗi Win, cần cài lại và cấu hình chữ ký số.',
        category: 'Cài Win + Chữ ký số',
        priority: 'HIGH',
        status: 'PROCESSING',
        creatorId: customer2.id,
        creatorName: customer2.fullName,
        creatorPhone: customer2.phone,
        creatorPosition: customer2.position,
        departmentId: p2.id,
        departmentName: p2.name,
        assigneeId: tech.id,
        assigneeName: tech.fullName,
        dispatcherId: admin.id,
        dispatchedAt: new Date('2026-10-10T08:00:00'),
        scheduledAt: new Date('2026-10-11T10:00:00'),
      },
      {
        code: 'PYC-2026-003',
        title: 'Máy in không in được hồ sơ',
        description: 'Máy in báo lỗi giấy kẹt nhưng đã kiểm tra không có giấy kẹt.',
        category: 'Máy in & Mực in',
        priority: 'NORMAL',
        status: 'WAITING_SUPPLY',
        creatorId: customer.id,
        creatorName: customer.fullName,
        creatorPhone: customer.phone,
        creatorPosition: customer.position,
        departmentId: p1.id,
        departmentName: p1.name,
        assigneeId: tech.id,
        assigneeName: tech.fullName,
        dispatcherId: admin.id,
        dispatchedAt: new Date('2026-10-10T09:00:00'),
        scheduledAt: new Date('2026-10-12T14:00:00'),
        processNote: 'Cần thay cao su kéo giấy mới.',
      },
      {
        code: 'PYC-2026-004',
        title: 'Cần cài phần mềm scan hồ sơ án',
        description: 'Máy scan mới chưa cài driver, cần hỗ trợ.',
        category: 'Máy scan văn thư',
        priority: 'LOW',
        status: 'ASSIGNED',
        creatorId: customer2.id,
        creatorName: customer2.fullName,
        creatorPhone: customer2.phone,
        creatorPosition: customer2.position,
        departmentId: p2.id,
        departmentName: p2.name,
        assigneeId: tech.id,
        assigneeName: tech.fullName,
        dispatcherId: admin.id,
        dispatchedAt: new Date('2026-10-10T10:00:00'),
      },
      {
        code: 'PYC-2026-005',
        title: 'Lỗi phần mềm Sổ thụ lý điện tử',
        description: 'Không đăng nhập được vào phần mềm, báo lỗi tài khoản.',
       category: 'Phần mềm Quản lý án',
        priority: 'URGENT',
        status: 'NEW',
        creatorId: customer.id,
        creatorName: customer.fullName,
        creatorPhone: customer.phone,
        creatorPosition: customer.position,
        departmentId: p1.id,
        departmentName: p1.name,
      },
      {
        code: 'PYC-2026-006',
        title: 'Máy tính khởi động chậm',
        description: 'Máy tính khởi động mất 5 phút, chạy rất ì ạch.',
        category: 'Hệ thống Truyền hình trực tuyến',
        priority: 'NORMAL',
        status: 'NEW',
        creatorId: customer2.id,
        creatorName: customer2.fullName,
        creatorPhone: customer2.phone,
        creatorPosition: customer2.position,
        departmentId: p2.id,
        departmentName: p2.name,
      },
      {
        code: 'PYC-2026-007',
        title: 'Wifi phòng họp yếu',
        description: 'Wifi phòng họp tầng 2 rất yếu, không họp trực tuyến được.',
        category: 'Mạng LAN / Internet',
        priority: 'HIGH',
        status: 'PROCESSING',
        creatorId: customer.id,
        creatorName: customer.fullName,
        creatorPhone: customer.phone,
        creatorPosition: customer.position,
        departmentId: p1.id,
        departmentName: p1.name,
        assigneeId: tech.id,
        assigneeName: tech.fullName,
        dispatcherId: admin.id,
        dispatchedAt: new Date('2026-10-10T11:00:00'),
        scheduledAt: new Date('2026-10-11T15:00:00'),
      },
      {
        code: 'PYC-2026-008',
        title: 'Cần cài Win mới cho máy scan',
        description: 'Máy scan cũ không tương thích, cần cài lại Win.',
        category: 'Khác',
        priority: 'NORMAL',
        status: 'CANCELLED',
        creatorId: customer2.id,
        creatorName: customer2.fullName,
        creatorPhone: customer2.phone,
        creatorPosition: customer2.position,
        departmentId: p2.id,
        departmentName: p2.name,
      },
    ];

    for (const t of tickets) {
      await prisma.ticket.create({ data: t });
    }
    console.log(`✅ ${tickets.length} tickets`);

    const ticket3 = await prisma.ticket.findUnique({ where: { code: 'PYC-2026-003' } });
    await prisma.ticketSupply.create({
      data: {
        ticketId: ticket3.id,
        name: 'Cao su máy scan',
        quantity: 2,
        unit: 'Cái',
        note: 'Cao su kéo giấy bị mòn',
      },
    });
  }

  console.log('🎉 SEED XONG!');
  console.log('');
  console.log('📌 TÀI KHOẢN:');
  console.log('  admin / admin123');
  console.log('  customer / customer123');
  console.log('  customer2 / customer123');
  console.log('  technical / technical123');
  console.log('  technical2 / technical123');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });