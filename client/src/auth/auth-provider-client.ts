import type { UserInfo } from '../api/client.js';

/**
 * Client-side auth provider interface.
 *
 * Implementations:
 *  - DevAuthClient  — JWT/localStorage (current)
 *  - (future) ClerkAuthClient, EntraAuthClient, GoogleAuthClient
 */
export interface ClientAuthProvider {
  /** Provider name */
  readonly name: string;

  /** Perform login. Returns user on success. */
  login(email: string, password: string): Promise<{ token: string; user: UserInfo }>;

  /** Clear session / log out */
  logout(): void;

  /** Get stored token (null if not authenticated) */
  getToken(): string | null;

  /** Set token after successful auth */
  setToken(token: string): void;

  /** Fetch current user profile from server */
  getUser(): Promise<UserInfo>;
}
