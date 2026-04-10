'use client';

import React from 'react';
import { ArrowRightLeft, Users, Landmark, Wallet, Plus, FileText, Receipt, ChevronRight, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import { Card, StatCard, PageHeader, Button } from '@/components/ui';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface DashboardViewProps {
  onNavigate: (view: ViewId) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [dateRange, setDateRange] = React.useState('30');
  const { data: invData, loading } = useApi<any>('/api/invoices?limit=100');
  const { data: clientsResp } = useApi<any>('/api/clients');
  const { data: receiptsResp } = useApi<any>('/api/receipts?limit=100');
  const invoices = invData?.data || [];
  const clients = clientsResp?.data || [];
  const receipts = receiptsResp?.data || [];

  // Filter invoices by selected date range
  const filteredInvoices = React.useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    if (dateRange === '30') cutoff.setDate(now.getDate() - 30);
    else if (dateRange === 'quarter') cutoff.setMonth(now.getMonth() - 3);
    else cutoff.setFullYear(now.getFullYear() - 1);
    return invoices.filter((i: any) => new Date(i.date) >= cutoff);
  }, [invoices, dateRange]);
  
  const pendingReceivables = filteredInvoices.filter((i: any) => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
  const totalReceipts = receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const activeClients = clients.filter((c: any) => c.status === 'active').length;
  
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Overview"
        description="Monitor your business metrics and recent activity."
        actions={
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              height: '36px',
              width: '180px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-container)',
              padding: '0 12px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          >
            <option value="30">Last 30 Days</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard label="Pending Receivables" value={formatINR(pendingReceivables)} trend="Based on un-paid invoices" trendUp={true} icon={<Wallet size={16} />} />
        <StatCard label="Total Invoices" value={filteredInvoices.length.toString()} trend={`${filteredInvoices.length} in period`} trendUp={true} icon={<ArrowRightLeft size={16} />} />
        <StatCard label="Active Clients" value={activeClients.toString()} trend={`${clients.length} total`} trendUp={activeClients > 0} icon={<Users size={16} />} />
        <StatCard label="Collected" value={formatINR(totalReceipts)} trend="Total receipts" trendUp={totalReceipts > 0} icon={<Landmark size={16} />} />
      </div>

      {/* Recent Transactions + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-6)' }}>
        {/* Recent Transactions */}
        <Card padding={false}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-6)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h3
                className="font-display"
                style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                Recent Transactions
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                Latest logged sales and commissions.
              </p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              View All
            </button>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Details</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? invoices.slice(0, 10).map((trx: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        {trx.client?.name || trx.clientId}
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', marginTop: '4px', fontSize: 'var(--text-xs)' }}>
                        {new Date(trx.date).toLocaleDateString()} • {trx.invoiceNumber}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                      <div className="currency" style={{ color: 'var(--text-primary)' }}>
                        {formatINR(Number(trx.totalAmount))}
                      </div>
                      <div className={`currency ${trx.status === 'Paid' ? 'currency-positive' : 'currency-negative'}`} style={{ marginTop: '4px', fontSize: 'var(--text-xs)' }}>
                        {trx.status}
                      </div>
                    </td>
                  </tr>
                )) : loading ? (
                  <tr><td colSpan={2} style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading recent activity...</td></tr>
                ) : (
                  <tr><td colSpan={2} style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Card>
            <h3
              className="font-display"
              style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}
            >
              Quick Actions
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
              Frequently used tools and forms.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { label: 'New Transaction', icon: Plus, view: 'transactions' as ViewId },
                { label: 'Create Invoice', icon: FileText, view: 'invoices' as ViewId },
                { label: 'Add Client', icon: Users, view: 'clients' as ViewId },
                { label: 'Log Receipt', icon: Receipt, view: 'receipts' as ViewId },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(btn.view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-container)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    fontFamily: 'var(--font-data)',
                  }}
                >
                  <btn.icon size={18} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Report Quick Links */}
          <Card>
            <h3
              className="font-display"
              style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}
            >
              Reports
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)' }}>
              Financial intelligence at a glance.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Financial Reports', sub: 'P&L, Balance Sheet, Trial Balance', icon: TrendingUp, view: 'financial-reports' as ViewId, color: 'var(--color-command-green)' },
                { label: 'Outstanding & Aging', sub: 'AR/AP tracker with aging buckets', icon: AlertTriangle, view: 'outstanding' as ViewId, color: 'var(--color-command-amber)' },
                { label: 'Tax & Compliance', sub: 'GSTR-1, ITC Tracker, TDS Ledger', icon: Shield, view: 'tax-reports' as ViewId, color: '#6366f1' },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(btn.view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${btn.color}25`,
                    backgroundColor: `${btn.color}0d`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    fontFamily: 'var(--font-data)',
                    width: '100%',
                  }}
                >
                  <btn.icon size={18} style={{ color: btn.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{btn.label}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{btn.sub}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
