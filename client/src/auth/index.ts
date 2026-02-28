import type { ClientAuthProvider } from './auth-provider-client.js';
import { DevAuthClient } from './dev-auth-client.js';

export type { ClientAuthProvider } from './auth-provider-client.js';

let _instance: ClientAuthProvider | null = null;

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'dev';

/**
 * Returns the configured client auth provider singleton.
 *
 * Reads `VITE_AUTH_PROVIDER`:
 *  - 'dev' (default) — JWT/localStorage
 *  - 'clerk'  — (future) Clerk
 *  - 'entra'  — (future) Microsoft Entra ID
 *  - 'google' — (future) Google Identity
 */
export function getClientAuthProvider(): ClientAuthProvider {
  if (_instance) return _instance;

  switch (AUTH_PROVIDER) {
    case 'dev':
      _instance = new DevAuthClient();
      break;
    default:
      _instance = new DevAuthClient();
  }

  return _instance;
}
