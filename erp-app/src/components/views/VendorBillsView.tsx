'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, Textarea, ConfirmModal } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { useRole } from '@/lib/hooks/useRole';
import { useToast } from '@/lib/hooks/useToast';

interface VendorBillsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function VendorBillsView({ onNavigate }: VendorBillsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editBill, setEditBill] = useState<any | null>(null);
  const [confirmPostId, setConfirmPostId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());
  if (search) queryParams.set('search', search);

  const { data: billsResp, loading, revalidate } = useApi<any>(`/api/vendor-bills?${queryParams.toString()}`);
  const bills = billsResp?.data || [];
  const pagination = billsResp?.pagination || { total: 0 };
  const { canFinalizeInvoices } = useRole();
  const { success, error } = useToast();

  const handlePostConfirm = async () => {
    if (!confirmPostId) return;
    try {
      const res = await fetch(`/api/vendor-bills/${confirmPostId}/post`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to post');
      success(`Bill posted successfully.`);
      revalidate();
    } catch (e: any) {
      error(e.message || 'Failed to post bill');
    } finally {
      setConfirmPostId(null);
    }
  };

  if (isCreating || editBill) {
    return <VendorBillForm
      initialData={editBill}
      onCancel={() => { setIsCreating(false); setEditBill(null); }}
      onSuccess={() => { setIsCreating(false); setEditBill(null); revalidate(); }}
    />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Vendor Bills & ITC"
        description="Track incoming vendor invoices and Input Tax Credit."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Log Expense
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'billNumber',
            header: 'Bill #',
            render: (b) => <span className="font-technical" style={{ fontWeight: 500 }}>{b.billNumber}</span>,
          },
          {
            key: 'vendor',
            header: 'Vendor',
            render: (b) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.vendor?.name}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  HSN/SAC: {b.hsnSac || '—'}
                </p>
              </div>
            ),
          },
          { key: 'date', header: 'Date', render: (b) => <span style={{ color: 'var(--text-tertiary)' }}>{new Date(b.date).toLocaleDateString()}</span> },
          {
            key: 'totalAmount',
            header: 'Total Amount',
            render: (b) => <span className="currency" style={{ fontWeight: 500 }}>{formatINR(Number(b.totalAmount))}</span>,
          },
          {
            key: 'itc',
            header: 'ITC (GST)',
            render: (b) => {
               const itc = Number(b.cgst) + Number(b.sgst) + Number(b.igst);
               return <span className="currency" style={{ fontWeight: 500, color: 'var(--color-command-green)' }}>{itc > 0 ? formatINR(itc) : '-'}</span>;
            }
          },
          {
            key: 'status',
            header: 'Status',
            render: (b) => (
              <Badge variant={b.status === 'paid' ? 'success' : b.status === 'cancelled' ? 'danger' : 'default'}>
                {b.status}
              </Badge>
            ),
          },
        ]}
        data={bills}
        loading={loading}
        totalCount={pagination.total}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        searchPlaceholder="Search by bill #, vendor..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        renderRowActions={(b: any) => (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {b.status === 'draft' && (
              <button
                onClick={() => setEditBill(b)}
                style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {(b.status === 'draft' && canFinalizeInvoices) && (
              <button
                onClick={() => setConfirmPostId(b.id)}
                style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-command-green)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Post
              </button>
            )}
          </div>
        )}
      />

      <ConfirmModal
        open={!!confirmPostId}
        title="Post Vendor Bill"
        message="Are you sure you want to post this bill? This action will permanently lock the bill and record Accounts Payable & Input Tax Credit (ITC) in the ledger."
        confirmLabel="Yes, Post Bill"
        variant="warning"
        onConfirm={handlePostConfirm}
        onCancel={() => setConfirmPostId(null)}
      />
    </div>
  );
}

/* ============================================================
   VENDOR BILL ENTRY FORM
   ============================================================ */
function VendorBillForm({ onCancel, onSuccess, initialData }: { onCancel: () => void; onSuccess: () => void; initialData?: any }) {
  const { data: clientsResp } = useApi<any>('/api/clients');
  const vendors = (clientsResp?.data || []).filter((c: any) => c.type === 'Vendor' || c.type === 'Both');
  const { mutate } = useApi('/api/vendor-bills');
  const { success, error } = useToast();
  const isEditing = !!initialData;

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    vendorId: initialData?.vendorId || initialData?.vendor?.id || '',
    billNumber: initialData?.billNumber || '',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    totalAmount: initialData?.totalAmount ? String(initialData.totalAmount) : '',
    cgst: initialData?.cgst ? String(initialData.cgst) : '0',
    sgst: initialData?.sgst ? String(initialData.sgst) : '0',
    igst: initialData?.igst ? String(initialData.igst) : '0',
    hsnSac: initialData?.hsnSac || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        vendorId: formData.vendorId,
        billNumber: formData.billNumber,
        date: formData.date,
        description: formData.description,
        totalAmount: Number(formData.totalAmount),
        cgst: Number(formData.cgst),
        sgst: Number(formData.sgst),
        igst: Number(formData.igst),
        hsnSac: formData.hsnSac,
      };
      if (isEditing) {
        const res = await fetch(`/api/vendor-bills/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update bill');
        success(`Bill ${formData.billNumber} updated.`);
      } else {
        await mutate('POST', payload);
        success('Draft bill saved.');
      }
      onSuccess();
    } catch (e: any) {
      error(e.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title={isEditing ? `Edit Bill — ${initialData.billNumber}` : 'Log Vendor Bill'}
        description="Enter incoming invoice from a vendor to claim ITC and record AP."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.vendorId || !formData.totalAmount || !formData.billNumber}>
              {saving ? 'Saving...' : isEditing ? 'Update Bill' : 'Save Draft'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            <Select
              label="Vendor"
              value={formData.vendorId}
              onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
              options={[
                { value: '', label: 'Select Vendor' },
                ...vendors.map((v: any) => ({ value: v.id, label: v.name })),
              ]}
            />
            <Input 
              label="Vendor Bill / Invoice #" 
              placeholder="e.g. INV-2026-X" 
              value={formData.billNumber}
              onChange={e => setFormData({...formData, billNumber: e.target.value})}
            />
            <Input 
              label="Date" 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
            <Input 
              label="HSN / SAC Code" 
              placeholder="Used for GST Classification" 
              value={formData.hsnSac} 
              onChange={e => setFormData({...formData, hsnSac: e.target.value})} 
            />
            <div style={{ gridColumn: 'span 2' }}>
              <Input 
                label="Description" 
                placeholder="What was this expense for? (e.g. Office supplies, Cloud Hosting)" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>
          </div>

          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Amounts & Taxes (ITC)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
               <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Total Invoice Value (Gross)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.totalAmount} onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} />
                </div>
              </div>
              <div />
              
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  CGST Booked
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.cgst} onChange={e => setFormData({ ...formData, cgst: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  SGST Booked
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.sgst} onChange={e => setFormData({ ...formData, sgst: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  IGST Booked
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" style={{ paddingLeft: '28px' }} value={formData.igst} onChange={e => setFormData({ ...formData, igst: e.target.value })} />
                </div>
              </div>
            </div>
            
          </section>
        </div>
      </Card>
    </div>
  );
}
