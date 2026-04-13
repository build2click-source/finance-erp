'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, Textarea, ViewSkeleton } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { useRole } from '@/lib/hooks/useRole';
import { amountToWords } from '@/lib/utils/number-to-words';
import { InvoicePreview } from './InvoicePreview';

interface InvoicesViewProps {
  onNavigate: (view: ViewId) => void;
}

export function InvoicesView({ onNavigate }: InvoicesViewProps) {
  const [activeForm, setActiveForm] = useState<{ mode: 'create' | 'edit', id?: string } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const queryParams = new URLSearchParams();
  if (fromDate) queryParams.set('from', fromDate);
  if (toDate) queryParams.set('to', toDate);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  const { data: invoicesResp, loading, error, revalidate } = useApi<any>(`/api/invoices?${queryParams.toString()}`);
  const invoices = invoicesResp?.data || [];
  const pagination = invoicesResp?.pagination || { total: 0 };

  const { canFinalizeInvoices } = useRole();
  if (loading && !invoices.length) return <ViewSkeleton />;

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  if (previewId) {
    return <InvoicePreview id={previewId} onBack={() => setPreviewId(null)} />;
  }

  if (activeForm) {
    return (
      <InvoiceForm 
        editId={activeForm.id} 
        onCancel={() => setActiveForm(null)} 
        onSuccess={() => { setActiveForm(null); revalidate(); }} 
      />
    );
  }

  const columns = [
    { 
      key: 'invoiceNumber', 
      header: 'Invoice No.', 
      render: (row: any) => row.invoiceNumber 
    },
    { 
      key: 'date', 
      header: 'Date', 
      render: (row: any) => new Date(row.date).toLocaleDateString('en-IN') 
    },
    { 
      key: 'client', 
      header: 'Client', 
      render: (row: any) => row.client?.name || '—' 
    },
    { 
      key: 'type', 
      header: 'Type', 
      render: (row: any) => <Badge variant="default">{row.type}</Badge> 
    },
    { 
      key: 'totalAmount', 
      header: 'Total', 
      render: (row: any) => formatINR(row.totalAmount) 
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row: any) => (
        <Badge variant={row.status === 'posted' ? 'success' : 'warning'}>
          {row.status.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" onClick={() => setPreviewId(row.id)}>View</Button>
          {row.status === 'draft' && (
            <Button size="sm" variant="secondary" onClick={() => setActiveForm({ mode: 'edit', id: row.id })}>Edit</Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Sales & Commission Invoices"
        description="Professional Tax Invoices, Credit Notes, and Proformas."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setActiveForm({ mode: 'create' })}>
              <Plus size={16} /> New Invoice
            </Button>
          </>
        }
      />

      <Card>
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error)' }}>Error loading invoices.</div>
        ) : (
          <DataTable 
            loading={loading}
            columns={columns} 
            data={invoices} 
            totalCount={pagination.total}
            currentPage={page}
            pageSize={limit}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            filters={
              <>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => handleFilterChange(setFromDate, e.target.value)} 
                  placeholder="From Date"
                  style={{ width: '150px' }}
                />
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => handleFilterChange(setToDate, e.target.value)} 
                  placeholder="To Date"
                  style={{ width: '150px' }}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'posted', label: 'Posted' }
                  ]}
                  style={{ width: '130px' }}
                />
              </>
            }
          />
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   INVOICE FORM (CREATE/EDIT)
   ============================================================ */
