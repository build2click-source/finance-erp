'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, Textarea } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface InvoicesViewProps {
  onNavigate: (view: ViewId) => void;
}

export function InvoicesView({ onNavigate }: InvoicesViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: invoicesResp, loading, error, revalidate } = useApi<any>('/api/invoices');
  const invoices = invoicesResp?.data || [];

  if (isCreating) {
    return <InvoiceForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Sales & Commission Invoices"
        description="Manage invoices issued to buyers and sellers."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Invoice
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'id',
            header: 'Invoice #',
            render: (inv) => <span className="font-technical" style={{ fontWeight: 500 }}>{inv.id}</span>,
          },
          {
            key: 'client',
            header: 'Client',
            render: (inv) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inv.client?.name || inv.clientId}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {inv.type}
                </p>
              </div>
            ),
          },
          { key: 'tenure', header: 'Tenure', render: (inv) => <span style={{ color: 'var(--text-tertiary)' }}>{inv.tenure}</span> },
          {
            key: 'amount',
            header: 'Amount',
            render: (inv) => <span className="currency" style={{ fontWeight: 500 }}>{formatINR(inv.amount)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (inv) => (
              <Badge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Cancelled' ? 'danger' : 'default'}>
                {inv.status}
              </Badge>
            ),
          },
        ]}
        data={invoices ? invoices.map((inv: any) => ({
          ...inv,
          id: inv.invoiceNumber,
          amount: Number(inv.totalAmount) || 0,
          tenure: new Date(inv.date).toLocaleDateString(),
          status: inv.status,
        })) : []}
        loading={loading}
        searchPlaceholder="Search by invoice #, client..."
        renderRowActions={(inv: any) => (
          <button
            onClick={() => {
              const msg = `Invoice: ${inv.id}\nClient: ${inv.client?.name || '—'}\nAmount: ₹${inv.amount?.toLocaleString('en-IN')}\nStatus: ${inv.status}\nDate: ${inv.tenure}`;
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
   INVOICE CREATION FORM
   ============================================================ */
function InvoiceForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { data: clientsResp } = useApi<any>('/api/clients');
  const clients = clientsResp?.data || [];
  const { data: productsData } = useApi<any>('/api/products');
  const { mutate } = useApi('/api/invoices');
  const products = productsData?.data || [];

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    tenure: '',
  });

  const [items, setItems] = useState([{ id: 1, productId: '', description: '', qty: '', unitPrice: '' }]);

  const addItem = () => setItems([...items, { id: Date.now(), productId: '', description: '', qty: '', unitPrice: '' }]);
  const removeItem = (id: number) => setItems(items.filter((i) => i.id !== id));
  
  const updateItem = (id: number, field: string, value: string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        type: 'sales', // Just defaulting for generic UI mapping
        clientId: formData.clientId,
        date: formData.date,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice),
          gstRate: 18,
          hsnCode: '',
        }))
      };
      await mutate('POST', payload);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to generate invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Generate Invoice"
        description="Draft a new sales or commission invoice."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.clientId || items.length === 0}>
              {saving ? 'Saving...' : 'Save & Generate'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Header Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
            <Select
              label="Select Client"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              options={[{ value: '', label: 'Select Client...' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
            />
            <Input label="Invoice Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            <Input label="Billing Period / Tenure" placeholder="e.g. Q2 2026" value={formData.tenure} onChange={(e) => setFormData({ ...formData, tenure: e.target.value })} />
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Line Items
            </h3>
            <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              {/* Header row */}
              <div
                style={{
                  backgroundColor: 'var(--surface-container-low)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  padding: '8px 16px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <div style={{ flex: 1 }}>Description</div>
                <div style={{ width: '96px', paddingLeft: '8px' }}>Qty</div>
                <div style={{ width: '128px', paddingLeft: '8px' }}>Rate</div>
                <div style={{ width: '40px' }} />
              </div>
              {/* Line items */}
              <div style={{ backgroundColor: 'var(--surface-container)' }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      borderBottom: '1px solid var(--border-subtle)',
                      gap: '4px',
                    }}
                  >
                    <div style={{ flex: 1, padding: '4px', display: 'flex', gap: '4px' }}>
                      <select style={{ width: '150px', border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)', padding: '0 8px', borderRadius: '4px' }} value={item.productId} onChange={(e) => updateItem(item.id, 'productId', e.target.value)}>
                        <option value="">Select Product...</option>
                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <Input placeholder="Service description..." style={{ border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)', flex: 1 }} value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                    </div>
                    <div style={{ width: '96px', padding: '4px' }}>
                      <Input type="number" placeholder="Qty" style={{ border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)' }} value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                    </div>
                    <div style={{ width: '128px', padding: '4px' }}>
                      <Input type="number" placeholder="Rate (₹)" style={{ border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)' }} value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} />
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        padding: '8px',
                        color: 'var(--text-tertiary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={addItem}
              style={{
                marginTop: 'var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-data)',
              }}
            >
              <Plus size={16} /> Add line item
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Tax + Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            {/* Tax Config */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                  Tax Configuration (%)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <Input label="CGST" type="number" defaultValue="9" />
                  <Input label="SGST" type="number" defaultValue="9" />
                  <Input label="IGST" type="number" defaultValue="0" />
                </div>
              </div>
              <Textarea label="Invoice Notes" rows={3} placeholder="Terms and conditions..." />
            </div>

            {/* Summary */}
            <div>
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--border-subtle)',
                  padding: 'var(--space-6)',
                }}
              >
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                  Summary
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (9%)</span>
                    <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST (9%)</span>
                    <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>₹0.00</span>
                  </div>
                  <div
                    style={{
                      paddingTop: 'var(--space-4)',
                      marginTop: 'var(--space-2)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className="font-display" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Amount</span>
                    <span className="font-display currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>₹0.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
