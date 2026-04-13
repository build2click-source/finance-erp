'use client';

import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';
import { TradeBulkUploadModal } from './TradeBulkUploadModal';

interface TradesViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TradesView({ onNavigate }: TradesViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { data: tradesResp, loading, revalidate } = useApi<any>('/api/trades?limit=100');
  const trades = tradesResp?.data || [];

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
            render: (t) => Number(t.commissionAmt).toString(),
            align: 'right',
          },
        ]}
        data={trades}
        loading={loading}
        totalCount={tradesResp?.pagination?.total || 0}
        searchPlaceholder="Search trades..."
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
  const { mutate } = useApi('/api/trades');

  const clients = useMemo(() => clientsData?.data || [], [clientsData]);
  const allProducts = useMemo(() => productsData?.data || [], [productsData]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeType, setTradeType] = useState('sell');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [commissionRate, setCommissionRate] = useState('');

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

  // Searchable Product Field (Elasticsearch imitation)
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [isProductBoxOpen, setIsProductBoxOpen] = useState(false);

  // Filtered products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productQuery) return allProducts;
    return allProducts.filter((p: any) => p.name.toLowerCase().includes(productQuery.toLowerCase()));
  }, [allProducts, productQuery]);

  // Derived amount
  const quantityNum = parseFloat(quantity) || 0;
  const rateNum = parseFloat(commissionRate) || 0;
  const amountNum = quantityNum * rateNum;

  const valid = !!(date && sellerId && buyerId && productId && quantityNum > 0 && parseFloat(price) > 0);

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await mutate('POST', {
        date,
        sellerId,
        buyerId,
        productId,
        tradeType,
        quantity: quantityNum,
        price: parseFloat(price),
        remarks,
        commissionRate: rateNum,
        commissionAmt: amountNum,
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert('Failed to save trade: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Record New Trade"
        description="Enter data exactly as the log prescribes."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !valid}>Save Trade</Button>
          </>
        }
      />

      <Card>
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
              <div 
                style={{position: 'fixed', inset: 0, zIndex: 9}} 
                onClick={() => setIsSellerBoxOpen(false)} 
              />
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
              <div 
                style={{position: 'fixed', inset: 0, zIndex: 9}} 
                onClick={() => setIsBuyerBoxOpen(false)} 
              />
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Input 
              label="Product (Search)" 
              placeholder="Start typing to search products..." 
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                setProductId(''); // Reset ID since user is typing new
                setIsProductBoxOpen(true);
              }}
              onFocus={() => setIsProductBoxOpen(true)}
            />
            {isProductBoxOpen && filteredProducts.length > 0 && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-subtle)', 
                borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                boxShadow: 'var(--shadow-md)'
              }}>
                {filteredProducts.map((p: any) => (
                  <div 
                    key={p.id} 
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => {
                      setProductId(p.id);
                      setProductQuery(p.name);
                      setIsProductBoxOpen(false);
                    }}
                  >
                    {p.name} <span style={{color: 'var(--text-tertiary)', fontSize: '0.8em'}}>({p.sku})</span>
                  </div>
                ))}
              </div>
            )}
            {/* Click outside overlay to close box */}
            {isProductBoxOpen && (
              <div 
                style={{position: 'fixed', inset: 0, zIndex: 9}} 
                onClick={() => setIsProductBoxOpen(false)} 
              />
            )}
          </div>
          
          <Input label="Remarks" placeholder="If any..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />

          <Input label="Quantity / MT" type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input label="Price" type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          
          <Input label="Commission Rate (@)" type="number" placeholder="0.00" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
          <Input label="Amount (Auto-calculated)" type="number" value={amountNum.toString() || ''} disabled style={{ backgroundColor: 'var(--surface-container-high)', fontWeight: 'bold' }} />
        </div>
      </Card>
    </div>
  );
}
