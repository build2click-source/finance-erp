/**
 * Permission flags derived from user roles.
 * Single source of truth — used by both useRole (client) and requireAuth (server).
 */

export type AppRoleType = 'admin' | 'accountant' | 'data_entry';

export interface Permissions {
  canManageLedger: boolean;      // Ledger, Bank, Chart of Accounts
  canFinalizeInvoices: boolean;  // Post / cancel invoices
  canViewReports: boolean;       // Financial, Tax, GST, Outstanding
  canManageUsers: boolean;       // Settings → User Management
  canManageProducts: boolean;    // Products, Billing Tenures
  canPostVendorBills: boolean;   // Post / cancel vendor bills
  canManageClients: boolean;     // Create / edit clients
  canDoDataEntry: boolean;       // Data Entry (Trades), Receipts, Payments
}

export function getPermissions(role: AppRoleType, dynamicPolicy?: Partial<Permissions>): Permissions {
  const defaults = getDefaultPermissions(role);
  if (!dynamicPolicy) return defaults;
  
  // Merge dynamic policy with defaults to ensure all keys exist
  return { ...defaults, ...dynamicPolicy };
}

function getDefaultPermissions(role: AppRoleType): Permissions {
  switch (role) {
    case 'admin':
      return {
        canManageLedger: true,
        canFinalizeInvoices: true,
        canViewReports: true,
        canManageUsers: true,
        canManageProducts: true,
        canPostVendorBills: true,
        canManageClients: true,
        canDoDataEntry: true,
      };

    case 'accountant':
      return {
        canManageLedger: true,
        canFinalizeInvoices: true,
        canViewReports: true,
        canManageUsers: false,
        canManageProducts: false,
        canPostVendorBills: true,
        canManageClients: false,
        canDoDataEntry: false,
      };

    case 'data_entry':
    default:
      return {
        canManageLedger: false,
        canFinalizeInvoices: false,
        canViewReports: false,
        canManageUsers: false,
        canManageProducts: false,
        canPostVendorBills: false,
        canManageClients: true,
        canDoDataEntry: true,
      };
  }
}

/** Sidebar nav items a given role may see */
export function getAllowedViews(role: AppRoleType, dynamicViews?: string[]): string[] {
  if (dynamicViews && dynamicViews.length > 0) {
    // Admin always gets settings regardless of dynamic policy (safety)
    const views = role === 'admin' && !dynamicViews.includes('settings') 
      ? [...dynamicViews, 'settings'] 
      : dynamicViews;
    return views;
  }

  const base = ['dashboard', 'clients', 'data-entry', 'invoices', 'receipts', 'payments', 'vendor-bills', 'trade-summary'];
  const accounting = ['transactions', 'ledger', 'bank', 'accounts'];
  const reports = ['financial-reports', 'outstanding', 'tax-reports', 'gst-reports'];
  const master = ['products', 'tenure'];
  const admin = ['settings'];

  switch (role) {
    case 'admin':
      return [...base, ...accounting, ...reports, ...master, ...admin];
    case 'accountant':
      return [...base, ...accounting, ...reports, ...admin];
    case 'data_entry':
    default:
      return [...base, 'settings'];
  }
}
