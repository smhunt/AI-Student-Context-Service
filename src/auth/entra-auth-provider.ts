import type { Request, Response, NextFunction } from 'express';
import type { AuthProvider, AuthUser } from './auth-provider.js';

/**
 * Microsoft Entra ID (Azure AD) auth provider — stub implementation.
 *
 * Verifies Azure AD JWTs via JWKS endpoint, maps `oid` claim to externalId.
 * Requires: ENTRA_TENANT_ID, ENTRA_CLIENT_ID env vars.
 *
 * This is a swap-ready stub. Full implementation requires:
 *  1. Add `jwks-rsa` and `jsonwebtoken` for JWKS-based token verification
 *  2. Configure Azure AD app registration with appropriate redirect URIs
 *  3. Map Entra security groups to StudentContext roles
 */
export class EntraAuthProvider implements AuthProvider {
  readonly name = 'entra';

  private tenantId: string;
  private clientId: string;
  private issuer: string;
  private jwksUri: string;

  constructor() {
    const { config } = require('../config/index.js');
    this.tenantId = config.entraTenantId;
    this.clientId = config.entraClientId;

    if (!this.tenantId || !this.clientId) {
      throw new Error('Entra ID requires ENTRA_TENANT_ID and ENTRA_CLIENT_ID');
    }

    this.issuer = `https://login.microsoftonline.com/${this.tenantId}/v2.0`;
    this.jwksUri = `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`;
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

    // Decode token header to get kid (key ID) for JWKS lookup
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const headerPayload = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    );
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    // Validate standard claims
    if (payload.iss !== this.issuer) {
      throw new Error('Invalid token issuer');
    }
    if (payload.aud !== this.clientId) {
      throw new Error('Invalid token audience');
    }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // TODO: Full implementation — verify signature via JWKS
    // const jwksClient = require('jwks-rsa')({ jwksUri: this.jwksUri });
    // const key = await jwksClient.getSigningKey(headerPayload.kid);
    // jwt.verify(token, key.getPublicKey(), { issuer: this.issuer, audience: this.clientId });

    // Extract Entra user identity
    const entraUserId = payload.oid; // Azure AD Object ID
    const email = payload.preferred_username || payload.email;

    if (!entraUserId) {
      throw new Error('Token missing oid claim');
    }
    if (!email) {
      throw new Error('Token missing email claim');
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
      externalId: entraUserId,
    };
  }
}