function InvoiceForm({ editId, onCancel, onSuccess }: { editId?: string, onCancel: () => void, onSuccess: () => void }) {
  const { data: clientResp } = useApi<any>('/api/clients');
  const clients = clientResp?.data || [];
  const { data: productResp } = useApi<any>('/api/products');
  const products = productResp?.data || [];
  const { data: companyResp } = useApi<any>('/api/setup-company');
  const company = companyResp?.profile;
  
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    consigneeId: '',
    buyerId: '',
    date: new Date().toISOString().split('T')[0],
    paymentTerms: 'Immediate',
    type: 'TaxInvoice',
    notes: '',
    deliveryNote: '',
    deliveryNoteDate: '',
    suppliersRef: '',
    otherRef: '',
    buyersOrderNo: '',
    buyersOrderDate: '',
    dispatchDocNo: '',
    dispatchedThrough: '',
    destination: '',
    termsOfDelivery: '',
  });

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (editId) {
      const loadDraft = async () => {
        try {
          const res = await fetch(`/api/invoices/${editId}`);
          const json = await res.json();
          if (json.success && json.data) {
            const inv = json.data;
            setFormData({
              clientId: inv.clientId,
              consigneeId: inv.consigneeId || '',
              buyerId: inv.buyerId || '',
              date: new Date(inv.date).toISOString().split('T')[0],
              paymentTerms: inv.paymentTerms || '',
              type: inv.type,
              notes: inv.notes || '',
              deliveryNote: inv.deliveryNote || '',
              deliveryNoteDate: inv.deliveryNoteDate ? new Date(inv.deliveryNoteDate).toISOString().split('T')[0] : '',
              suppliersRef: inv.suppliersRef || '',
              otherRef: inv.otherRef || '',
              buyersOrderNo: inv.buyersOrderNo || '',
              buyersOrderDate: inv.buyersOrderDate ? new Date(inv.buyersOrderDate).toISOString().split('T')[0] : '',
              dispatchDocNo: inv.dispatchDocNo || '',
              dispatchedThrough: inv.dispatchedThrough || '',
              destination: inv.destination || '',
              termsOfDelivery: inv.termsOfDelivery || '',
            });
            setItems(inv.lines.map((l: any) => ({
              id: l.id,
              productId: l.productId,
              description: l.description,
              hsnCode: l.hsnCode,
              qty: Number(l.qty),
              unitPrice: Number(l.unitPrice),
              per: l.per,
              gstRate: Number(l.gstRate)
            })));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadDraft();
    }
  }, [editId]);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), productId: '', description: '', hsnCode: '', qty: 1, unitPrice: 0, per: 'NOS', gstRate: 18 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const selectedClient = clients.find((c: any) => c.id === formData.clientId);
    const companyState = company?.state || 'West Bengal';
    const clientState = selectedClient?.state || companyState;
    const isInterState = companyState.toLowerCase() !== clientState.toLowerCase();

    items.forEach(item => {
      const lineNet = Number(item.qty) * Number(item.unitPrice);
      const taxRate = Number(item.gstRate) || 0;
      subtotal += lineNet;
      
      const taxAmount = (lineNet * taxRate) / 100;
      
      if (isInterState) {
        igst += taxAmount;
      } else {
        cgst += taxAmount / 2;
        sgst += taxAmount / 2;
      }
    });

    return { subtotal, cgst, sgst, igst, total: subtotal + cgst + sgst + igst, isInterState };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        lines: items.map(line => ({
          productId: line.productId,
          description: line.description,
          hsnCode: line.hsnCode,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          per: line.per,
          gstRate: Number(line.gstRate)
        }))
      };

      const method = editId ? 'PATCH' : 'POST';
      const url = editId ? `/api/invoices/${editId}` : '/api/invoices';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
      } else {
        alert(json.error || 'Failed to save invoice');
      }
    } catch (e) {
      alert('Failed to save invoice. Ensure all required fields are filled.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading draft...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      <PageHeader
        title={editId ? `Edit Invoice` : `Generate New Invoice`}
        description={editId ? "Update draft invoice details." : "Create a professional Tax Invoice."}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.clientId}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {/* Core Info & Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>1. Billing Parties</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <Select
                  label="Billed To (Client)"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  options={[{ value: '', label: 'Select Client...' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
                />
                <Select
                  label="Invoice Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  options={[{ value: 'TaxInvoice', label: 'Tax Invoice' }, { value: 'Proforma', label: 'Proforma' }, { value: 'CreditNote', label: 'Credit Note' }, { value: 'DebitNote', label: 'Debit Note' }]}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <Select
                  label="Consignee (Ship To)"
                  value={formData.consigneeId}
                  onChange={(e) => setFormData({ ...formData, consigneeId: e.target.value })}
                  options={[{ value: '', label: 'Same as Billed To' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
                />
                <Select
                  label="Buyer (Other than Consignee)"
                  value={formData.buyerId}
                  onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
                  options={[{ value: '', label: 'None' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>2. Date & Terms</h3>
              <Input label="Invoice Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              <Input label="Payment Terms" placeholder="e.g. 15 Days, Immediate" value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} />
            </div>
          </Card>
        </div>

        {/* Despatch & Order Details */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>3. Shipping & References</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <Input label="Delivery Note" value={formData.deliveryNote} onChange={(e) => setFormData({ ...formData, deliveryNote: e.target.value })} />
              <Input label="Del. Note Date" type="date" value={formData.deliveryNoteDate} onChange={(e) => setFormData({ ...formData, deliveryNoteDate: e.target.value })} />
              <Input label="Supplier Ref" value={formData.suppliersRef} onChange={(e) => setFormData({ ...formData, suppliersRef: e.target.value })} />
              <Input label="Other Ref" value={formData.otherRef} onChange={(e) => setFormData({ ...formData, otherRef: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              <Input label="Buyer Order No" value={formData.buyersOrderNo} onChange={(e) => setFormData({ ...formData, buyersOrderNo: e.target.value })} />
              <Input label="Order Date" type="date" value={formData.buyersOrderDate} onChange={(e) => setFormData({ ...formData, buyersOrderDate: e.target.value })} />
              <Input label="Dispatch Doc No" value={formData.dispatchDocNo} onChange={(e) => setFormData({ ...formData, dispatchDocNo: e.target.value })} />
              <Input label="Destination" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>4. Particulars (Items)</h3>
              <Button size="sm" variant="secondary" onClick={addItem}><Plus size={14} /> Add Item</Button>
            </div>
            
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Particulars / HSN</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)', width: '100px' }}>Qty</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)', width: '100px' }}>Rate</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)', width: '80px' }}>Per</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)', width: '80px' }}>GST%</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-tertiary)', width: '120px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 16px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <Select
                            value={item.productId}
                            onChange={(e) => {
                              const p = products.find((x: any) => x.id === e.target.value);
                              updateItem(item.id, 'productId', e.target.value);
                              if (p) {
                                if (!item.description) updateItem(item.id, 'description', p.name);
                                if (!item.hsnCode) updateItem(item.id, 'hsnCode', p.hsnCode);
                                if (!item.gstRate) updateItem(item.id, 'gstRate', Number(p.gstRate) || 18);
                              }
                            }}
                            options={[{ value: '', label: 'Select Product...' }, ...products.map((p: any) => ({ value: p.id, label: p.name }))]}
                            style={{ border: 'none', backgroundColor: 'transparent', padding: '0', height: 'auto' }}
                          />
                          <Input 
                            placeholder="Detailed description..." 
                            value={item.description} 
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            style={{ border: 'none', backgroundColor: 'transparent', padding: '0', fontSize: '12px' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} style={{ width: '80px' }} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} style={{ width: '90px' }} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <Input value={item.per} onChange={(e) => updateItem(item.id, 'per', e.target.value.toUpperCase())} style={{ width: '60px' }} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                         <Input type="number" value={item.gstRate} onChange={(e) => updateItem(item.id, 'gstRate', e.target.value)} style={{ width: '60px' }} />
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {formatINR(item.qty * item.unitPrice)}
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Footer Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <Card>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Notes & Bank Details</h3>
            <Textarea label="Notes / Terms" rows={4} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </Card>
          <Card style={{ backgroundColor: 'var(--surface-container-low)' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>{formatINR(totals.subtotal)}</span>
                </div>
                {totals.cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>CGST</span>
                  <span>{formatINR(totals.cgst)}</span>
                </div>}
                {totals.sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>SGST</span>
                  <span>{formatINR(totals.sgst)}</span>
                </div>}
                {totals.igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>IGST</span>
                  <span>{formatINR(totals.igst)}</span>
                </div>}
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 700, fontSize: 'var(--text-2xl)' }}>
                  <span>Total Amount</span>
                  <span>{formatINR(totals.total)}</span>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

