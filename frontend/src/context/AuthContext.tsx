import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';
import { clearStoredAuth, getStoredAuth, setStoredAuth, type StoredUser } from '../lib/authStorage';

interface AuthContextValue {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: StoredUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(() => getStoredAuth()?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Revalidate against the server once on load, in case the stored user is stale
    // (role/status changed elsewhere) or the access token has already expired.
    const auth = getStoredAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get('/users/me')
      .then(({ data }) => setUserState(data))
      .catch(() => {
        clearStoredAuth();
        setUserState(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setStoredAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUserState(data.user);
  };

  const logout = async () => {
    const auth = getStoredAuth();
    if (auth?.refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: auth.refreshToken });
      } catch {
        // best-effort - clear local state regardless
      }
    }
    clearStoredAuth();
    setUserState(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, login, logout, setUser: setUserState }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
