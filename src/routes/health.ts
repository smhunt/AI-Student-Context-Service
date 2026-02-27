import { Router } from 'express';
import { pool } from '../db/index.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

export default router;
