'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAccessToken } from '@/lib/api-client';
import type { User } from '@/lib/api-types';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to refresh on mount to restore session
    fetch('/api/auth/refresh', { method: 'POST' })
      .then((r) => r.ok ? r.json() : null)
      .then(async (data: { accessToken?: string } | null) => {
        if (data?.accessToken) {
          setToken(data.accessToken);
          setAccessToken(data.accessToken);
          // Fetch user info
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
          const userRes = await fetch(`${apiUrl}/api/users/me`, {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json() as User;
            setUser(userData);
          }
        }
      })
      .catch(() => {/* not authenticated */})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((token: string, userData: User) => {
    setToken(token);
    setAccessToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setToken(null);
    setAccessToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
