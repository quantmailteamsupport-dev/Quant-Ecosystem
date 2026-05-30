'use client';

import { createContext, useContext, useState } from 'react';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'SUPERADMIN';
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<AdminUser>({
    id: 'admin-001',
    email: 'admin@quant.dev',
    username: 'admin',
    displayName: 'System Admin',
    role: 'SUPERADMIN',
  });

  const value: AdminAuthContextValue = {
    user,
    isLoading: false,
    isAuthenticated: true,
    isAdmin: user.role === 'ADMIN' || user.role === 'SUPERADMIN',
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (ctx === undefined) {
    throw new Error('useAdminAuth must be used within an AuthProvider');
  }
  return ctx;
}
