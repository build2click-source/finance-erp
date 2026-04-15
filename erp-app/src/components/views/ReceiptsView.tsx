'use client';

import React, { useState } from 'react';
import { Plus, FileUp, Trash2 } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, ConfirmModal, BulkUploadModal, ViewSkeleton } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface ReceiptsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ReceiptsView({ onNavigate }: ReceiptsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [detailReceipt, setDetailReceipt] = useState<any | null>(null);
  const [voidingReceipt, setVoidingReceipt] = useState<any | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  if (fromDate) queryParams.set('from', fromDate);
  if (toDate) queryParams.set('to', toDate);
  if (bankFilter !== 'all') queryParams.set('bankId', bankFilter);
  if (clientFilter !== 'all') queryParams.set('clientId', clientFilter);
  if (search) queryParams.set('search', search);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  const { data: receiptsData, loading, revalidate } = useApi<any>(`/api/receipts?${queryParams.toString()}`);
  const { data: banksResp } = useApi<any>('/api/banks');
  const { data: clientsResp } = useApi<any>('/api/clients');

  const receipts = receiptsData?.data || [];
  const pagination = receiptsData?.pagination || { total: 0 };
  const banks = banksResp?.data || [];
  const clients = clientsResp?.data || [];

  if (loading && !receipts.length) return <ViewSkeleton />;

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  if (isCreating) {
    return <ReceiptForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  const handleVoidReceipt = async () => {
    if (!voidingReceipt) return;
    try {
      const res = await fetch(`/api/receipts/${voidingReceipt.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Void failed');
      revalidate();
    } catch (e) {
      console.error(e);
      alert('Failed to void receipt');
    } finally {
      setVoidingReceipt(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Receipts Log"
        description="Track incoming payments and bank reconciliations."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
              <FileUp size={16} /> Batch Upload
            </Button>
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
          {
            key: 'roundOff',
            header: 'Round-off',
            render: (r) => (
              <span className="font-technical" style={{ 
                color: Number(r.roundOff) < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)',
                fontWeight: Number(r.roundOff) !== 0 ? 600 : 400
              }}>
                {Number(r.roundOff) !== 0 ? (Number(r.roundOff) > 0 ? '+' : '') + formatINR(r.roundOff) : '—'}
              </span>
            ),
          },
          { key: 'date', header: 'Date', render: (r) => <span style={{ color: 'var(--text-tertiary)' }}>{new Date(r.transactionDate).toLocaleDateString()}</span> },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <Badge variant={r.status === 'posted' ? 'success' : r.status === 'voided' ? 'danger' : r.status === 'draft' ? 'warning' : 'default'}>
                {r.status.toUpperCase()}
              </Badge>
            ),
          },
        ]}
        data={receipts}
        loading={loading}
        totalCount={pagination.total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        filters={
          <>
            <Input type="date" value={fromDate} onChange={(e) => handleFilterChange(setFromDate, e.target.value)} style={{ width: '150px' }} />
            <Input type="date" value={toDate} onChange={(e) => handleFilterChange(setToDate, e.target.value)} style={{ width: '150px' }} />
            <Select
              value={bankFilter} onChange={(e) => handleFilterChange(setBankFilter, e.target.value)}
              options={[{ value: 'all', label: 'All Banks' }, ...banks.map((b: any) => ({ value: b.id, label: b.bankName }))]}
              style={{ width: '150px' }}
            />
            <Select
              value={clientFilter} onChange={(e) => handleFilterChange(setClientFilter, e.target.value)}
              options={[{ value: 'all', label: 'All Clients' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
              style={{ width: '180px' }}
            />
          </>
        }
        searchPlaceholder="Search by receipt #, client..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        renderRowActions={(r: any) => (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setDetailReceipt(r)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Details
            </button>
            {r.status === 'posted' && (
              <button
                onClick={() => setVoidingReceipt(r)}
                title="Void"
                style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <Trash2 size={16} />
              </button>
            )}
            {r.status === 'draft' && (
              <button
                onClick={() => setVoidingReceipt(r)}
                title="Delete"
                style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      />

      <ConfirmModal
        open={!!voidingReceipt}
        title={voidingReceipt?.status === 'posted' ? 'Void Receipt?' : 'Delete Draft?'}
        message={voidingReceipt?.status === 'posted'
          ? `Are you sure you want to void receipt "${voidingReceipt?.receiptNumber}"? This will reverse the ledger impact.`
          : `Are you sure you want to delete draft "${voidingReceipt?.receiptNumber}"?`
        }
        confirmLabel={voidingReceipt?.status === 'posted' ? 'Void' : 'Delete'}
        variant="danger"
        onConfirm={handleVoidReceipt}
        onCancel={() => setVoidingReceipt(null)}
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
              { label: 'Received Amount', value: `₹${Number(detailReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { 
                label: 'Round-off', 
                value: detailReceipt.roundOff && Number(detailReceipt.roundOff) !== 0 
                  ? `${Number(detailReceipt.roundOff) > 0 ? '+' : ''}₹${Number(detailReceipt.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : '—',
                color: Number(detailReceipt.roundOff) < 0 ? 'var(--color-danger)' : undefined
              },
              { 
                label: 'Total Settled', 
                value: `₹${(Number(detailReceipt.amount) + Number(detailReceipt.roundOff || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                highlight: true 
              },
              { label: 'TDS Deducted', value: detailReceipt.tdsAmount ? `₹${Number(detailReceipt.tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—' },
              { label: 'Bank', value: detailReceipt.bankAccount?.bankName || '—' },
              { label: 'Payment Mode', value: detailReceipt.paymentMode || '—' },
              { label: 'UTR / Reference', value: detailReceipt.referenceNumber || '—' },
              { label: 'Date', value: new Date(detailReceipt.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Status', value: detailReceipt.status?.toUpperCase() || '—' },
            ].map(row => (
              <div key={row.label} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: 'var(--space-3) 0', 
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: (row as any).highlight ? 'var(--surface-container-high)' : 'transparent',
                margin: (row as any).highlight ? '0 -var(--space-2)' : '0',
                paddingInline: (row as any).highlight ? 'var(--space-2)' : '0',
                borderRadius: (row as any).highlight ? 'var(--radius-sm)' : '0'
              }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: (row as any).highlight ? 600 : 400 }}>{row.label}</span>
                <span style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: (row as any).highlight ? 700 : 500, 
                  color: (row as any).color || 'var(--text-primary)', 
                  fontFamily: 'var(--font-data)' 
                }}>{row.value}</span>
              </div>
            ))}
          </div>

        </div>
      )}

      <BulkUploadModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Batch Import Receipts"
        entityName="Receipts"
        endpoint="/api/receipts/bulk"
        onSuccess={revalidate}
        columns={[
          { key: 'date', label: 'Date', required: true },
          { key: 'client', label: 'Client', required: true },
          { key: 'amount', label: 'Amount', required: true },
          { key: 'bank', label: 'Bank', required: true },
          { key: 'mode', label: 'Mode' },
          { key: 'reference', label: 'Reference' },
          { key: 'notes', label: 'Notes' },
        ]}
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
  const { data: invoicesResp } = useApi<any>('/api/invoices');
  const invoices = invoicesResp?.data || [];
  const { mutate } = useApi('/api/receipts');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bankAccountId: '',
    clientId: '',
    amount: '', // Represents Final Received Amount
    transactionDate: new Date().toISOString().split('T')[0],
    clearingDate: '',
    roundOff: 0,
    reference: '',
    paymentMethod: 'NEFT',
    status: 'posted',
    invoiceId: '',
  });

  const filteredInvoices = formData.clientId
    ? invoices.filter((inv: any) => {
        if (inv.clientId !== formData.clientId || inv.status !== 'posted') return false;
        
        let settledCash = 0;
        if (inv.receipts && Array.isArray(inv.receipts)) {
            settledCash = inv.receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        }
        
        const taxable = Number(inv.totalAmount) - Number(inv.totalTax || 0);
        const expected = taxable * 1.16;
        
        // Only show invoices that still have a remaining balance > zero (with tiny margin for roundoff)
        return (expected - settledCash) > 0.05;
      })
    : [];

  const selectedInvoice = invoices.find((inv: any) => inv.id === formData.invoiceId);

  let taxableAmount = 0;
  let netAmount = 0;
  let expectedReceived = 0;
  let totalTDS = 0;
  let settledCash = 0;
  
  if (selectedInvoice) {
      taxableAmount = Number(selectedInvoice.totalAmount) - Number(selectedInvoice.totalTax || 0);
      netAmount = Number(selectedInvoice.totalAmount);
      expectedReceived = taxableAmount * 1.16;
      totalTDS = netAmount - expectedReceived;
      if (totalTDS < 0) totalTDS = 0;

      if (selectedInvoice.receipts && Array.isArray(selectedInvoice.receipts)) {
          settledCash = selectedInvoice.receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      }
  }

  let remainingExpectedCash = expectedReceived - settledCash;
  if (remainingExpectedCash < 0) remainingExpectedCash = 0;

  let calculatedTDS = 0;
  const numAmount = parseFloat(formData.amount) || 0;
  if (expectedReceived > 0 && numAmount > 0) {
      const ratio = numAmount / expectedReceived;
      calculatedTDS = totalTDS * ratio;
  }

  // Overpayment: only applies when an invoice is selected and remaining due is known
  const overpayment = selectedInvoice && remainingExpectedCash > 0 && numAmount > remainingExpectedCash
    ? numAmount - remainingExpectedCash
    : 0;
  const isOverpaying = overpayment > 0.01;

  // Effective round-off: when overpaying, auto-absorb the excess as negative round-off
  const effectiveRoundOff = isOverpaying ? -overpayment : (Number(formData.roundOff) || 0);

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
        tdsAmount: Number(calculatedTDS.toFixed(2)),
        status: statusOverride || formData.status,
        invoiceId: formData.invoiceId,
        clearingDate: formData.clearingDate,
        roundOff: effectiveRoundOff,
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || !formData.bankAccountId || !formData.clientId || !formData.amount;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Record Receipt"
        description="Log an incoming payment into a specific bank account."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave('draft')} disabled={isSaveDisabled}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('posted')} disabled={isSaveDisabled}>
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
              onChange={e => setFormData({ ...formData, clientId: e.target.value, invoiceId: '' })}
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
              <div style={{ gridColumn: 'span 2' }}>
                <Select
                  label="Bill / Invoice (Optional)"
                  value={formData.invoiceId}
                  onChange={e => setFormData({ ...formData, invoiceId: e.target.value, amount: '' })}
                  disabled={!formData.clientId}
                  options={[
                    { value: '', label: 'Select Invoice to settle' },
                    ...filteredInvoices.map((inv: any) => ({ value: inv.id, label: `INV-${inv.invoiceNumber} (₹${inv.totalAmount})` }))
                  ]}
                />
              </div>
              {selectedInvoice ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', gridColumn: 'span 2' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Taxable</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-data)' }}>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Net (w/ GST)</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-data)' }}>₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Expected (16%)</div>
                      <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-data)' }}>₹{expectedReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Total TDS</div>
                      <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-data)' }}>₹{totalTDS.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--primary-container)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Due</div>
                      <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-data)' }}>₹{remainingExpectedCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', backgroundColor: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)' }}>
                  Select an invoice to auto-calculate TDS amounts.
                </div>
              )}

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
              <Input label="Transaction Reference Number (UTR)" placeholder="e.g. UTR123456789" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />

              {/* Received Amount + Calculated TDS */}
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 'var(--space-4)', alignItems: 'center', backgroundColor: 'var(--surface-container-low)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: isOverpaying ? '2px solid var(--color-danger, #ef4444)' : '2px solid transparent', transition: 'border 0.2s' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-24px', position: 'relative', zIndex: 1, pointerEvents: 'none', paddingRight: '12px' }}>
                    {selectedInvoice && numAmount > 0 && !isOverpaying && Math.abs(numAmount - remainingExpectedCash) < 0.05 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-command-green)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, backgroundColor: 'var(--surface-container)', padding: '2px 8px', borderRadius: '4px', marginTop: '2px' }}>
                        ✓ FULL CLEARANCE
                      </div>
                    )}
                  </div>
                  <label style={{ display: 'block', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '8px' }}>Received Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 600, color: 'var(--text-tertiary)' }}>₹</span>
                    <input
                       type="number"
                       placeholder="0.00"
                       style={{ width: '100%', padding: '14px 14px 14px 34px', fontSize: '20px', fontWeight: 700, borderRadius: 'var(--radius-md)', border: isOverpaying ? '2px solid var(--color-danger, #ef4444)' : '2px solid var(--primary)', outline: 'none', transition: 'border 0.2s' }}
                       value={formData.amount}
                       onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  {selectedInvoice && remainingExpectedCash > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      Max allowed: ₹{remainingExpectedCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                {selectedInvoice && (
                  <div style={{ flex: 1, backgroundColor: 'var(--surface-container-high)', padding: '12px 16px', borderRadius: 'var(--radius-md)', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Calculated TDS</div>
                    <div style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-data)' }}>₹{calculatedTDS.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>

              {/* Overpayment Alert — informational, saving is still allowed */}
              {isOverpaying && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', backgroundColor: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.5)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>Overpayment Detected</div>
                    <div style={{ fontSize: '12px', color: '#ef4444', fontFamily: 'var(--font-data)' }}>
                      Amount exceeds remaining due by <strong>₹{overpayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. The excess has been auto-applied as a negative Round Off below.
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>Auto Round Off</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-data)' }}>
                      −₹{overpayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '6px', color: isOverpaying ? '#ef4444' : 'inherit' }}>
                    Round Off (+/-) {isOverpaying ? '— Auto-absorbed Overpayment' : '(Absorbed by Bank)'}
                  </label>
                  {isOverpaying ? (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '2px solid rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.06)', fontSize: '16px', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-data)' }}>
                      −₹{overpayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  ) : (
                    <Input type="number" step="0.01" value={formData.roundOff} onChange={e => setFormData({ ...formData, roundOff: parseFloat(e.target.value) || 0 })} />
                  )}
                </div>
                <Input label="Receipt / Record Date" type="date" value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })} style={{ flex: 1 }} />
                <Input label="Transaction / Clearing Date" type="date" value={formData.clearingDate} onChange={e => setFormData({ ...formData, clearingDate: e.target.value })} style={{ flex: 1 }} />
              </div>

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