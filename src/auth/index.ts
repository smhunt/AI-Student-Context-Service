import type { AuthProvider } from './auth-provider.js';
import { DevAuthProvider } from './dev-auth-provider.js';
import { ClerkAuthProvider } from './clerk-auth-provider.js';
import { EntraAuthProvider } from './entra-auth-provider.js';
import { GoogleAuthProvider } from './google-auth-provider.js';
import { config } from '../config/index.js';

export type { AuthProvider, AuthUser } from './auth-provider.js';

let _instance: AuthProvider | null = null;

/**
 * Returns the configured auth provider singleton.
 *
 * Reads `config.authProvider` (env: `AUTH_PROVIDER`):
 *  - 'dev' (default) — JWT/bcrypt dev-login
 *  - 'clerk'  — Clerk SSO (requires CLERK_SECRET_KEY)
 *  - 'entra'  — Microsoft Entra ID (requires ENTRA_TENANT_ID, ENTRA_CLIENT_ID)
 *  - 'google' — Google Identity (requires GOOGLE_AUTH_CLIENT_ID)
 *
 * Auto-detects: if CLERK_SECRET_KEY is set and AUTH_PROVIDER is not
 * explicitly 'dev', Clerk is used automatically.
 */
export function getAuthProvider(): AuthProvider {
  if (_instance) return _instance;

  const provider = config.clerkSecretKey && config.authProvider !== 'dev'
    ? 'clerk'
    : config.authProvider;

  switch (provider) {
    case 'clerk':
      _instance = new ClerkAuthProvider();
      break;
    case 'entra':
      _instance = new EntraAuthProvider();
      break;
    case 'google':
      _instance = new GoogleAuthProvider();
      break;
    case 'dev':
    default:
      _instance = new DevAuthProvider();
  }

  return _instance;
}

/** Reset singleton — for testing */
export function resetAuthProvider(): void {
  _instance = null;
}
