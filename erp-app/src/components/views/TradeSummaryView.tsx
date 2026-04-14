'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Mail, Edit, Check, X } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { useApi } from '@/lib/hooks/useApi';
import { InvoicePreview } from './InvoicePreview';

export function TradeSummaryView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { data: clientsData } = useApi<any>('/api/clients');
  const clients = useMemo(() => clientsData?.data || [], [clientsData]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [isClientBoxOpen, setIsClientBoxOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  
  // Trades selection
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [showDraftBill, setShowDraftBill] = useState(false);
  
  // Custom Overrides (doesn't modify DB, only affects UI & draft bill)
  const [draftOverrides, setDraftOverrides] = useState<Record<string, { quantity: string, price: string, commissionAmt: string, remarks: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', price: '', commissionAmt: '', remarks: '' });

  // Period / Filters
  const [period, setPeriod] = useState<'custom' | 'month' | 'quarter' | 'half' | 'year'>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Limits
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(1000); // High limit for universal view

  // Draft Bill Column Configurations
  const [draftCols, setDraftCols] = useState({
    date: true,
    product: true,
    qty: true,
    price: false,
    comm: true,
    remark: true
  });

  // Derived effective trade objects combining DB + Override
  const applyOverrides = (trade: any) => {
    const over = draftOverrides[trade.id];
    if (!over) return trade;
    return {
      ...trade,
      quantity: over.quantity !== undefined ? over.quantity : trade.quantity,
      price: over.price !== undefined ? over.price : trade.price,
      commissionAmt: over.commissionAmt !== undefined ? over.commissionAmt : trade.commissionAmt,
      remarks: over.remarks !== undefined ? over.remarks : trade.remarks
    };
  };

  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), q * 3, 1);
      end = new Date(today.getFullYear(), (q + 1) * 3, 0);
    } else if (period === 'half') {
      const h = today.getMonth() < 6 ? 0 : 6;
      start = new Date(today.getFullYear(), h, 1);
      end = new Date(today.getFullYear(), h + 6, 0);
    } else if (period === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    }

    if (period !== 'custom') {
      // Avoid firing redundant set states
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      if (fromDate !== startStr) setFromDate(startStr);
      if (toDate !== endStr) setToDate(endStr);
    }
  }, [period]);

  const fetchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set('clientId', selectedClientId);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return `/api/trades?${params.toString()}`;
  }, [selectedClientId, fromDate, toDate, page, limit]);

  const { data: tradesResp, loading } = useApi<any>(fetchUrl || '');
  const trades = tradesResp?.data || [];

  const filteredClients = useMemo(() => {
    if (!clientQuery) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(clientQuery.toLowerCase()));
  }, [clients, clientQuery]);

  // Map trades through overrides automatically for tables
  const effectiveTrades = useMemo(() => {
    return trades.map(applyOverrides);
  }, [trades, draftOverrides]);

  const selectedEffectiveTrades = useMemo(() => 
    effectiveTrades.filter((t: any) => selectedTradeIds.has(t.id)),
  [effectiveTrades, selectedTradeIds]);

  // Aggregate dynamically based on SELECTED trades if there is a selection, otherwise calculate overall effective
  const totals = useMemo(() => {
    if (!selectedClientId) return { qty: 0, commission: 0 };
    const source = selectedTradeIds.size > 0 ? selectedEffectiveTrades : effectiveTrades;
    return source.reduce((acc: any, t: any) => ({
      qty: acc.qty + Number(t.quantity),
      commission: acc.commission + Number(t.commissionAmt)
    }), { qty: 0, commission: 0 });
  }, [effectiveTrades, selectedEffectiveTrades, selectedTradeIds, selectedClientId]);

  const toggleAll = () => {
    if (selectedTradeIds.size === trades.length && trades.length > 0) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(trades.map((t: any) => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedTradeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTradeIds(next);
  };

  // Inline Editing Lifecycle
  const openEdit = (tradeId: string) => {
    const t = effectiveTrades.find((t: any) => t.id === tradeId);
    if (!t) return;
    setEditingId(tradeId);
    setEditForm({
      quantity: String(t.quantity),
      price: String(t.price),
      commissionAmt: String(t.commissionAmt),
      remarks: t.remarks || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const originalTrade = trades.find((t: any) => t.id === editingId);
    
    const isCoreChanged = (
      String(originalTrade.quantity) !== editForm.quantity || 
      String(originalTrade.price) !== editForm.price || 
      String(originalTrade.commissionAmt) !== editForm.commissionAmt
    );
    
    if (isCoreChanged && !editForm.remarks.trim()) {
      alert("A Remark is mandatory when altering original data fields for the draft bill.");
      return;
    }

    setDraftOverrides(prev => ({
      ...prev,
      [editingId]: { ...editForm }
    }));
    setEditingId(null);
  };

  const handleDraftInvoice = () => {
    if (!selectedClientId || selectedEffectiveTrades.length === 0) {
      alert("Please select at least one trade to generate a draft invoice.");
      return;
    }
    
    const preloadedItems = selectedEffectiveTrades.map((t: any) => {
      const partnerName = t.buyerId === selectedClientId ? t.seller?.name : t.buyer?.name;
      const desc = `${t.product?.name || 'Product'} ${partnerName ? `- ${partnerName}` : ''}`;
      
      return {
        productId: t.product?.id || '',
        description: desc,
        qty: Number(t.quantity) || 0,
        unitPrice: Number(t.commissionRate) || 0,
        gstRate: t.product?.gstRate ? Number(t.product.gstRate) : 0,
        hsnCode: t.product?.hsnCode || '',
        per: 'MT'
      };
    });

    const preloadData = {
      form: {
        clientId: selectedClientId,
        type: 'TaxInvoice',
      },
      items: preloadedItems
    };

    sessionStorage.setItem('draftInvoicePreload', JSON.stringify(preloadData));
    if (onNavigate) onNavigate('invoices');
  };

  if (showDraftBill) {
    return (
      <DraftBillPreview 
        trades={selectedEffectiveTrades} 
        client={clients.find((c: any) => c.id === selectedClientId)}
        periodLabel={`${new Date(fromDate).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()} - ${new Date(toDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase()}`}
        onBack={() => setShowDraftBill(false)} 
        draftCols={draftCols}
        setDraftCols={setDraftCols}
      />
    );
  }

  if (previewInvoiceId) {
    return <InvoicePreview id={previewInvoiceId} onBack={() => setPreviewInvoiceId(null)} />;
  }

  const columns = [
    {
      key: 'selection',
      header: (
        <input 
          type="checkbox" 
          checked={selectedTradeIds.size === effectiveTrades.length && effectiveTrades.length > 0}
          onChange={toggleAll}
          title="Select all on screen"
        />
      ),
      render: (row: any) => (
        <input 
          type="checkbox" 
          checked={selectedTradeIds.has(row.id)}
          onChange={() => toggleOne(row.id)}
        />
      ),
      width: '40px'
    },
    {
      key: 'date',
      header: 'Date',
      render: (row: any) => new Date(row.date).toLocaleDateString('en-IN')
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => {
        const isBuy = row.buyerId === selectedClientId;
        return <Badge variant={isBuy ? 'warning' : 'success'}>{isBuy ? 'BUY' : 'SELL'}</Badge>;
      }
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (row: any) => (row.buyerId === selectedClientId ? row.seller?.name : row.buyer?.name)
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: any) => row.product?.name
    },
    {
      key: 'quantity',
      header: 'Qty/MT',
      align: 'right' as const,
      render: (row: any) => {
        if (editingId === row.id) {
          return <Input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ width: '80px', display: 'inline-block' }} />;
        }
        return <span style={{ color: draftOverrides[row.id]?.quantity ? 'var(--primary)' : 'inherit' }}>{row.quantity}</span>;
      }
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right' as const,
      render: (row: any) => {
        if (editingId === row.id) {
          return <Input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={{ width: '80px', display: 'inline-block' }} />;
        }
        return <span style={{ color: draftOverrides[row.id]?.price ? 'var(--primary)' : 'inherit' }}>₹{Number(row.price).toLocaleString('en-IN')}</span>;
      }
    },
    {
      key: 'commissionAmt',
      header: 'Comm.',
      align: 'right' as const,
      render: (row: any) => {
        if (editingId === row.id) {
          return <Input type="number" value={editForm.commissionAmt} onChange={e => setEditForm({ ...editForm, commissionAmt: e.target.value })} style={{ width: '100px', display: 'inline-block' }} />;
        }
        return <strong style={{ color: 'var(--primary)' }}>₹{Number(row.commissionAmt).toLocaleString('en-IN')}</strong>;
      }
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (row: any) => {
        if (editingId === row.id) {
          return <Input type="text" value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} style={{ width: '120px', display: 'inline-block' }} />;
        }
        return <span style={{ color: 'var(--text-secondary)' }}>{row.remarks || '—'}</span>;
      }
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Trade Summary"
        description="Select specific trades, modify display limits, and instantly draft custom bills."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {selectedTradeIds.size > 0 && (
              <>
                <Button variant="secondary" onClick={() => setShowDraftBill(true)}>
                  Draft Bill ({selectedTradeIds.size})
                </Button>
                <Button onClick={handleDraftInvoice}>
                  Draft Invoice ({selectedTradeIds.size})
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)', alignItems: 'flex-end' }}>
            {/* Client Search */}
            <div style={{ position: 'relative' }}>
              <Input 
                label="Search Client (Buyer or Seller)" 
                placeholder="Type client name..." 
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setSelectedClientId('');
                  setIsClientBoxOpen(true);
                }}
                onFocus={() => setIsClientBoxOpen(true)}
                icon={<Search size={16} />}
              />
              {isClientBoxOpen && filteredClients.length > 0 && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                  backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-subtle)', 
                  borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  {filteredClients.map((c: any) => (
                    <div 
                      key={c.id} 
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientQuery(c.name);
                        setIsClientBoxOpen(false);
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{c.code}</div>
                    </div>
                  ))}
                </div>
              )}
              {isClientBoxOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setIsClientBoxOpen(false)} />}
            </div>

            {/* Quick Period Selection */}
            <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--surface-container-low)', padding: '4px', borderRadius: '12px' }}>
              {(['month', 'quarter', 'half', 'year', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: period === p ? 'var(--surface-container-high)' : 'transparent',
                    color: period === p ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-6)', alignItems: 'center' }}>
            <Input 
                label="From Date" 
                type="date" 
                value={fromDate} 
                onChange={(e) => { setFromDate(e.target.value); setPeriod('custom'); }} 
            />
            <Input 
                label="To Date" 
                type="date" 
                value={toDate} 
                onChange={(e) => { setToDate(e.target.value); setPeriod('custom'); }} 
            />
            <div style={{ display: 'flex', gap: 'var(--space-4)', paddingBottom: '4px' }}>
                <div style={{ flex: 1, backgroundColor: 'var(--surface-container-high)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Qty (MT)</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{totals.qty.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--surface-container-high)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Comm.</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>₹{totals.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>
          </div>
        </div>
      </Card>

      {!selectedClientId ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--surface-container-low)', borderRadius: '24px', border: '2px dashed var(--border-subtle)' }}>
            <Search size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 500 }}>Search and select a client to generate the trade summary.</p>
        </div>
      ) : (
        <DataTable
          loading={loading}
          data={effectiveTrades}
          disableSearch={true}
          totalCount={tradesResp?.pagination?.total || 0}
          currentPage={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          columns={columns as any[]}
          renderRowActions={(row: any) => {
            if (editingId === row.id) {
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={saveEdit} style={{ background: 'none', border: 'none', color: 'var(--color-command-green)', cursor: 'pointer' }}><Check size={16} /></button>
                  <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><X size={16} /></button>
                </div>
              )
            }
            return (
              <button onClick={() => openEdit(row.id)} title="Edit Draft Overrides" style={{ padding: '6px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Edit size={16} />
              </button>
            )
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   MODERN DRAFT BILL PREVIEW
   ============================================================ */
function DraftBillPreview({ trades, client, periodLabel, onBack, draftCols, setDraftCols }: { 
  trades: any[], 
  client: any, 
  periodLabel: string,
  onBack: () => void,
  draftCols: any,
  setDraftCols: any
}) {
  const { data: companyResp } = useApi<any>('/api/setup-company');
  const company = companyResp?.profile;

  const totalCommission = trades.reduce((sum, t) => sum + Number(t.commissionAmt), 0);
  const totalQty = trades.reduce((sum, t) => sum + Number(t.quantity), 0);

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const text = `Draft Bill for ${client?.name}\n` +
                 `Period: ${periodLabel}\n` +
                 `Trades: ${trades.length}\n` +
                 `Total Commission: ₹${totalCommission.toLocaleString('en-IN')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    window.location.href = `mailto:${client?.email || ''}?subject=Draft Bill ${periodLabel}&body=Please find the draft bill for the period ${periodLabel}. Total: ₹${totalCommission.toLocaleString('en-IN')}`;
  };

  const toggleCol = (key: string) => {
    setDraftCols((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Draft Bill Preview"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={onBack}>Back to Summary</Button>
            <Button variant="primary" onClick={handlePrint}>Download PDF / Print</Button>
            <Button variant="secondary" onClick={handleWhatsApp}>WhatsApp</Button>
            <Button variant="secondary" onClick={handleEmail}>Email</Button>
          </div>
        }
      />

      {/* Bill Options Bar */}
      <Card padding={false} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--surface-container-low)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Toggle Visible Columns:</span>
          {Object.entries({
             date: 'Date', product: 'Product / Partner', qty: 'Qty / MT', price: 'Price', comm: 'Amount', remark: 'Remarks'
          }).map(([k, label]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
              <input type="checkbox" checked={draftCols[k]} onChange={() => toggleCol(k)} />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <div className="printable-bill" style={{ 
        backgroundColor: 'white', color: '#0e1629', padding: '60px', 
        borderRadius: '16px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-data)'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .printable-bill, .printable-bill * { visibility: visible; }
            .printable-bill { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 20px !important; }
            @page { size: A4; margin: 1cm; }
          }
        `}} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{company?.name || 'ARM Enterprises'}</h1>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>{company?.address}</p>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>GSTIN: {company?.gstin}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              backgroundColor: 'var(--primary-container)', color: 'var(--primary)', 
              padding: '6px 12px', borderRadius: '24px', fontSize: '12px', fontWeight: 700 
            }}>DRAFT BILL</span>
            <div style={{ marginTop: '16px', fontSize: '22px', fontWeight: 800 }}>{periodLabel}</div>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Billing Period</div>
          </div>
        </div>

        {/* Client Info */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Bill To</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{client?.name}</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{client?.address || '—'}</div>
        </div>

        {/* Grid Table */}
        <div style={{ margin: '0 0 32px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #000' }}>
                {draftCols.date && <th style={{ padding: '12px 0' }}>Date</th>}
                {draftCols.product && <th style={{ padding: '12px 0' }}>Particulars (Product / Partner)</th>}
                {draftCols.remark && <th style={{ padding: '12px 0' }}>Remarks</th>}
                {draftCols.qty && <th style={{ padding: '12px 0', textAlign: 'right' }}>Qty/MT</th>}
                {draftCols.price && <th style={{ padding: '12px 0', textAlign: 'right' }}>Price</th>}
                {draftCols.comm && <th style={{ padding: '12px 0', textAlign: 'right' }}>Commission Amt</th>}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {draftCols.date && <td style={{ padding: '12px 0' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>}
                  {draftCols.product && (
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: 600 }}>{t.product?.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{t.buyerId === client?.id ? `from ${t.seller?.name}` : `to ${t.buyer?.name}`}</div>
                    </td>
                  )}
                  {draftCols.remark && <td style={{ padding: '12px 0', color: '#64748b' }}>{t.remarks || '—'}</td>}
                  {draftCols.qty && <td style={{ padding: '12px 0', textAlign: 'right' }}>{Number(t.quantity).toFixed(2)}</td>}
                  {draftCols.price && <td style={{ padding: '12px 0', textAlign: 'right' }}>₹{Number(t.price).toLocaleString('en-IN')}</td>}
                  {draftCols.comm && <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>₹{Number(t.commissionAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ 
          display: 'flex', justifyContent: 'flex-end', marginTop: '32px', 
          paddingTop: '24px', borderTop: '2px solid #000' 
        }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
              <span style={{ color: '#64748b' }}>Total Quantity (MT)</span>
              <span style={{ fontWeight: 700 }}>{totalQty.toFixed(2)}</span>
            </div>
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', 
              backgroundColor: '#fef2f2', color: '#dc2626',
              border: '2px solid #ef4444',
              padding: '16px', borderRadius: '12px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}>
              <span style={{ fontWeight: 700 }}>Total Commission</span>
              <span style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>₹ {totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '80px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          <p>This is a temporary draft bill for confirmation. Not a tax invoice.</p>
          <p style={{ marginTop: '4px' }}>Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
