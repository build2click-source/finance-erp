'use client';

import React from 'react';
import { Search, Bell, Menu, LayoutDashboard, ChevronRight, LogOut } from 'lucide-react';
import { navItems, ViewId } from './Sidebar';
import { useRole } from '@/lib/hooks/useRole';

interface HeaderProps {
  activeView: ViewId;
  onOpenMobileMenu: () => void;
}

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: 'Admin', bg: 'rgba(59,106,219,0.15)', color: '#6aadff' },
  accountant: { label: 'Accountant', bg: 'rgba(90,138,94,0.15)', color: '#82c987' },
  data_entry: { label: 'Clerk', bg: 'rgba(180,160,80,0.15)', color: '#d4b94a' },
};

export function Header({ activeView, onOpenMobileMenu }: HeaderProps) {
  const currentNav = navItems.find((i) => i.id === activeView);
  const { user, role, logout } = useRole();
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE['data_entry'];

  return (
    <header
      style={{
        backgroundColor: 'var(--surface-container)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-8)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-dropdown)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          className="mobile-menu-btn"
          style={{
            display: 'none',
            padding: '8px',
            marginLeft: '-8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          <LayoutDashboard size={14} />
          <ChevronRight size={14} style={{ color: 'var(--border-default)' }} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {currentNav?.label || 'Dashboard'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            style={{
              paddingLeft: '32px',
              paddingRight: '12px',
              height: '32px',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-primary)',
              width: '192px',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        </div>

        {/* User + role badge */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)',
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.displayName}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px',
              borderRadius: '999px', backgroundColor: badge.bg, color: badge.color,
              letterSpacing: '0.03em',
            }}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--color-danger)',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--surface-container)',
            }}
          />
        </button>

        {/* Logout */}
        <button
          id="header-logout-btn"
          onClick={logout}
          title="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-danger)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  );
}
