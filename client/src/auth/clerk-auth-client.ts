import type { ClientAuthProvider } from './auth-provider-client.js';
import type { UserInfo } from '../api/client.js';

/**
 * Clerk auth client — bridges Clerk's React-managed auth state
 * with our ClientAuthProvider interface.
 *
 * Token lifecycle is managed by Clerk hooks (useAuth/useSession)
 * which call setToken() whenever the session token changes.
 * The login flow is handled by Clerk's <SignIn> component.
 */

let _token: string | null = null;

export class ClerkAuthClient implements ClientAuthProvider {
  readonly name = 'clerk';

  async login(_email: string, _password: string): Promise<{ token: string; user: UserInfo }> {
    // Clerk handles sign-in via <SignIn> component — this is never called directly
    throw new Error('Use Clerk sign-in flow');
  }

  logout() {
    _token = null;
    // Actual Clerk sign-out is handled by the React hook
  }

  getToken() {
    return _token;
  }

  setToken(token: string) {
    _token = token;
  }

  async getUser(): Promise<UserInfo> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        _token = null;
        throw new Error('Session expired');
      }
      throw new Error('Failed to fetch user');
    }

    const data = await res.json();
    return data.user;
  }
}
