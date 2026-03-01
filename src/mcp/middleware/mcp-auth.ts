import type { Request, Response, NextFunction } from 'express';
import { getAuthProvider, type AuthUser } from '../../auth/index.js';

/**
 * MCP HTTP auth middleware — verifies Bearer tokens using the configured auth provider.
 *
 * Supports two modes:
 *  1. End-user auth: Bearer token from the user's session
 *  2. Service-to-service: Bearer token from a trusted service (same auth flow,
 *     but user_id/board_id can be overridden via query params for delegation)
 */
export async function mcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const provider = getAuthProvider();
    const authUser = await provider.verifyRequest(req);
    req.user = authUser;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication required';
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: `Unauthorized: ${message}` },
      id: null,
    });
  }
}

/**
 * Extract MCP caller identity — uses authenticated user,
 * with optional overrides for service-to-service calls.
 */
export function getMcpCaller(req: Request): AuthUser {
  const user = req.user!;

  // Allow user_id/board_id overrides for service-to-service delegation
  // Only board_admin or service accounts should use overrides
  if (user.role === 'board_admin') {
    const overrideUserId = req.query.user_id as string;
    const overrideBoardId = req.query.board_id as string;

    if (overrideUserId || overrideBoardId) {
      return {
        ...user,
        userId: overrideUserId || user.userId,
        boardId: overrideBoardId || user.boardId,
      };
    }
  }

  return user;
}
