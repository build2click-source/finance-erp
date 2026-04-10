'use client';

import React, { useState } from 'react';
import { Plus, BookOpen, ChevronRight } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { useToast } from '@/lib/hooks/useToast';

interface AccountsViewProps {
  onNavigate: (view: ViewId) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Asset: 'success',
  Liability: 'danger',
  Equity: 'warning',
  Revenue: 'info',
  Expense: 'default',
};

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export function AccountsView({ onNavigate }: AccountsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: accountsResp, loading, revalidate } = useApi<any>('/api/accounts');
  const accounts = (accountsResp?.data || []).filter((a: any) =>
    typeFilter === 'all' ? true : a.type === typeFilter
  );

  if (isCreating) {
    return (
      <AccountForm
        onCancel={() => setIsCreating(false)}
        onSuccess={() => { setIsCreating(false); revalidate(); }}
      />
    );
  }

  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a: any) => a.type === type);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Chart of Accounts"
        description="Manage the double-entry account structure. All financial reports depend on these accounts."
        actions={
          <>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                height: '36px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
                color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
              }}
            >
              <option value="all">All Types</option>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Add Account
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-3)' }}>
        {ACCOUNT_TYPES.map((type) => {
          const all = (accountsResp?.data || []).filter((a: any) => a.type === type);
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              style={{
                padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                border: `1px solid ${typeFilter === type ? 'var(--color-command-navy)' : 'var(--border-subtle)'}`,
                backgroundColor: typeFilter === type ? 'var(--surface-container-high)' : 'var(--surface-container)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-data)',
              }}
            >
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{type}</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{all.length}</p>
            </button>
          );
        })}
      </div>

      <DataTable<any>
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (a) => (
              <span style={{ fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                {a.code}
              </span>
            ),
          },
          {
            key: 'name',
            header: 'Account Name',
            render: (a) => (
              <div>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{a.name}</p>
                {a.parent && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    Parent: {a.parent.code} — {a.parent.name}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (a) => (
              <Badge variant={TYPE_COLORS[a.type] as any}>{a.type}</Badge>
            ),
          },
          {
            key: 'subType',
            header: 'Sub-Type',
            render: (a) => <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{a.subType || '—'}</span>,
          },
          {
            key: 'currency',
            header: 'Currency',
            render: (a) => <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{a.currency}</span>,
          },
          {
            key: '_count',
            header: 'Entries',
            render: (a) => (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)' }}>
                {a._count?.journalEntries ?? 0}
              </span>
            ),
          },
        ]}
        data={accounts}
        loading={loading}
        searchPlaceholder="Search by code or name..."
        renderRowActions={(a: any) => (
          <button
            onClick={() => {
              // Navigate to ledger view filtered by this account
              onNavigate('ledger');
            }}
            style={{
              fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            Ledger <ChevronRight size={14} />
          </button>
        )}
      />
    </div>
  );
}

/* ─── Account Creation Form ─────────────────────────────────────────────── */
function AccountForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { data: allAccountsResp } = useApi<any>('/api/accounts');
  const allAccounts = allAccountsResp?.data || [];
  const { success, error } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'Asset',
    subType: '',
    currency: 'INR',
    parentId: '',
    isPandL: false,
  });

  const handleSave = async () => {
    if (!form.code || !form.name) {
      error('Code and Name are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          subType: form.subType || undefined,
          currency: form.currency,
          parentId: form.parentId || undefined,
          isPandL: form.isPandL,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create account');
      }
      success(`Account ${form.code} — ${form.name} created.`);
      onSuccess();
    } catch (e: any) {
      error(e.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="New Account"
        description="Add a new account to the Chart of Accounts."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
              {saving ? 'Saving...' : 'Create Account'}
            </Button>
          </>
        }
      />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Input
            label="Account Code" required
            placeholder="e.g. 1010, 2100, 4000"
            value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
            style={{ fontFamily: 'var(--font-data)' }}
          />
          <Select
            label="Account Type" required
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={ACCOUNT_TYPES.map(t => ({ value: t, label: t }))}
          />
          <div style={{ gridColumn: 'span 2' }}>
            <Input
              label="Account Name" required
              placeholder="e.g. Bank — Bandhan, Accounts Receivable, GST Payable..."
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <Input
            label="Sub-Type (Optional)"
            placeholder="e.g. current, fixed, operating..."
            value={form.subType} onChange={e => setForm({ ...form, subType: e.target.value })}
          />
          <Select
            label="Currency"
            value={form.currency}
            onChange={e => setForm({ ...form, currency: e.target.value })}
            options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }]}
          />
          <div style={{ gridColumn: 'span 2' }}>
            <Select
              label="Parent Account (Optional)"
              value={form.parentId}
              onChange={e => setForm({ ...form, parentId: e.target.value })}
              options={[
                { value: '', label: '— No parent (top-level) —' },
                ...allAccounts.map((a: any) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
              ]}
            />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="isPandL"
              checked={form.isPandL}
              onChange={e => setForm({ ...form, isPandL: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isPandL" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Include in P&L statement
            </label>
          </div>
        </div>
      </Card>

      {/* Quick reference */}
      <Card>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Standard Account Code Ranges
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-3)' }}>
          {[
            { range: '1000–1999', type: 'Assets', color: 'var(--color-command-green)' },
            { range: '2000–2999', type: 'Liabilities', color: 'var(--color-command-red)' },
            { range: '3000–3999', type: 'Equity', color: 'var(--color-command-amber)' },
            { range: '4000–4999', type: 'Revenue', color: '#6366f1' },
            { range: '5000–5999', type: 'Expenses', color: '#f97316' },
          ].map(item => (
            <div key={item.type} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-container-high)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: item.color, textTransform: 'uppercase' }}>{item.type}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-data)', marginTop: '2px' }}>{item.range}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
