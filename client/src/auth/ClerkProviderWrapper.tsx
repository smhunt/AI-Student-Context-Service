import { ClerkProvider } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

/**
 * Wraps children in ClerkProvider. Only loaded when Clerk auth is active
 * (code-split via React.lazy in App.tsx).
 */
export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    console.error('VITE_CLERK_PUBLISHABLE_KEY is required when using Clerk auth');
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
