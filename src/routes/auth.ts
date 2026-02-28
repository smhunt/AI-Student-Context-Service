import { Router } from 'express';
import { z } from 'zod/v4';
import { findUserByEmail } from '../db/queries/index.js';
import { comparePassword, generateToken } from '../utils/crypto.js';
import { authMiddleware } from '../middleware/auth.js';
import { getAuthProvider } from '../auth/index.js';

const router = Router();

// Auth provider info (public)
router.get('/api/auth/provider', (_req, res) => {
  const provider = getAuthProvider();
  res.json({ provider: provider.name });
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Dev login — email + password. SSO is Sprint 7.
router.post('/api/auth/dev-login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    boardId: user.board_id,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name_first: user.name_first,
      name_last: user.name_last,
      email: user.email,
      role: user.role,
      board_id: user.board_id,
    },
  });
});

// Get current user
router.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { findUserById } = await import('../db/queries/users.js');
  const user = await findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      name_first: user.name_first,
      name_last: user.name_last,
      email: user.email,
      role: user.role,
      board_id: user.board_id,
    },
  });
});

export default router;
