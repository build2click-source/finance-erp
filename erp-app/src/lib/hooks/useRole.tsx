'use client';

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'admin' | 'data_entry';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canManageLedger: boolean;
  canFinalizeInvoices: boolean;
  canManageUsers: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: 'admin',
  setRole: () => {},
  canManageLedger: true,
  canFinalizeInvoices: true,
  canManageUsers: true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');

  const canManageLedger = role === 'admin';
  const canFinalizeInvoices = role === 'admin';
  const canManageUsers = role === 'admin';

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        canManageLedger,
        canFinalizeInvoices,
        canManageUsers,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
