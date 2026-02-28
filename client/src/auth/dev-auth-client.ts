import type { ClientAuthProvider } from './auth-provider-client.js';
import type { UserInfo } from '../api/client.js';
import {
  login as apiLogin,
  getMe,
  setToken as storeToken,
  clearToken,
  getToken as readToken,
} from '../api/client.js';

/**
 * Development auth client — wraps existing JWT/localStorage login flow.
 * All current behavior is preserved identically.
 */
export class DevAuthClient implements ClientAuthProvider {
  readonly name = 'dev';

  async login(email: string, password: string) {
    return apiLogin(email, password);
  }

  logout() {
    clearToken();
  }

  getToken() {
    return readToken();
  }

  setToken(token: string) {
    storeToken(token);
  }

  async getUser(): Promise<UserInfo> {
    const { user } = await getMe();
    return user;
  }
}
