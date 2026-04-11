'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPermissions, getAllowedViews, AppRoleType, Permissions } from '@/lib/permissions';

export type UserRole = AppRoleType;

export interface SessionUser {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  email?: string | null;
}

interface RoleContextType extends Permissions {
  user: SessionUser | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  allowedViews: string[];
  logout: () => Promise<void>;
  // Legacy compat
  setRole: (role: UserRole) => void;
  canManageLedger: boolean;
  canFinalizeInvoices: boolean;
  canManageUsers: boolean;
}

const defaultPerms = getPermissions('admin');

const RoleContext = createContext<RoleContextType>({
  user: null,
  role: 'admin',
  isLoading: true,
  isAuthenticated: false,
  allowedViews: getAllowedViews('admin'),
  logout: async () => {},
  setRole: () => {},
  ...defaultPerms,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser & { policy?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const { data } = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  }, []);

  const role: UserRole = (user?.role as UserRole) ?? 'data_entry';
  
  // Dynamic permissions from server, with hardcoded fallback
  const perms = getPermissions(role, user?.policy?.permissions);
  const allowedViews = getAllowedViews(role, user?.policy?.allowedViews);

  return (
    <RoleContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated: !!user,
        allowedViews,
        logout,
        setRole: () => {}, 
        ...perms,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
