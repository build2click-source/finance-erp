'use client';

import React, { useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { useToast } from '@/lib/hooks/useToast';

interface PaymentsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function PaymentsView({ onNavigate }: PaymentsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const { data: paymentsResp, loading, revalidate } = useApi<any>(`/api/payments?page=${page}&limit=${limit}`);
  const payments = paymentsResp?.data || [];
  const pagination = paymentsResp?.pagination || { total: 0 };
  const summary = paymentsResp?.summary || { totalAmount: 0 };

  const totalPaid = summary.totalAmount;

  if (isCreating) {
    return (
      <PaymentForm
        onCancel={() => setIsCreating(false)}
        onSuccess={() => { setIsCreating(false); revalidate(); }}
      />
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Vendor Payments (AP)"
        description="Record outgoing payments to vendors. Each payment is posted and debits your Accounts Payable."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Record Payment
            </Button>
          </>
        }
      />

      {/* Summary stat */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {[
          { label: 'Total Payments', value: formatINR(totalPaid), color: 'var(--color-command-red)' },
          { label: 'This Month', value: formatINR(payments.filter((p: any) => new Date(p.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s: number, p: any) => s + Number(p.amount), 0)), color: 'var(--color-command-amber)' },
          { label: 'No. of Payments', value: String(payments.length), color: 'var(--text-primary)' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-container)',
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>{stat.label}</p>
            <p className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: stat.color, marginTop: '4px' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <DataTable<any>
        columns={[
          {
            key: 'paymentNumber',
            header: 'Payment #',
            render: (p) => (
              <span style={{ fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                {p.paymentNumber}
              </span>
            ),
          },
          {
            key: 'client',
            header: 'Vendor',
            render: (p) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{p.client?.name}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{p.bankAccount?.bankName}</p>
              </div>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            render: (p) => (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                {new Date(p.date).toLocaleDateString('en-IN')}
              </span>
            ),
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (p) => (
              <span className="currency" style={{ fontWeight: 600, color: 'var(--color-command-red)', fontSize: 'var(--text-sm)' }}>
                {formatINR(Number(p.amount))}
              </span>
            ),
          },
          {
            key: 'paymentMode',
            header: 'Mode',
            render: (p) => <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{p.paymentMode}</span>,
          },
          {
            key: 'referenceNumber',
            header: 'Reference',
            render: (p) => (
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {p.referenceNumber || '—'}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (p) => (
              <Badge variant={p.status === 'posted' ? 'success' : 'default'}>
                {(p.status || 'posted').toUpperCase()}
              </Badge>
            ),
          },
        ]}
        data={payments}
        loading={loading}
        totalCount={pagination.total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        searchPlaceholder="Search by payment #, vendor..."
      />
    </div>
  );
}

/* ─── Payment Form ──────────────────────────────────────────────────────── */
function PaymentForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { data: clientsResp } = useApi<any>('/api/clients');
  const { data: banksResp } = useApi<any>('/api/banks');
  const { data: billsResp } = useApi<any>('/api/vendor-bills');
  const vendors = (clientsResp?.data || []).filter((c: any) => c.type === 'Vendor' || c.type === 'Both');
  const banks = banksResp?.data || [];
  const pendingBills = (billsResp?.data || []).filter((b: any) => b.status === 'posted');
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    bankAccountId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'NEFT',
    referenceNumber: '',
    notes: '',
    vendorBillId: '',
  });

  const handleBillSelect = (billId: string) => {
    if (!billId) {
      setForm({ ...form, vendorBillId: '' });
      return;
    }
    const bill = pendingBills.find((b: any) => b.id === billId);
    if (bill) {
      setForm({
        ...form,
        vendorBillId: billId,
        clientId: bill.vendorId,
        amount: String(bill.totalAmount),
      });
    }
  };

  const handleSave = async () => {
    if (!form.clientId || !form.bankAccountId || !form.amount) {
      error('Vendor, Bank, and Amount are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          bankAccountId: form.bankAccountId,
          date: form.date,
          amount: Number(form.amount),
          paymentMode: form.paymentMode,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
          vendorBillId: form.vendorBillId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      success('Payment posted and AP journal created.');
      onSuccess();
    } catch (e: any) {
      error(e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Record Vendor Payment"
        description="Post an outgoing payment to a vendor. This will debit Accounts Payable and credit the bank."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.clientId || !form.bankAccountId || !form.amount}>
              <ArrowUpRight size={16} /> {saving ? 'Posting...' : 'Post Payment'}
            </Button>
          </>
        }
      />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Settle Vendor Bill (Optional)"
            value={form.vendorBillId}
            onChange={e => handleBillSelect(e.target.value)}
            options={[
              { value: '', label: 'Standalone Payment' },
              ...pendingBills.map((b: any) => ({ value: b.id, label: `${b.billNumber} (${formatINR(b.totalAmount)}) - ${b.vendor?.name}` }))
            ]}
          />
          <Select
            label="Vendor" required
            value={form.clientId}
            onChange={e => setForm({ ...form, clientId: e.target.value })}
            options={[{ value: '', label: 'Select Vendor' }, ...vendors.map((v: any) => ({ value: v.id, label: v.name }))]}
            disabled={!!form.vendorBillId}
          />
          <Select
            label="Bank Account (Paying From)" required
            value={form.bankAccountId}
            onChange={e => setForm({ ...form, bankAccountId: e.target.value })}
            options={[{ value: '', label: 'Select Bank' }, ...banks.map((b: any) => ({ value: b.id, label: b.bankName || b.name }))]}
          />
          <Input
            label="Payment Date" type="date" required
            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label="Payment Mode"
            value={form.paymentMode}
            onChange={e => setForm({ ...form, paymentMode: e.target.value })}
            options={['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'].map(m => ({ value: m, label: m }))}
          />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Amount <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontWeight: 600 }}>₹</span>
              <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <Input
            label="UTR / Reference Number"
            placeholder="e.g. UTR123456789"
            value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
          />
          <div style={{ gridColumn: 'span 2' }}>
            <Input
              label="Notes / Memo"
              placeholder="What is this payment for?"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
