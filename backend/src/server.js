import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import attachmentsRoutes from './routes/attachments.routes.js';
import auditLogsRoutes from './routes/auditLogs.routes.js';
import sseRoutes from './routes/sse.routes.js';

import { errorHandler, notFound } from './middlewares/error.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    callback(null, true); // dev: cho phép tất cả
  },
  credentials: true,
}));
app.use(express.json());

// Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 500 ? '\x1b[31m'
      : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${res.statusCode}\x1b[0m ${req.method} ${req.originalUrl} - ${Date.now() - start}ms`);
  });
  next();
});

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VKS Ticket API',
}));

// Health
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend đang chạy' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api', attachmentsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/sse', sseRoutes);

// Errors
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log('======================================================');
  console.log('   HỆ THỐNG PHIẾU YÊU CẦU KỸ THUẬT');
  console.log('======================================================');
  console.log(`🚀 Backend:  http://localhost:${PORT}`);
  console.log(`📚 Swagger:  http://localhost:${PORT}/api-docs`);
  console.log('======================================================');
});