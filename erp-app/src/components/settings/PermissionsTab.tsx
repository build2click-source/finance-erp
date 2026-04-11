'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, Save, AlertCircle, Info, Lock } from 'lucide-react';
import { Card, Input } from '@/components/ui';
import { useToast } from '@/lib/hooks/useToast';
import { AppRoleType, Permissions } from '@/lib/permissions';

interface RolePolicy {
  role: AppRoleType;
  permissions: Permissions;
  allowedViews: string[];
}

const VIEW_METADATA = [
  { id: 'dashboard', label: 'Dashboard', group: 'General' },
  { id: 'clients', label: 'Clients', group: 'General' },
  { id: 'data-entry', label: 'Data Entry (Trades)', group: 'General' },
  { id: 'invoices', label: 'Sales Invoices', group: 'Sales' },
  { id: 'receipts', label: 'Receipts', group: 'Banking' },
  { id: 'payments', label: 'Payments', group: 'Banking' },
  { id: 'vendor-bills', label: 'Vendor Bills', group: 'Purchases' },
  { id: 'trade-summary', label: 'Trade Summary', group: 'General' },
  { id: 'transactions', label: 'Manual Journal', group: 'Accounting' },
  { id: 'ledger', label: 'General Ledger', group: 'Accounting' },
  { id: 'bank', label: 'Bank Reconciliation', group: 'Banking' },
  { id: 'accounts', label: 'Chart of Accounts', group: 'Accounting' },
  { id: 'financial-reports', label: 'Financial Reports (BS/PL)', group: 'Reports' },
  { id: 'outstanding', label: 'Outstanding Reports', group: 'Reports' },
  { id: 'tax-reports', label: 'Tax Reports', group: 'Reports' },
  { id: 'gst-reports', label: 'GST Reports', group: 'Reports' },
  { id: 'products', label: 'Products', group: 'Inventory' },
  { id: 'tenure', label: 'Billing Tenures', group: 'Sales' },
  { id: 'settings', label: 'Settings', group: 'General' },
];

const PERM_LABELS: Record<keyof Permissions, { label: string; desc: string }> = {
  canManageLedger: { label: 'Manage Ledger', desc: 'Can view/edit manual journals, COA, and bank reconciliation.' },
  canFinalizeInvoices: { label: 'Finalize Invoices', desc: 'Can post or cancel draft invoices.' },
  canViewReports: { label: 'View Reports', desc: 'Access to financial statements and tax reports.' },
  canManageUsers: { label: 'Manage Users', desc: 'Can create and edit system users and roles.' },
  canManageProducts: { label: 'Manage Products', desc: 'Can manage product catalog and billing tenures.' },
  canPostVendorBills: { label: 'Post Vendor Bills', desc: 'Can post or cancel vendor bills for ITC.' },
  canManageClients: { label: 'Manage Clients', desc: 'Can create and edit client profiles.' },
  canDoDataEntry: { label: 'Data Entry', desc: 'Basic trade entry and cash counting.' },
};

export function PermissionsTab() {
  const { success, error } = useToast();
  const [policies, setPolicies] = useState<RolePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/permissions')
      .then(res => res.json())
      .then(d => {
        if (d.data) setPolicies(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTogglePerm = (role: AppRoleType, key: keyof Permissions) => {
    setPolicies(prev => prev.map(p => {
      if (p.role !== role) return p;
      return {
        ...p,
        permissions: { ...p.permissions, [key]: !p.permissions[key] }
      };
    }));
  };

  const handleToggleView = (role: AppRoleType, viewId: string) => {
    setPolicies(prev => prev.map(p => {
      if (p.role !== role) return p;
      const exists = p.allowedViews.includes(viewId);
      return {
        ...p,
        allowedViews: exists 
          ? p.allowedViews.filter(v => v !== viewId)
          : [...p.allowedViews, viewId]
      };
    }));
  };

  const savePolicy = async (policy: RolePolicy) => {
    setSaving(policy.role);
    try {
      const res = await fetch('/api/settings/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      if (res.ok) {
        success(`Permissions updated for ${policy.role}.`);
      } else {
        error('Failed to update permissions.');
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-tertiary)' }}>Loading policies...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {policies.map((policy) => (
        <Card key={policy.role} style={{ borderLeft: `4px solid ${policy.role === 'admin' ? '#6aadff' : policy.role === 'accountant' ? '#82c987' : '#d4b94a'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {policy.role.replace('_', ' ')} Role
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Configure what actions this role can perform and what they see.
              </p>
            </div>
            <button
              onClick={() => savePolicy(policy)}
              disabled={saving !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', height: '32px', padding: '0 16px',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--color-command-navy)', color: 'white', fontSize: 'var(--text-xs)',
                fontWeight: 600, fontFamily: 'var(--font-data)'
              }}
            >
              {saving === policy.role ? 'Saving...' : <><Save size={14} /> Save Policy</>}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            {/* Column 1: Feature Permissions */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Feature Permissions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(Object.keys(PERM_LABELS) as Array<keyof Permissions>).map((key) => {
                  const isAdminLocked = policy.role === 'admin' && key === 'canManageUsers';
                  return (
                    <div 
                      key={key} 
                      onClick={() => !isAdminLocked && handleTogglePerm(policy.role, key)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                        borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-container-low)', 
                        border: '1px solid var(--border-subtle)', cursor: isAdminLocked ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: isAdminLocked ? 0.7 : 1
                      }}
                    >
                      <div style={{ 
                        width: '18px', height: '18px', borderRadius: '4px', border: '2px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: policy.permissions[key] ? 'var(--color-command-navy)' : 'transparent',
                        borderColor: policy.permissions[key] ? 'var(--color-command-navy)' : 'var(--border-default)'
                      }}>
                        {policy.permissions[key] && <Check size={12} color="white" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{PERM_LABELS[key].label}</span>
                          {isAdminLocked && <Lock size={12} color="var(--text-tertiary)" />}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{PERM_LABELS[key].desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Dashboard Views */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Section Visibility</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', maxHeight: '440px', overflowY: 'auto', paddingRight: '8px' }}>
                {VIEW_METADATA.map((view) => {
                  const isAdminLocked = policy.role === 'admin' && view.id === 'settings';
                  const isSelected = policy.allowedViews.includes(view.id);
                  return (
                    <div 
                      key={view.id}
                      onClick={() => !isAdminLocked && handleToggleView(policy.role, view.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', 
                        borderRadius: '6px', cursor: isAdminLocked ? 'default' : 'pointer',
                        backgroundColor: isSelected ? 'rgba(59,106,219,0.05)' : 'transparent',
                        opacity: isAdminLocked ? 0.6 : 1
                      }}
                    >
                      <div style={{ 
                        width: '16px', height: '16px', borderRadius: '3px', border: '1.5px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? 'var(--color-command-navy)' : 'transparent',
                        borderColor: isSelected ? 'var(--color-command-navy)' : 'var(--border-default)'
                      }}>
                        {isSelected && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isSelected ? 500 : 400 }}>
                        {view.label}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', opacity: 0.5, marginLeft: 'auto', textTransform: 'uppercase' }}>{view.group}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59,106,219,0.05)', border: '1px dashed rgba(59,106,219,0.2)', display: 'flex', gap: '10px' }}>
                <Info size={14} color="var(--color-command-navy)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Items disabled here will be hidden from the role's sidebar and navigation.
                </p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
