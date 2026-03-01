import type { Request, Response, NextFunction } from 'express';
import type { AuthProvider, AuthUser } from './auth-provider.js';

/**
 * Clerk auth provider — verifies Clerk session tokens and maps
 * Clerk users to internal AuthUser by email lookup.
 *
 * Requires: CLERK_SECRET_KEY env var.
 * Users must exist in our database (matched by email).
 */

// Cache: Clerk user ID → AuthUser (avoids repeated DB + API lookups)
const userCache = new Map<string, { authUser: AuthUser; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ClerkAuthProvider implements AuthProvider {
  readonly name = 'clerk';

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authUser = await this.verifyRequest(req);
        req.user = authUser;
        next();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication required';
        res.status(401).json({ error: message });
      }
    };
  }

  async verifyRequest(req: Request): Promise<AuthUser> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = header.slice(7);

    // Lazy import to avoid loading Clerk SDK when using dev auth
    const { verifyToken, createClerkClient } = await import('@clerk/express');
    const { config } = await import('../config/index.js');

    if (!config.clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    // Verify the session token (throws on invalid/expired)
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });
    const clerkUserId = payload.sub;

    const clerk = createClerkClient({ secretKey: config.clerkSecretKey });

    // Check cache
    const cached = userCache.get(clerkUserId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.authUser;
    }

    // Resolve email from Clerk backend
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!email) {
      throw new Error('Clerk user has no email address configured');
    }

    // Look up user in our database by email
    const { findUserByEmail } = await import('../db/queries/users.js');
    const dbUser = await findUserByEmail(email);

    if (!dbUser) {
      throw new Error(
        `No StudentContext account found for ${email}. Contact your school board administrator.`,
      );
    }

    const authUser: AuthUser = {
      userId: dbUser.id,
      role: dbUser.role,
      boardId: dbUser.board_id,
      email: dbUser.email ?? undefined,
      externalId: clerkUserId,
    };

    // Cache the mapping
    userCache.set(clerkUserId, { authUser, cachedAt: Date.now() });

    return authUser;
  }
}
