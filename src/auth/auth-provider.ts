import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/index.js';

/**
 * Authenticated user identity returned by all auth providers.
 * Superset of JwtPayload — providers may set additional fields.
 */
export interface AuthUser {
  userId: string;
  role: UserRole;
  boardId: string;
  email?: string;
  externalId?: string;
}

/**
 * Generic auth provider interface.
 *
 * Implementations:
 *  - DevAuthProvider  — JWT/bcrypt dev-login (current)
 *  - (future) ClerkAuthProvider, EntraAuthProvider, GoogleAuthProvider
 */
export interface AuthProvider {
  /** Unique provider name (e.g. 'dev', 'clerk', 'entra') */
  readonly name: string;

  /**
   * Express middleware that verifies the incoming request and sets `req.user`.
   * Should call `next()` on success, or respond with 401 on failure.
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void;

  /**
   * Verify a raw request and return the authenticated user.
   * Throws if the request is not authenticated.
   */
  verifyRequest(req: Request): Promise<AuthUser>;
}
