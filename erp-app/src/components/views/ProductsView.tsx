'use client';

import React, { useState } from 'react';
import { Plus, Package, Box, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, StatCard, ConfirmModal, ViewSkeleton } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

/* ============================================================
   MOCK PRODUCT DATA
   Will be replaced with real API calls in database phase.
   ============================================================ */

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  hsnCode: string;
  uom: string;
  gstRate: number;
  isStocked: boolean;
  stockOnHand: number;
  stockValue: number;
  avgCost: number;
}

// MOCK PRODUCTS REMOVED

/* ============================================================
   PRODUCTS VIEW
   ============================================================ */

interface ProductsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ProductsView({ onNavigate }: ProductsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isMovement, setIsMovement] = useState<'receive' | 'issue' | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: prodResp, loading: prodLoad, revalidate: revProd } = useApi<any>('/api/products');
  const { data: invResp, loading: invLoad, revalidate: revInv } = useApi<any>('/api/inventory');

  const revalidateAll = () => { revProd(); revInv(); };

  const products = prodResp?.data || [];
  const inventory = invResp?.data || [];

  const combinedData: ProductRow[] = products.map((p: any) => {
    const inv = inventory.find((i: any) => i.productId === p.id);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      hsnCode: p.hsnCode || 'N/A',
      uom: p.defaultUom,
      gstRate: p.gstRate ? Number(p.gstRate) : 0,
      isStocked: p.isStocked,
      stockOnHand: inv?.totalOnHand || 0,
      stockValue: inv?.totalValue || 0,
      avgCost: inv?.weightedAvgCost || 0,
    };
  });

  const filteredData = React.useMemo(() => {
    return combinedData.filter((p) => {
      if (typeFilter === 'stocked') return p.isStocked;
      if (typeFilter === 'service') return !p.isStocked;
      return true;
    });
  }, [combinedData, typeFilter]);

  if ((prodLoad || invLoad) && !products.length) return <ViewSkeleton />;

  if (isCreating) {
    return <ProductForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidateAll(); }} />;
  }

  if (editingProduct) {
    return <ProductForm /* initialData={editingProduct} */ onCancel={() => setEditingProduct(null)} onSuccess={() => { setEditingProduct(null); revalidateAll(); }} />;
  }

  if (isMovement) {
    return <InventoryMovementForm type={isMovement} products={products} onCancel={() => setIsMovement(null)} onSuccess={() => { setIsMovement(null); revalidateAll(); }} />;
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      revalidateAll();
    } catch (e) {
      console.error(e);
      alert('Failed to delete product');
    } finally {
      setDeletingProduct(null);
    }
  };

  const totalValue = combinedData.reduce((s, p) => s + p.stockValue, 0);
  const totalSKUs = combinedData.length;
  const stockedItems = combinedData.filter((p) => p.isStocked).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Products & Inventory"
        description="Manage product catalogue, stock levels, and cost layers."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button variant="secondary" onClick={() => setIsMovement('receive')}>
              <ArrowDownToLine size={16} /> Receive Stock
            </Button>
            <Button variant="secondary" onClick={() => setIsMovement('issue')}>
              <ArrowUpFromLine size={16} /> Issue Stock
            </Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Add Product
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard label="Total Inventory Value" value={formatINR(totalValue)} icon={<Box size={16} />} />
        <StatCard label="Total SKUs" value={totalSKUs.toString()} icon={<Package size={16} />} />
        <StatCard label="Stocked Items" value={stockedItems.toString()} trend={`${stockedItems} of ${totalSKUs}`} trendUp={null} icon={<ArrowDownToLine size={16} />} />
      </div>

      {/* Product Table */}
      <DataTable<ProductRow>
        columns={[
          {
            key: 'sku',
            header: 'SKU',
            render: (p) => (
              <span className="font-technical" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.sku}</span>
            ),
            width: '110px',
          },
          {
            key: 'name',
            header: 'Product Name',
            render: (p) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{p.name}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  HSN: {p.hsnCode} • {p.uom}
                </p>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (p) => (
              <Badge variant={p.isStocked ? 'success' : 'info'}>
                {p.isStocked ? 'Stocked' : 'Service'}
              </Badge>
            ),
            width: '100px',
          },
          {
            key: 'gstRate',
            header: 'GST',
            render: (p) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{p.gstRate}%</span>
            ),
            width: '60px',
          },
          {
            key: 'stockOnHand',
            header: 'On Hand',
            render: (p) => (
              <span
                className="currency"
                style={{
                  fontWeight: 500,
                  color: p.stockOnHand > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {p.isStocked ? p.stockOnHand.toLocaleString('en-IN') : '—'}
              </span>
            ),
            align: 'right' as const,
            width: '100px',
          },
          {
            key: 'avgCost',
            header: 'Avg Cost',
            render: (p) => (
              <span className="currency" style={{ color: 'var(--text-secondary)' }}>
                {p.isStocked ? formatINR(p.avgCost) : '—'}
              </span>
            ),
            align: 'right' as const,
            width: '110px',
          },
          {
            key: 'stockValue',
            header: 'Stock Value',
            render: (p) => (
              <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {p.isStocked ? formatINR(p.stockValue) : '—'}
              </span>
            ),
            align: 'right' as const,
            width: '130px',
          },
        ]}
        data={filteredData}
        loading={prodLoad || invLoad}
        filters={
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'stocked', label: 'Stocked' },
              { value: 'service', label: 'Service' },
            ]}
            style={{ width: '150px' }}
          />
        }
        searchPlaceholder="Search by SKU, name, or HSN..."
        renderRowActions={(p: ProductRow) => (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setIsMovement('receive')}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Stock In
            </button>
            <button
              onClick={() => setEditingProduct(p)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Edit
            </button>
            <button
              onClick={() => setDeletingProduct(p)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Delete
            </button>
          </div>
        )}
      />

      <ConfirmModal
        open={!!deletingProduct}
        title="Delete Product?"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? If it has been used in invoices or has stock, it will be deactivated instead of deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
}

