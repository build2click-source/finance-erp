'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { useToast } from '@/lib/hooks/useToast';
import { BankReconciliation } from './BankReconciliation';

interface BankViewProps {
  onNavigate: (view: ViewId) => void;
}

export function BankView({ onNavigate }: BankViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [reconcileBank, setReconcileBank] = useState<any | null>(null);
  const [detailBank, setDetailBank] = useState<any | null>(null);
  const { data: banksResp, loading, revalidate } = useApi<any>('/api/banks');
  const banks = banksResp?.data || [];

  if (isCreating) {
    return <BankForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  if (reconcileBank) {
    return (
      <BankReconciliation 
        bankId={reconcileBank.id} 
        bankName={reconcileBank.bankName} 
        onBack={() => setReconcileBank(null)} 
      />
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Bank Accounts"
        description="Manage company bank accounts linked to the General Ledger."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Add Bank
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'name',
            header: 'Bank Name',
            render: (b) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{b.bankName}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {b.status === 'Active' ? '● Active' : '○ Inactive'}
                </p>
              </div>
            ),
          },
          {
            key: 'accountNo',
            header: 'Account Number',
            render: (b) => <span className="font-technical" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>{b.accountNumber}</span>,
          },
          { key: 'branch', header: 'Branch', render: (b) => <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{b.branch || '—'}</span> },
          {
            key: 'ifsc',
            header: 'IFSC',
            render: (b) => <span className="font-technical" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)' }}>{b.ifsc || '—'}</span>,
          },
          {
            key: 'currency',
            header: 'Currency',
            render: (b) => <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{b.currency}</span>,
          },
        ]}
        data={banks || []}
        loading={loading}
        searchPlaceholder="Search by bank name, account, IFSC..."
        renderRowActions={(b: any) => (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setReconcileBank(b)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-command-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Reconcile
            </button>
            <button
              onClick={() => setDetailBank(b)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Details
            </button>
          </div>
        )}
      />

      {/* Detail slide-over */}
      {detailBank && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDetailBank(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-6)', width: '400px', maxWidth: '90vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{detailBank.bankName}</h3>
              <button onClick={() => setDetailBank(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            {[
              { label: 'Account Number', value: detailBank.accountNumber },
              { label: 'IFSC Code', value: detailBank.ifsc || '—' },
              { label: 'Branch', value: detailBank.branch || '—' },
              { label: 'Currency', value: detailBank.currency },
              { label: 'Status', value: detailBank.status },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{row.label}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Bank Creation Form ─────────────────────────────────────────────────── */
function BankForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { data: accountsResp } = useApi<any>('/api/accounts?type=Asset');
  const assetAccounts = accountsResp?.data || [];
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    accountId: '',
  });

  const handleSave = async () => {
    if (!formData.bankName || !formData.accountNumber || !formData.accountId) {
      error('Bank Name, Account Number, and Ledger Account are all required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          branch: formData.branch,
          accountId: formData.accountId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add bank');
      }
      success(`Bank account "${formData.bankName}" added and linked to ledger.`);
      onSuccess();
    } catch (e: any) {
      error(e.message || 'Failed to add bank');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Add Bank Account"
        description="Register a company bank account and map it to a Ledger (Asset) account."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.bankName || !formData.accountNumber || !formData.accountId}>
              {saving ? 'Saving...' : 'Save Account'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Input label="Bank Name" placeholder="e.g. State Bank of India" required value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
          </div>
          <Input label="Account Number" required placeholder="Enter account number" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
          <Input label="IFSC Code" placeholder="e.g. SBIN0001234" value={formData.ifscCode} onChange={e => setFormData({ ...formData, ifscCode: e.target.value })} />
          <Input label="Branch Name" placeholder="e.g. Kolkata Main" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} />
          <div style={{ gridColumn: 'span 2' }}>
            <Select
              label="Ledger Account Mapping (Asset)" required
              value={formData.accountId}
              onChange={e => setFormData({ ...formData, accountId: e.target.value })}
              options={[
                { value: '', label: assetAccounts.length === 0 ? 'No asset accounts found — add accounts first' : 'Select Ledger Account' },
                ...assetAccounts.map((a: any) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
              ]}
            />
            {assetAccounts.length === 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-command-amber)', marginTop: '6px' }}>
                ⚠ No Asset accounts found. Create accounts in Chart of Accounts first.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
