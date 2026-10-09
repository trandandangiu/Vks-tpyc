# PTCV — Phiếu Tạo Công Việc

Hệ thống quản lý phiếu yêu cầu kỹ thuật cho bộ phận chuyển đổi số.

## Tech Stack
- Backend: Node.js + Express + Prisma + PostgreSQL
- Frontend: React + Vite + TailwindCSS
- Realtime: SSE
- Auth: JWT

## Quick Start

```bash
# 1. Start DB
docker-compose up -d

# 2. Backend
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev

# 3. Frontend
cd ../frontend
npm install
npm run dev