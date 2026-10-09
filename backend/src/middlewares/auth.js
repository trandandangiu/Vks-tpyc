import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export async function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7).trim();
  if (!token && req.query.token) token = String(req.query.token);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { department: { select: { id: true, code: true, name: true } } },
    });

    if (!user || user.deletedAt || !user.active) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      department: user.department,
      position: user.position,
      phone: user.phone,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' });
  }
}