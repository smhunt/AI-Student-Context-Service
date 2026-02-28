import type { Request, Response, NextFunction } from 'express';
import { getAuthProvider } from '../auth/index.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const provider = getAuthProvider();
  provider.middleware()(req, res, next);
}
