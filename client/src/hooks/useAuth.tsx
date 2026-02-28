import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserInfo } from '../api/client.js';
import { getClientAuthProvider } from '../auth/index.js';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const authProvider = getClientAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing token on mount
  useEffect(() => {
    const token = authProvider.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authProvider.getUser()
      .then((u) => setUser(u))
      .catch(() => authProvider.logout())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await authProvider.login(email, password);
    authProvider.setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authProvider.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
