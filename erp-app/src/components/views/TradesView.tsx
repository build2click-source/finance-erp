'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { TradeBulkUploadModal } from './TradeBulkUploadModal';
import { formatINR } from '@/lib/utils/format';

interface TradesViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TradesView({ onNavigate }: TradesViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [clientIdFilter, setClientIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    const cf = sessionStorage.getItem('clientFilter');
    if (cf) {
      setClientIdFilter(cf);
      sessionStorage.removeItem('clientFilter');
      const fl = sessionStorage.getItem('forceLimit');
      if (fl) {
        setLimit(parseInt(fl, 10));
        sessionStorage.removeItem('forceLimit');
      }
    }
  }, []);

  const queryParams = new URLSearchParams();
  if (clientIdFilter) queryParams.set('clientId', clientIdFilter);
  if (fromDate) queryParams.set('fromDate', fromDate);
  if (toDate) queryParams.set('toDate', toDate);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  const { data: tradesResp, loading, revalidate } = useApi<any>(`/api/trades?${queryParams.toString()}`);
  const trades = tradesResp?.data || [];
  const { data: clientsData } = useApi<any>('/api/clients');
  const clients = clientsData?.data || [];

  if (isCreating) {
    return <TradeForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Data Entry (Trades)"
        description="Record commodity trades, quantities, and commission."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              Upload CSV
            </Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Trade
            </Button>
          </div>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'seller',
            header: 'From Client(seller)',
            render: (t) => t.seller?.name,
          },
          {
            key: 'date',
            header: 'DATE',
            render: (t) => t.date.split('T')[0],
          },
          {
            key: 'quantity',
            header: 'QUANTITY/MT',
            render: (t) => Number(t.quantity).toString(),
            align: 'right',
          },
          {
            key: 'price',
            header: 'PRICE',
            render: (t) => Number(t.price).toString(),
            align: 'right',
          },
          {
            key: 'tradeType',
            header: 'BUY/SELL',
            render: (t) => t.tradeType.toUpperCase(),
          },
          {
            key: 'buyer',
            header: 'To Client(buyer)',
            render: (t) => t.buyer?.name,
          },
          {
            key: 'product',
            header: 'PRODUCT',
            render: (t) => t.product?.name,
          },
          {
            key: 'remarks',
            header: 'REMARK',
            render: (t) => t.remarks || '',
          },
          {
            key: 'commissionRate',
            header: '@',
            render: (t) => Number(t.commissionRate).toString(),
            align: 'right',
          },
          {
            key: 'commissionAmt',
            header: 'AMOUNT',
            render: (t) => formatINR(t.commissionAmt),
            align: 'right',
          },
        ]}
        data={trades}
        loading={loading}
        totalCount={tradesResp?.pagination?.total || 0}
        currentPage={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        searchPlaceholder="Search trades..."
        renderRowActions={(t) => (
          <button
            onClick={() => alert("Trade editing directly is unavailable. Please process adjustments via credit/debit notes.")}
            title="Edit Trade"
            style={{ padding: '6px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Edit size={16} />
          </button>
        )}
        filters={
          <>
            <Select
              value={clientIdFilter}
              onChange={(e) => { setClientIdFilter(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All Clients' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
              style={{ width: '200px' }}
            />
            <Input 
              type="date" 
              value={fromDate} 
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }} 
              placeholder="From Date"
              style={{ width: '130px' }}
            />
            <Input 
              type="date" 
              value={toDate} 
              onChange={(e) => { setToDate(e.target.value); setPage(1); }} 
              placeholder="To Date"
              style={{ width: '130px' }}
            />
          </>
        }
      />

      <TradeBulkUploadModal 
        open={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          revalidate();
        }}
      />
    </div>
  );
}

// -------------------------------------------------------------
// TRADE ENTRY FORM
// -------------------------------------------------------------
function TradeForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const { data: clientsData } = useApi<any>('/api/clients');
  const { data: productsData } = useApi<any>('/api/products');

  const clients = useMemo(() => clientsData?.data || [], [clientsData]);
  const allProducts = useMemo(() => productsData?.data || [], [productsData]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeType, setTradeType] = useState('sell');

  // Searchable Seller Field
  const [sellerQuery, setSellerQuery] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [isSellerBoxOpen, setIsSellerBoxOpen] = useState(false);

  const filteredSellers = useMemo(() => {
    if (!sellerQuery) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(sellerQuery.toLowerCase()));
  }, [clients, sellerQuery]);

  // Searchable Buyer Field
  const [buyerQuery, setBuyerQuery] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [isBuyerBoxOpen, setIsBuyerBoxOpen] = useState(false);

  const filteredBuyers = useMemo(() => {
    if (!buyerQuery) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(buyerQuery.toLowerCase()));
  }, [clients, buyerQuery]);

  const [items, setItems] = useState<any[]>([
    { id: '1', productId: '', quantity: '', price: '', remarks: '', commissionRate: '' }
  ]);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), productId: '', quantity: '', price: '', remarks: '', commissionRate: '' }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, val: string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  const isValid = items.length > 0 && items.every(i => i.productId && Number(i.quantity) > 0 && Number(i.price) > 0) && sellerId && buyerId && date;

  const handleSave = async () => {
    if (sellerId === buyerId) {
      alert("Buyer and seller cannot be the same client.");
      return;
    }
    if (!isValid) {
      alert("Please ensure all rows have products, quantities, and prices.");
      return;
    }

    setSaving(true);
    try {
      const payload = items.map(item => {
        const qtyNum = parseFloat(item.quantity) || 0;
        const priceNum = parseFloat(item.price) || 0;
        const rateNum = parseFloat(item.commissionRate) || 0;
        const amtNum = qtyNum * priceNum * (rateNum / 100); // Usually commission amt might be based on qty*price*rate OR just qty*rate. Original handled it as amtNum calculation. Wait, original TradeForm was: qtyNum * rateNum ? Actually, let me implement what original had: amountNum = qtyNum * rateNum.
        // Wait, original Trade Bulk Upload had: qty * price * commRate / 100.
        // Original Trade Form had `const amountNum = quantityNum * rateNum;`. Let's stick to qtyNum * rateNum to be safe or just whatever it was.
        const originalFormulaAmt = qtyNum * rateNum;
        return {
          date,
          sellerId,
          buyerId,
          tradeType,
          productId: item.productId,
          quantity: qtyNum,
          price: priceNum,
          remarks: item.remarks,
          commissionRate: rateNum,
          commissionAmt: originalFormulaAmt,
        };
      });

      const res = await fetch('/api/trades/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert('Failed to save trades: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Record New Trade"
        description="Enter multiple data lines exactly as the log prescribes."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !isValid}>Save Trades</Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Header Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select
              label="Buy / Sell"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              options={[
                { value: 'sell', label: 'Sell' },
                { value: 'buy', label: 'Buy' },
              ]}
            />
            <div style={{ position: 'relative' }}>
              <Input 
                label="From Client (Seller - Search)" 
                placeholder="Start typing to search sellers..." 
                value={sellerQuery}
                onChange={(e) => {
                  setSellerQuery(e.target.value);
                  setSellerId(''); 
                  setIsSellerBoxOpen(true);
                }}
                onFocus={() => setIsSellerBoxOpen(true)}
              />
              {isSellerBoxOpen && filteredSellers.length > 0 && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                  backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-subtle)', 
                  borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {filteredSellers.map((c: any) => (
                    <div 
                      key={c.id} 
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      onClick={() => {
                        setSellerId(c.id);
                        setSellerQuery(c.name);
                        setIsSellerBoxOpen(false);
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
              {isSellerBoxOpen && (
                <div style={{position: 'fixed', inset: 0, zIndex: 9}} onClick={() => setIsSellerBoxOpen(false)} />
              )}
            </div>
            
            <div style={{ position: 'relative' }}>
              <Input 
                label="To Client (Buyer - Search)" 
                placeholder="Start typing to search buyers..." 
                value={buyerQuery}
                onChange={(e) => {
                  setBuyerQuery(e.target.value);
                  setBuyerId(''); 
                  setIsBuyerBoxOpen(true);
                }}
                onFocus={() => setIsBuyerBoxOpen(true)}
              />
              {isBuyerBoxOpen && filteredBuyers.length > 0 && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                  backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-subtle)', 
                  borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {filteredBuyers.map((c: any) => (
                    <div 
                      key={c.id} 
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      onClick={() => {
                        setBuyerId(c.id);
                        setBuyerQuery(c.name);
                        setIsBuyerBoxOpen(false);
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
              {isBuyerBoxOpen && (
                <div style={{position: 'fixed', inset: 0, zIndex: 9}} onClick={() => setIsBuyerBoxOpen(false)} />
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Line Items</h3>
            <Button size="sm" variant="secondary" onClick={addItem}><Plus size={14} /> Add Row</Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: '700px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px', fontWeight: 600 }}>Product</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>Remarks</th>
                  <th style={{ padding: '12px', fontWeight: 600, width: '100px' }}>Qty/MT</th>
                  <th style={{ padding: '12px', fontWeight: 600, width: '120px' }}>Price</th>
                  <th style={{ padding: '12px', fontWeight: 600, width: '100px' }}>Comm @</th>
                  <th style={{ padding: '12px', fontWeight: 600, width: '120px' }}>Amount</th>
                  <th style={{ padding: '12px', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const qty = parseFloat(item.quantity) || 0;
                  const rate = parseFloat(item.commissionRate) || 0;
                  const amt = qty * rate;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px' }}>
                        <Select 
                          value={item.productId}
                          onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                          options={[{ value: '', label: 'Select...' }, ...allProducts.map((p: any) => ({ value: p.id, label: p.name }))]}
                          style={{ minWidth: '150px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <Input value={item.remarks} onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} placeholder="Remarks..." />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} placeholder="0" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <Input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} placeholder="0.00" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <Input type="number" value={item.commissionRate} onChange={(e) => updateItem(item.id, 'commissionRate', e.target.value)} placeholder="0" />
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {formatINR(amt)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item.id)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
