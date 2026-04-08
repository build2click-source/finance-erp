'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface ReceiptsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ReceiptsView({ onNavigate }: ReceiptsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: receiptsData, loading, revalidate } = useApi<any>('/api/receipts?limit=100');
  const receipts = receiptsData?.data || [];

  if (isCreating) {
    return <ReceiptForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Receipts Log"
        description="Track incoming payments and bank reconciliations."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Receipt
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'id',
            header: 'Receipt ID',
            render: (r) => <span className="font-technical" style={{ fontWeight: 500 }}>{r.receiptNumber}</span>,
          },
          { key: 'client', header: 'Client', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.client?.name}</span> },
          { key: 'bank', header: 'Bank', render: (r) => <span style={{ color: 'var(--text-tertiary)' }}>{r.bankAccount?.bankName}</span> },
          {
            key: 'amount',
            header: 'Amount',
            render: (r) => <span className="currency" style={{ fontWeight: 500 }}>{formatINR(r.amount)}</span>,
          },
          { key: 'date', header: 'Date', render: (r) => <span style={{ color: 'var(--text-tertiary)' }}>{new Date(r.transactionDate).toLocaleDateString()}</span> },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <Badge variant={r.status === 'Cleared' ? 'success' : r.status === 'Bounced' ? 'danger' : 'warning'}>
                {r.status}
              </Badge>
            ),
          },
        ]}
        data={receipts}
        loading={loading}
        searchPlaceholder="Search by receipt #, client..."
        renderRowActions={(r: any) => (
          <button
            onClick={() => {
              const msg = `Receipt: ${r.receiptNumber}\nClient: ${r.client?.name || '—'}\nAmount: ₹${Number(r.amount).toLocaleString('en-IN')}\nBank: ${r.bankAccount?.bankName || '—'}\nDate: ${new Date(r.transactionDate).toLocaleDateString()}\nStatus: ${r.status}`;
              alert(msg);
            }}
            style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Details
          </button>
        )}
      />
    </div>
  );
}

/* ============================================================
   RECEIPT ENTRY FORM
   ============================================================ */
function ReceiptForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { data: banksResp } = useApi<any>('/api/banks');
  const banks = banksResp?.data || [];
  const { data: clientsResp } = useApi<any>('/api/clients');
  const clients = clientsResp?.data || [];
  const { mutate } = useApi('/api/receipts');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bankAccountId: '',
    clientId: '',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'NEFT',
    tdsDeducted: '0',
    status: 'Cleared',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutate('POST', {
        type: 'Receipt',
        bankAccountId: formData.bankAccountId,
        clientId: formData.clientId,
        amount: Number(formData.amount),
        transactionDate: formData.transactionDate,
        reference: formData.reference,
        paymentMethod: formData.paymentMethod,
        tdsDeducted: Number(formData.tdsDeducted) || 0,
        status: formData.status,
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Record Receipt"
        description="Log an incoming payment into a specific bank account."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.bankAccountId || !formData.clientId || !formData.amount}>
              {saving ? 'Saving...' : 'Save Receipt'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            <Select
              label="Bank Account"
              value={formData.bankAccountId}
              onChange={e => setFormData({ ...formData, bankAccountId: e.target.value })}
              options={[
                { value: '', label: 'Select Receiving Bank' },
                ...banks.map((b: any) => ({ value: b.id, label: b.bankName })),
              ]}
            />
            <Select
              label="Client (Payer)"
              value={formData.clientId}
              onChange={e => setFormData({ ...formData, clientId: e.target.value })}
              options={[
                { value: '', label: 'Select Payer' },
                ...clients.map((c: any) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Transaction Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <Input label="Bill / Invoice Number" placeholder="e.g. INV-2026-02" />
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={[
                  { value: 'NEFT', label: 'NEFT' },
                  { value: 'RTGS', label: 'RTGS' },
                  { value: 'IMPS', label: 'IMPS' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Wire', label: 'Wire Transfer' },
                ]}
              />
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Received Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  TDS Deducted
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.tdsDeducted} onChange={e => setFormData({ ...formData, tdsDeducted: e.target.value })} />
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Transaction Reference Number (UTR)" placeholder="e.g. UTR123456789" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />
              </div>
              <Input label="Transaction Date" type="date" value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })} />
              <Input label="Instrument Date" type="date" defaultValue="2026-04-01" />
              <Input label="Clearing Date" type="date" defaultValue="2026-04-01" />
              <div style={{ gridColumn: 'span 2' }}>
                <Select
                  label="Payment Status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'Cleared', label: 'Cleared' },
                    { value: 'Pending', label: 'Pending Validation' },
                    { value: 'Bounced', label: 'Bounced / Failed' },
                  ]}
                />
              </div>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
