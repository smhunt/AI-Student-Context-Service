import type { Request, Response, NextFunction } from 'express';
import type { AuthProvider, AuthUser } from './auth-provider.js';
import { verifyToken } from '../utils/crypto.js';

/**
 * Development auth provider — wraps existing JWT/bcrypt login flow.
 * All current behavior (token verification, 24h expiry) is preserved.
 */
export class DevAuthProvider implements AuthProvider {
  readonly name = 'dev';

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
      }

      const token = header.slice(7);
      try {
        const payload = verifyToken(token);
        const authUser: AuthUser = {
          userId: payload.userId,
          role: payload.role,
          boardId: payload.boardId,
        };
        req.user = authUser;
        next();
      } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
      }
    };
  }

  async verifyRequest(req: Request): Promise<AuthUser> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    return {
      userId: payload.userId,
      role: payload.role,
      boardId: payload.boardId,
    };
  }
}
