'use client';

import React from 'react';
import {
  Users, FileText, Calendar, ArrowRightLeft,
  BookOpen, Package, Landmark, LayoutDashboard,
  Receipt, X,
} from 'lucide-react';

export type ViewId =
  | 'dashboard' | 'clients' | 'data-entry' | 'transactions' | 'receipts'
  | 'invoices' | 'ledger' | 'products' | 'bank' | 'tenure';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'data-entry', label: 'Data Entry', icon: ArrowRightLeft },
  { id: 'transactions', label: 'Manual Journals', icon: BookOpen },
  { id: 'receipts', label: 'Receipts Entry', icon: Receipt },
  { id: 'invoices', label: 'Sales Invoices', icon: FileText },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'bank', label: 'Bank & Reconcile', icon: Landmark },
  { id: 'tenure', label: 'Billing Tenures', icon: Calendar },
];

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ activeView, onNavigate, isMobileOpen, onCloseMobile }: SidebarProps) {
  const handleNavigate = (view: ViewId) => {
    onNavigate(view);
    onCloseMobile();
  };

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
          {navItems.map((item) => {
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
                backgroundColor: 'var(--surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
            >
              AD
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
                Admin User
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>admin@company.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
