import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode, useContext } from 'react';
import type { UserInfo } from '../api/client.js';
import { getClientAuthProvider, isClerkAuth } from '../auth/index.js';
import { AuthContext } from '../auth/auth-context.js';

const authProvider = getClientAuthProvider();

// Lazy-load Clerk bridge — only imported when Clerk is active (code splitting)
const ClerkAuthBridge = isClerkAuth
  ? lazy(() => import('../auth/ClerkAuthBridge.js'))
  : null;

/**
 * Dev auth bridge — existing JWT/localStorage flow.
 */
function DevAuthBridge({ children }: { children: ReactNode }) {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isClerkAuth && ClerkAuthBridge) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </Suspense>
    );
  }
  return <DevAuthBridge>{children}</DevAuthBridge>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
