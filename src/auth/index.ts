import type { AuthProvider } from './auth-provider.js';
import { DevAuthProvider } from './dev-auth-provider.js';
import { config } from '../config/index.js';

export type { AuthProvider, AuthUser } from './auth-provider.js';

let _instance: AuthProvider | null = null;

/**
 * Returns the configured auth provider singleton.
 *
 * Reads `config.authProvider` (env: `AUTH_PROVIDER`):
 *  - 'dev' (default) — JWT/bcrypt dev-login
 *  - 'clerk'  — (future) Clerk integration
 *  - 'entra'  — (future) Microsoft Entra ID
 *  - 'google' — (future) Google Identity
 */
export function getAuthProvider(): AuthProvider {
  if (_instance) return _instance;

  switch (config.authProvider) {
    case 'dev':
      _instance = new DevAuthProvider();
      break;
    // Future providers:
    // case 'clerk':
    //   _instance = new ClerkAuthProvider();
    //   break;
    // case 'entra':
    //   _instance = new EntraAuthProvider();
    //   break;
    // case 'google':
    //   _instance = new GoogleAuthProvider();
    //   break;
    default:
      _instance = new DevAuthProvider();
  }

  return _instance;
}
