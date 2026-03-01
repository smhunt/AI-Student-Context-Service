import type { ClientAuthProvider } from './auth-provider-client.js';
import { DevAuthClient } from './dev-auth-client.js';
import { ClerkAuthClient } from './clerk-auth-client.js';
import { EntraAuthClient } from './entra-auth-client.js';
import { GoogleAuthClient } from './google-auth-client.js';

export type { ClientAuthProvider } from './auth-provider-client.js';

let _instance: ClientAuthProvider | null = null;

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'dev';

/** True when Clerk is the active auth provider */
export const isClerkAuth = AUTH_PROVIDER === 'clerk' || !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Returns the configured client auth provider singleton.
 *
 * Reads `VITE_AUTH_PROVIDER` (or auto-detects from `VITE_CLERK_PUBLISHABLE_KEY`):
 *  - 'dev' (default) — JWT/localStorage
 *  - 'clerk' — Clerk SSO
 *  - 'entra'  — Microsoft Entra ID (MSAL)
 *  - 'google' — Google Identity (GIS)
 */
export function getClientAuthProvider(): ClientAuthProvider {
  if (_instance) return _instance;

  if (isClerkAuth) {
    _instance = new ClerkAuthClient();
  } else if (AUTH_PROVIDER === 'entra') {
    _instance = new EntraAuthClient();
  } else if (AUTH_PROVIDER === 'google') {
    _instance = new GoogleAuthClient();
  } else {
    _instance = new DevAuthClient();
  }

  return _instance;
}
