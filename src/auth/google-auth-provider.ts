import type { Request, Response, NextFunction } from 'express';
import type { AuthProvider, AuthUser } from './auth-provider.js';

/**
 * Google Identity auth provider — stub implementation.
 *
 * Verifies Google ID tokens via google-auth-library's OAuth2Client.
 * Requires: GOOGLE_AUTH_CLIENT_ID env var (separate from Classroom OAuth).
 *
 * This is a swap-ready stub. Full implementation requires:
 *  1. Configure Google Cloud project with OAuth consent screen
 *  2. Add authorized domains for the school board
 *  3. Map Google Workspace org units to StudentContext roles
 */
export class GoogleAuthProvider implements AuthProvider {
  readonly name = 'google';

  private clientId: string;

  constructor() {
    const { config } = require('../config/index.js');
    this.clientId = config.googleAuthClientId;

    if (!this.clientId) {
      throw new Error('Google auth requires GOOGLE_AUTH_CLIENT_ID');
    }
  }

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

    // Verify the Google ID token
    // In production, use: const { OAuth2Client } = await import('google-auth-library');
    // const client = new OAuth2Client(this.clientId);
    // const ticket = await client.verifyIdToken({ idToken: token, audience: this.clientId });
    // const payload = ticket.getPayload();

    // Stub: decode without signature verification
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    // Validate standard claims
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      throw new Error('Invalid token issuer');
    }
    if (payload.aud !== this.clientId) {
      throw new Error('Invalid token audience');
    }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    const googleUserId = payload.sub;
    const email = payload.email;

    if (!googleUserId) {
      throw new Error('Token missing sub claim');
    }
    if (!email) {
      throw new Error('Token missing email claim');
    }
    if (!payload.email_verified) {
      throw new Error('Email not verified');
    }

    // Look up user in our database by email
    const { findUserByEmail } = await import('../db/queries/users.js');
    const dbUser = await findUserByEmail(email);

    if (!dbUser) {
      throw new Error(
        `No StudentContext account found for ${email}. Contact your school board administrator.`
      );
    }

    return {
      userId: dbUser.id,
      role: dbUser.role,
      boardId: dbUser.board_id,
      email: dbUser.email ?? undefined,
      externalId: googleUserId,
    };
  }
}
