import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AuthContext } from './auth-context.js';
import { getClientAuthProvider } from './index.js';

/**
 * Clerk auth bridge — renders AuthContext.Provider with Clerk-derived state.
 *
 * Must be rendered inside <ClerkProvider>.
 * Uses Clerk's useAuth() hook to get session tokens, then fetches
 * our internal user from the backend via the auth provider.
 */

const authProvider = getClientAuthProvider();

export default function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const [user, setUser] = useState<import('../api/client.js').UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      authProvider.logout();
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    getToken().then(async (token) => {
      if (cancelled) return;
      if (!token) {
        setLoading(false);
        return;
      }

      authProvider.setToken(token);
      try {
        const u = await authProvider.getUser();
        if (!cancelled) setUser(u);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Auth failed');
      }
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  const login = useCallback(async () => {
    // Clerk handles sign-in via <SignIn> component
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    authProvider.logout();
    setUser(null);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