/* ============================================================
   PRODUCT CREATION FORM
   ============================================================ */
function ProductForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { mutate } = useApi('/api/products');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    hsnCode: '',
    uom: 'PCS',
    type: 'stocked',
    gstRate: '18',
    gstType: 'CGST_SGST',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutate('POST', {
        name: formData.name,
        sku: formData.sku,
        hsnCode: formData.hsnCode || undefined,
        defaultUom: formData.uom,
        isStocked: formData.type === 'stocked',
        gstRate: Number(formData.gstRate),
        gstType: formData.gstType,
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Add Product"
        description="Register a new product or service in the catalogue."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.sku}>
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Basic Info */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Product Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Product Name" placeholder="e.g. Industrial Widgets" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <Input label="SKU Code" placeholder="e.g. IW-500" required value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
              <Input label="HSN / SAC Code" placeholder="e.g. 8481" value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} />
              <Select
                label="Default Unit of Measure"
                value={formData.uom}
                onChange={e => setFormData({ ...formData, uom: e.target.value })}
                options={[
                  { value: 'PCS', label: 'Pieces (PCS)' },
                  { value: 'KG', label: 'Kilograms (KG)' },
                  { value: 'MTR', label: 'Meters (MTR)' },
                  { value: 'LTR', label: 'Litres (LTR)' },
                  { value: 'TON', label: 'Metric Ton (TON)' },
                  { value: 'BOX', label: 'Boxes (BOX)' },
                  { value: 'SET', label: 'Sets (SET)' },
                ]}
              />
              <Select
                label="Product Type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: 'stocked', label: 'Stocked Item (Inventory)' },
                  { value: 'service', label: 'Service Item (Non-Stocked)' },
                ]}
              />
            </div>
          </section>

          {/* Tax & Pricing */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Tax & Pricing
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
              <Select
                label="GST Rate"
                value={formData.gstRate}
                onChange={e => setFormData({ ...formData, gstRate: e.target.value })}
                options={[
                  { value: '0', label: '0% (Exempt)' },
                  { value: '5', label: '5%' },
                  { value: '12', label: '12%' },
                  { value: '18', label: '18%' },
                  { value: '28', label: '28%' },
                ]}
              />
              <Select
                label="GST Type"
                value={formData.gstType}
                onChange={e => setFormData({ ...formData, gstType: e.target.value })}
                options={[
                  { value: 'CGST_SGST', label: 'CGST + SGST (Intra-state)' },
                  { value: 'IGST', label: 'IGST (Inter-state)' },
                ]}
              />
              <Select
                label="Costing Method"
                options={[
                  { value: 'FIFO', label: 'FIFO (First In, First Out)' },
                  { value: 'LIFO', label: 'LIFO (Last In, First Out)' },
                ]}
              />
            </div>
          </section>

          {/* Accounting */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Accounting
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <Select
                label="Default Income Account"
                options={[
                  { value: '', label: 'Select Account...' },
                  { value: '4100', label: '4100 — Sales Revenue' },
                  { value: '4200', label: '4200 — Commission Income (Buyer)' },
                  { value: '4300', label: '4300 — Commission Income (Seller)' },
                ]}
              />
              <Select
                label="Inventory Asset Account"
                options={[
                  { value: '', label: 'Select Account...' },
                  { value: '1300', label: '1300 — Inventory Asset' },
                ]}
              />
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   INVENTORY MOVEMENT FORM (Receive / Issue)
   ============================================================ */
function InventoryMovementForm({ type, products, onCancel, onSuccess }: { type: 'receive' | 'issue'; products: any[]; onCancel: () => void, onSuccess: () => void }) {
  const isReceive = type === 'receive';
  const { mutate } = useApi('/api/inventory');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    qty: '',
    unitCost: '',
  });

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await mutate('POST', {
        action: isReceive ? 'receive' : 'issue',
        productId: formData.productId,
        qty: Number(formData.qty),
        unitCost: isReceive ? Number(formData.unitCost) : undefined,
        cogsAccountId: '99999999-9999-9999-9999-999999999999', // We'll patch this dynamically in full scale, or backend can provide default
        inventoryAccountId: '99999999-9999-9999-9999-999999999999', // Dummy for now since we're focused on UI routing
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to process inventory movement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title={isReceive ? 'Receive Stock' : 'Issue Stock'}
        description={isReceive
          ? 'Record incoming stock — creates a new cost layer for FIFO/LIFO tracking.'
          : 'Issue stock from inventory — consumes cost layers per the configured costing method.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.productId || !formData.qty || (isReceive && !formData.unitCost)}>
              {saving ? 'Processing...' : isReceive ? 'Record Receipt' : 'Confirm Issue'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Select
                label="Product"
                required
                value={formData.productId}
                onChange={e => setFormData({ ...formData, productId: e.target.value })}
                options={[
                  { value: '', label: 'Select Product...' },
                  ...products.filter((p) => p.isStocked).map((p) => ({
                    value: p.id,
                    label: `${p.sku} — ${p.name}`,
                  })),
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Quantity *
              </label>
              <Input type="number" placeholder="0" required value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} />
            </div>
            {isReceive && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Unit Cost (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                  <Input type="number" placeholder="0.00" required style={{ paddingLeft: '28px' }} value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: e.target.value })} />
                </div>
              </div>
            )}
            {!isReceive && (
              <Select
                label="Costing Method"
                options={[
                  { value: 'FIFO', label: 'FIFO (First In, First Out)' },
                  { value: 'LIFO', label: 'LIFO (Last In, First Out)' },
                ]}
              />
            )}
          </div>

          {/* Info box */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isReceive ? 'var(--color-success-light)' : 'var(--color-warning-light)',
              padding: 'var(--space-4)',
              border: 'none',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: isReceive ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
              {isReceive
                ? '📦 A new cost layer will be created with this quantity and unit cost. This layer will be consumed on future issues based on the FIFO/LIFO policy.'
                : '⚠️ Stock will be consumed from existing cost layers. The system will auto-post a COGS journal entry (Dr COGS / Cr Inventory Asset) for the consumed value.'
              }
            </p>
          </div>

          {!isReceive && (
            <div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                Available Cost Layers
              </h4>
              <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Received</th>
                      <th style={{ textAlign: 'right' }}>Remaining Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ textAlign: 'right' }}>Layer Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ color: 'var(--text-secondary)' }}>01-03-2026</td>
                      <td className="currency" style={{ textAlign: 'right' }}>1,000</td>
                      <td className="currency" style={{ textAlign: 'right' }}>₹240.00</td>
                      <td className="currency" style={{ textAlign: 'right', fontWeight: 500 }}>₹2,40,000</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--text-secondary)' }}>15-03-2026</td>
                      <td className="currency" style={{ textAlign: 'right' }}>1,500</td>
                      <td className="currency" style={{ textAlign: 'right' }}>₹260.00</td>
                      <td className="currency" style={{ textAlign: 'right', fontWeight: 500 }}>₹3,90,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
