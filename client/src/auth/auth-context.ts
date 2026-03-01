import { createContext } from 'react';
import type { UserInfo } from '../api/client.js';

export interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
