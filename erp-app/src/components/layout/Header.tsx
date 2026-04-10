'use client';

import React from 'react';
import { Search, Bell, Menu, LayoutDashboard, ChevronRight, UserCog } from 'lucide-react';
import { navItems, ViewId } from './Sidebar';
import { useRole } from '@/lib/hooks/useRole';

interface HeaderProps {
  activeView: ViewId;
  onOpenMobileMenu: () => void;
}

export function Header({ activeView, onOpenMobileMenu }: HeaderProps) {
  const currentNav = navItems.find((i) => i.id === activeView);
  const { role, setRole } = useRole();

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

        {/* Role Toggle */}
        <button
          onClick={() => setRole(role === 'admin' ? 'data_entry' : 'admin')}
          title={`Currently: ${role === 'admin' ? 'Admin' : 'Data Entry'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: role === 'admin' ? 'var(--color-command-navy)' : 'var(--surface-container-high)',
            color: role === 'admin' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
          }}
        >
          <UserCog size={16} />
          {role === 'admin' ? 'Admin' : 'Clerk'}
        </button>

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
      </div>
    </header>
  );
}
