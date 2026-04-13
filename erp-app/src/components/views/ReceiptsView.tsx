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

  const queryParams = new URLSearchParams();
  if (fromDate) queryParams.set('from', fromDate);
  if (toDate) queryParams.set('to', toDate);
  if (bankFilter !== 'all') queryParams.set('bankId', bankFilter);
  if (clientFilter !== 'all') queryParams.set('clientId', clientFilter);
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
    taxableAmount: '',
    netAmount: '',
    amount: '', // Represents Final Received Amount / New Net
    transactionDate: new Date().toISOString().split('T')[0],
    clearingDate: '',
    roundOff: 0,
    reference: '',
    paymentMethod: 'NEFT',
    tdsDeducted: '0',
    status: 'posted',
    invoiceId: '',
  });

  const handleCalc16 = () => {
    const taxable = parseFloat(formData.taxableAmount) || 0;
    const net = parseFloat(formData.netAmount) || 0;
    
    if (taxable <= 0) {
      alert("Please enter a valid Taxable Amount.");
      return;
    }
    if (net <= 0) {
      alert("Please enter a valid Net Amount (with GST).");
      return;
    }

    const newNet = taxable * 1.16;
    const tds = net - newNet;
    
    setFormData(prev => ({
      ...prev,
      amount: newNet.toFixed(2),
      tdsDeducted: tds > 0 ? tds.toFixed(2) : '0'
    }));
  };

  const filteredInvoices = formData.clientId
    ? invoices.filter((inv: any) => inv.clientId === formData.clientId && inv.status === 'posted')
    : [];

  const selectedInvoice = invoices.find((inv: any) => inv.id === formData.invoiceId);

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
        clearingDate: formData.clearingDate,
        roundOff: Number(formData.roundOff) || 0,
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
                    const taxable = Number(inv.totalAmount) - Number(inv.totalTax || 0);
                    setFormData({ 
                      ...formData, 
                      invoiceId: val, 
                      netAmount: String(inv.totalAmount),
                      taxableAmount: String(taxable)
                    });
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
              {selectedInvoice && (
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-container-highest)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Invoice Date</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{new Date(selectedInvoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Transaction Reference Number (UTR)" placeholder="e.g. UTR123456789" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', backgroundColor: 'var(--surface-container-low)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Taxable Amount (Without GST)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                      <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.taxableAmount} onChange={e => setFormData({ ...formData, taxableAmount: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Net Amount (With GST)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                      <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.netAmount} onChange={e => setFormData({ ...formData, netAmount: e.target.value })} />
                    </div>
                  </div>

                  <Button onClick={handleCalc16} type="button" style={{ height: '42px', padding: '0 24px' }}>
                     Calculate 16%
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-danger)', marginBottom: '6px' }}>
                      TDS Deducted (Auto-calc)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                      <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.tdsDeducted} onChange={e => setFormData({ ...formData, tdsDeducted: e.target.value })} />
                    </div>
                  </div>

                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '6px' }}>Received Amount / Final AR Settled</label>
                  <Input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '6px' }}>Round Off (+/-) (Absorbed by Bank)</label>
                  <Input type="number" step="0.01" value={formData.roundOff} onChange={e => setFormData({ ...formData, roundOff: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 'var(--space-4)' }}>
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
