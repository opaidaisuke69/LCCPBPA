import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken, clearAccountCache } from './api';

type Role = { code: string; name: string; category: string };
type User = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  must_change_pw: boolean;
  roles: Role[];
  permissions: string[];
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (code: string) => boolean;
};

const Context = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password, device_label: 'mobile' });
    await setToken(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user as User;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    await setToken(null);
    await clearAccountCache();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (perm: string) => user?.permissions?.includes(perm) ?? false,
    [user],
  );
  const hasRole = useCallback(
    (code: string) => user?.roles?.some((r) => r.code === code) ?? false,
    [user],
  );

  return (
    <Context.Provider value={{ user, loading, login, logout, hasPermission, hasRole }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
