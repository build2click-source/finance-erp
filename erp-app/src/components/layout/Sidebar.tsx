'use client';

import React from 'react';
import {
  Users, FileText, Calendar, ArrowRightLeft,
  BookOpen, Package, Landmark, LayoutDashboard,
  Receipt, X, TrendingUp, AlertTriangle, Shield, Settings,
} from 'lucide-react';
import { useRole } from '@/lib/hooks/useRole';

export type ViewId =
  | 'dashboard' | 'clients' | 'data-entry' | 'transactions' | 'receipts'
  | 'invoices' | 'ledger' | 'products' | 'bank' | 'tenure' | 'vendor-bills' | 'gst-reports'
  | 'trade-summary' | 'financial-reports' | 'outstanding' | 'tax-reports' | 'settings'
  | 'accounts' | 'payments';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'clients', label: 'Clients', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'data-entry', label: 'Data Entry', icon: ArrowRightLeft },
      { id: 'trade-summary', label: 'Trade Summary', icon: ArrowRightLeft },
      { id: 'transactions', label: 'Manual Journals', icon: BookOpen },
      { id: 'receipts', label: 'Receipts Entry', icon: Receipt },
      { id: 'payments', label: 'Vendor Payments', icon: ArrowRightLeft },
      { id: 'invoices', label: 'Sales Invoices', icon: FileText },
      { id: 'vendor-bills', label: 'Vendor Bills', icon: Receipt },
    ],
  },
  {
    title: 'Reports',
    items: [
      { id: 'financial-reports', label: 'Financial Reports', icon: TrendingUp },
      { id: 'outstanding', label: 'Outstanding & Aging', icon: AlertTriangle },
      { id: 'tax-reports', label: 'Tax & Compliance', icon: Shield },
      { id: 'gst-reports', label: 'GST Filings (CA)', icon: FileText },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { id: 'accounts', label: 'Chart of Accounts', icon: BookOpen },
      { id: 'ledger', label: 'Ledger', icon: BookOpen },
      { id: 'bank', label: 'Bank & Reconcile', icon: Landmark },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'tenure', label: 'Billing Tenures', icon: Calendar },
    ],
  },
  {
    title: 'Admin',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Flat list for any consumers that need it
export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  accountant: 'Accountant',
  data_entry: 'Data Entry Clerk',
};

const ROLE_COLOR: Record<string, string> = {
  admin: 'var(--color-command-navy)',
  accountant: '#5a8a5e',
  data_entry: '#7a6a3a',
};

export function Sidebar({ activeView, onNavigate, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { user, role, allowedViews } = useRole();

  const handleNavigate = (view: ViewId) => {
    onNavigate(view);
    onCloseMobile();
  };

  // Filter sections/items to only those the current role can access
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedViews.includes(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  const initials = (user?.displayName ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(14, 22, 41, 0.4)',
            zIndex: 'var(--z-overlay)',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: isMobileOpen ? 'fixed' : undefined,
          top: 0,
          left: 0,
          bottom: 0,
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--surface-container)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 'var(--z-modal)',
          transform: isMobileOpen ? 'translateX(0)' : undefined,
          transition: 'transform var(--transition-slow)',
        }}
      >
        {/* Logo Header */}
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                backgroundColor: 'var(--color-command-navy)',
                padding: '6px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark size={18} style={{ color: 'var(--text-inverse)' }} />
            </div>
            <span
              className="font-display"
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              CommisERP
            </span>
          </div>
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: 'var(--space-6) var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            overflowY: 'auto',
          }}
        >
          {filteredSections.map((section, si) => (
            <React.Fragment key={si}>
              {section.title && (
                <p style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)', textTransform: 'uppercase',
                  padding: '12px 12px 4px',
                  marginTop: si > 0 ? 'var(--space-2)' : 0,
                }}>
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      fontFamily: 'var(--font-data)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      backgroundColor: isActive ? 'var(--surface-container-high)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <item.icon
                      size={18}
                      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                    />
                    {item.label}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-container-low)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: ROLE_COLOR[role] ?? 'var(--surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                color: 'white',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.displayName ?? 'Loading...'}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {ROLE_LABEL[role] ?? role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
