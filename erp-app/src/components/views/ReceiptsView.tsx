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
  const [detailReceipt, setDetailReceipt] = useState<any | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const { data: receiptsData, loading, revalidate } = useApi<any>('/api/receipts?limit=100');
  const { data: banksResp } = useApi<any>('/api/banks');
  const { data: clientsResp } = useApi<any>('/api/clients');

  const receipts = receiptsData?.data || [];
  const banks = banksResp?.data || [];
  const clients = clientsResp?.data || [];

  const filteredReceipts = React.useMemo(() => {
    return receipts.filter((r: any) => {
      const date = new Date(r.transactionDate).toISOString().split('T')[0];
      const matchesDate = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
      const matchesBank = bankFilter === 'all' || r.bankAccountId === bankFilter;
      const matchesClient = clientFilter === 'all' || r.clientId === clientFilter;
      return matchesDate && matchesBank && matchesClient;
    });
  }, [receipts, fromDate, toDate, bankFilter, clientFilter]);

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
              <Badge variant={r.status === 'posted' ? 'success' : r.status === 'cancelled' ? 'danger' : r.status === 'draft' ? 'warning' : 'default'}>
                {r.status.toUpperCase()}
              </Badge>
            ),
          },
        ]}
        data={filteredReceipts}
        loading={loading}
        filters={
          <>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '150px' }} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '150px' }} />
            <Select
              value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Banks' }, ...banks.map((b: any) => ({ value: b.id, label: b.bankName }))]}
              style={{ width: '150px' }}
            />
            <Select
              value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Clients' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
              style={{ width: '180px' }}
            />
          </>
        }
        searchPlaceholder="Search by receipt #, client..."
        renderRowActions={(r: any) => (
          <button
            onClick={() => setDetailReceipt(r)}
            style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Details
          </button>
        )}
      />

      {/* Detail Modal */}
      {detailReceipt && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDetailReceipt(null)}
        >
          <div
            style={{ backgroundColor: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)', width: '420px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>Receipt — {detailReceipt.receiptNumber}</h3>
              <button onClick={() => setDetailReceipt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '20px' }}>✕</button>
            </div>
            {[
              { label: 'Client', value: detailReceipt.client?.name || '—' },
              { label: 'Amount', value: `₹${Number(detailReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: 'TDS Deducted', value: detailReceipt.tdsAmount ? `₹${Number(detailReceipt.tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—' },
              { label: 'Bank', value: detailReceipt.bankAccount?.bankName || '—' },
              { label: 'Payment Mode', value: detailReceipt.paymentMode || '—' },
              { label: 'UTR / Reference', value: detailReceipt.referenceNumber || '—' },
              { label: 'Date', value: new Date(detailReceipt.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Status', value: detailReceipt.status?.toUpperCase() || '—' },
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

/* ============================================================
   RECEIPT ENTRY FORM
   ============================================================ */
function ReceiptForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { data: banksResp } = useApi<any>('/api/banks');
  const banks = banksResp?.data || [];
  const { data: clientsResp } = useApi<any>('/api/clients');
  const clients = clientsResp?.data || [];
  const { data: invoicesResp } = useApi<any>('/api/invoices');
  const invoices = invoicesResp?.data || [];
  const { mutate } = useApi('/api/receipts');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bankAccountId: '',
    clientId: '',
    amount: '', // Net Received
    grossAmount: '',
    tdsRate: '0',
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'NEFT',
    tdsDeducted: '0', 
    status: 'posted',
    invoiceId: '',
  });

  const updateCalculations = (updates: Partial<typeof formData>) => {
    const next = { ...formData, ...updates };
    
    // Auto-calculate if Gross or TDS Rate changes
    if ('grossAmount' in updates || 'tdsRate' in updates) {
      const gross = parseFloat(next.grossAmount) || 0;
      const rate = parseFloat(next.tdsRate) || 0;
      const tds = (gross * rate) / 100;
      next.tdsDeducted = tds > 0 ? tds.toFixed(2) : '0';
      next.amount = (gross - tds).toFixed(2);
    } 
    // If TDS Amount (tdsDeducted) is manually changed, update Net
    else if ('tdsDeducted' in updates) {
      const gross = parseFloat(next.grossAmount) || 0;
      const tds = parseFloat(next.tdsDeducted) || 0;
      next.amount = (gross - tds).toFixed(2);
      // Optional: update rate? (tds / gross * 100)
    }
    // If Net (amount) is manually changed, update TDS? (Usually Gross is master)

    setFormData(next);
  };

  const filteredInvoices = formData.clientId
    ? invoices.filter((inv: any) => inv.clientId === formData.clientId && inv.status === 'posted')
    : [];

  const handleSave = async (statusOverride?: string) => {
    setSaving(true);
    try {
      await mutate('POST', {
        type: 'receipt',
        bankAccountId: formData.bankAccountId,
        clientId: formData.clientId,
        amount: Number(formData.amount),
        date: formData.transactionDate,
        referenceNumber: formData.reference,
        paymentMode: formData.paymentMethod,
        tdsAmount: Number(formData.tdsDeducted) || 0,
        status: statusOverride || formData.status,
        invoiceId: formData.invoiceId,
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
            <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saving || !formData.bankAccountId || !formData.clientId || !formData.amount}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('posted')} disabled={saving || !formData.bankAccountId || !formData.clientId || !formData.amount}>
              {saving ? 'Saving...' : 'Post Receipt'}
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
              <Select
                label="Bill / Invoice (Optional)"
                value={formData.invoiceId}
                onChange={e => {
                  const val = e.target.value;
                  const inv = invoices.find((i: any) => i.id === val);
                  if (inv) {
                     // Auto suggest amount without TDS computation 
                     setFormData({ ...formData, invoiceId: val, amount: String(inv.totalAmount) });
                  } else {
                     setFormData({ ...formData, invoiceId: val });
                  }
                }}
                disabled={!formData.clientId}
                options={[
                  { value: '', label: 'Select Invoice to settle' },
                  ...filteredInvoices.map((inv: any) => ({ value: inv.id, label: `INV-${inv.invoiceNumber} (₹${inv.totalAmount})` }))
                ]}
              />
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={[
                  { value: 'NEFT', label: 'NEFT' },
                  { value: 'RTGS', label: 'RTGS' },
                  { value: 'IMPS', label: 'IMPS' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
              />
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Transaction Reference Number (UTR)" placeholder="e.g. UTR123456789" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />
              </div>
              
              <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', backgroundColor: 'var(--surface-container-low)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Gross Amount
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                    <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.grossAmount} onChange={e => updateCalculations({ grossAmount: e.target.value })} />
                  </div>
                </div>
                
                <Select
                  label="TDS Rate (%)"
                  value={formData.tdsRate}
                  onChange={e => updateCalculations({ tdsRate: e.target.value })}
                  options={[
                    { value: '0', label: 'No TDS (0%)' },
                    { value: '1', label: '1%' },
                    { value: '2', label: '2%' },
                    { value: '5', label: '5%' },
                    { value: '10', label: '10%' },
                  ]}
                />

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    TDS Amount
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                    <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.tdsDeducted} onChange={e => updateCalculations({ tdsDeducted: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Final Net Received
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-primary)', fontWeight: 'bold' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
              </div>

              <Input label="Transaction Date" type="date" value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })} />
              
              <div style={{ gridColumn: 'span 2' }}>
                <Select
                  label="Initial Posting Status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'posted', label: 'Post immediately' },
                    { value: 'draft', label: 'Keep as Draft' },
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
