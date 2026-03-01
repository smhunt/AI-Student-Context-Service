import type { ClientAuthProvider } from './auth-provider-client.js';
import type { UserInfo } from '../api/client.js';

const API = import.meta.env.VITE_API_URL || 'https://dev.ecoworks.ca:3094';

/**
 * Google Identity client auth provider — stub implementation.
 *
 * Uses Google Identity Services (GIS) for one-tap / button sign-in.
 * Full implementation requires:
 *  1. Load the Google Identity Services script
 *  2. Initialize google.accounts.id with client ID
 *  3. Handle credential callback to get ID token
 *
 * Env vars:
 *  - VITE_GOOGLE_AUTH_CLIENT_ID
 */
export class GoogleAuthClient implements ClientAuthProvider {
  readonly name = 'google';
  private token: string | null = null;

  async login(_email: string, _password: string): Promise<{ token: string; user: UserInfo }> {
    // In production, use Google Identity Services:
    // google.accounts.id.initialize({ client_id: VITE_GOOGLE_AUTH_CLIENT_ID, callback: ... });
    // google.accounts.id.prompt(); // One Tap
    // Or render a sign-in button

    throw new Error(
      'Google login requires Google Identity Services integration. ' +
      'Configure the GIS script with your client ID.'
    );
  }

  logout(): void {
    this.token = null;
    // In production: google.accounts.id.disableAutoSelect()
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async getUser(): Promise<UserInfo> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  }
}
