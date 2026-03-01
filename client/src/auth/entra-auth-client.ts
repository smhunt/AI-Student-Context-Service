import type { ClientAuthProvider } from './auth-provider-client.js';
import type { UserInfo } from '../api/client.js';

const API = import.meta.env.VITE_API_URL || 'https://dev.ecoworks.ca:3094';

/**
 * Entra ID (Azure AD) client auth provider — stub implementation.
 *
 * Uses MSAL.js for browser-side token acquisition.
 * Full implementation requires:
 *  1. Install @azure/msal-browser
 *  2. Configure MSAL with tenant ID and client ID
 *  3. Implement redirect/popup auth flow
 *  4. Handle token refresh via MSAL's acquireTokenSilent
 *
 * Env vars:
 *  - VITE_ENTRA_TENANT_ID
 *  - VITE_ENTRA_CLIENT_ID
 */
export class EntraAuthClient implements ClientAuthProvider {
  readonly name = 'entra';
  private token: string | null = null;

  async login(_email: string, _password: string): Promise<{ token: string; user: UserInfo }> {
    // In production, use MSAL popup/redirect flow:
    // const msalInstance = new PublicClientApplication({ auth: { clientId, authority } });
    // const response = await msalInstance.loginPopup({ scopes: ['openid', 'profile', 'email'] });
    // this.token = response.idToken;

    throw new Error(
      'Entra ID login requires MSAL browser integration. ' +
      'Configure @azure/msal-browser with your tenant and client IDs.'
    );
  }

  logout(): void {
    this.token = null;
    // In production: msalInstance.logoutPopup() or logoutRedirect()
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
