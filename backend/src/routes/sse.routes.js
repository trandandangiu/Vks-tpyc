import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { sseService } from '../services/sse.service.js';

const router = express.Router();

router.get('/stream', authenticate, (req, res) => {
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ userId, at: new Date().toISOString() })}\n\n`);

  sseService.addClient(userId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\n`);
      res.write(`data: ${JSON.stringify({ t: Date.now() })}\n\n`);
    } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseService.removeClient(userId, res);
    res.end();
  });
});

router.get('/stats', authenticate, (req, res) => {
  res.json({
    success: true,
    onlineUsers: sseService.getOnlineUserCount(),
    totalConnections: sseService.getTotalConnections(),
  });
});

export default router;