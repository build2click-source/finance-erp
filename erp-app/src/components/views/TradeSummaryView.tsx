'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, MessageSquare, Mail, Calendar, Filter } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { useApi } from '@/lib/hooks/useApi';
import { InvoicePreview } from './InvoicePreview';
import { TradeBulkUploadModal } from './TradeBulkUploadModal';

export function TradeSummaryView() {
  const { data: clientsData } = useApi<any>('/api/clients');
  const clients = useMemo(() => clientsData?.data || [], [clientsData]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [isClientBoxOpen, setIsClientBoxOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [showDraftBill, setShowDraftBill] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [period, setPeriod] = useState<'custom' | 'month' | 'quarter' | 'half' | 'year'>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Auto-set dates based on period
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
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    }
  }, [period]);

  const fetchUrl = useMemo(() => {
    if (!selectedClientId) return '/api/trades?limit=100'; // If no client, fetch latest
    let url = `/api/trades?clientId=${selectedClientId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return url;
  }, [selectedClientId, fromDate, toDate]);

  const { data: tradesResp, loading, revalidate } = useApi<any>(fetchUrl || '');
  const trades = tradesResp?.data || [];

  const filteredClients = useMemo(() => {
    if (!clientQuery) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(clientQuery.toLowerCase()));
  }, [clients, clientQuery]);

  const totals = useMemo(() => {
    return trades.reduce((acc: any, t: any) => ({
      qty: acc.qty + Number(t.quantity),
      commission: acc.commission + Number(t.commissionAmt)
    }), { qty: 0, commission: 0 });
  }, [trades]);

  const toggleAll = () => {
    if (selectedTradeIds.size === trades.length) {
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

  const selectedTrades = useMemo(() => 
    trades.filter((t: any) => selectedTradeIds.has(t.id)),
  [trades, selectedTradeIds]);

  if (showDraftBill) {
    return (
      <DraftBillPreview 
        trades={selectedTrades} 
        client={clients.find((c: any) => c.id === selectedClientId)}
        periodLabel={`${new Date(fromDate).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()} - ${new Date(toDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase()}`}
        onBack={() => setShowDraftBill(false)} 
      />
    );
  }

  if (previewInvoiceId) {
    return <InvoicePreview id={previewInvoiceId} onBack={() => setPreviewInvoiceId(null)} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Trade Summary"
        description="Comprehensive report of Buy & Sell trades for a specific client."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              Upload CSV
            </Button>
            {selectedTradeIds.size > 0 && (
              <Button onClick={() => setShowDraftBill(true)}>
                Generate Draft Bill ({selectedTradeIds.size})
              </Button>
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
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{totals.qty}</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--surface-container-high)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Comm.</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>₹{totals.commission.toLocaleString('en-IN')}</div>
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
        <Card padding={false} style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', whiteSpace: 'nowrap', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--surface-container-high)' }}>
                        <th style={{ width: '40px', padding: '12px 16px' }}>
                          <input 
                            type="checkbox" 
                            checked={trades.length > 0 && selectedTradeIds.size === trades.length}
                            onChange={toggleAll}
                          />
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Partner</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Qty/MT</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Price</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Comm.</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                    ) : trades.length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>No matches found for the selected period.</td></tr>
                    ) : (
                        trades.map((t: any) => {
                            const isBuy = t.buyerId === selectedClientId;
                            const partner = isBuy ? t.seller?.name : t.buyer?.name;
                            const isSelected = selectedTradeIds.has(t.id);
                            return (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: isSelected ? 'var(--primary-container-low)' : 'transparent' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => toggleOne(t.id)}
                                      />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>{new Date(t.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <Badge variant={isBuy ? 'warning' : 'success'}>
                                            {isBuy ? 'BUY' : 'SELL'}
                                        </Badge>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>{partner}</td>
                                    <td style={{ padding: '12px 16px' }}>{t.product?.name}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{t.quantity}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹{Number(t.price).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₹{Number(t.commissionAmt).toLocaleString('en-IN')}</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </Card>
      )}

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

/* ============================================================
   MODERN DRAFT BILL PREVIEW
   ============================================================ */
function DraftBillPreview({ trades, client, periodLabel, onBack }: { 
  trades: any[], 
  client: any, 
  periodLabel: string,
  onBack: () => void 
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
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
                <th style={{ padding: '12px 0' }}>Date</th>
                <th style={{ padding: '12px 0' }}>Particulars (Product / Partner)</th>
                <th style={{ padding: '12px 0', textAlign: 'right' }}>Qty/MT</th>
                <th style={{ padding: '12px 0', textAlign: 'right' }}>Commission Amt</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 0' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: 600 }}>{t.product?.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t.buyerId === client?.id ? `from ${t.seller?.name}` : `to ${t.buyer?.name}`}</div>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>{Number(t.quantity).toFixed(2)}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>₹{Number(t.commissionAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
              backgroundColor: '#0e1629', color: 'white', 
              padding: '16px', borderRadius: '12px' 
            }}>
              <span style={{ fontWeight: 600 }}>Total Commission</span>
              <span style={{ fontWeight: 800, fontSize: '20px' }}>₹ {totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
