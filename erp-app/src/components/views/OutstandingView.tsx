'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, AlertTriangle, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';

interface OutstandingViewProps {
  onNavigate: (view: ViewId) => void;
}

type AgingKey = 'current' | '0-30' | '31-60' | '61-90' | '90+';

const AGING_BUCKETS: { key: AgingKey; label: string; color: string }[] = [
  { key: 'current', label: 'Current (Not Due)', color: 'var(--color-command-green)' },
  { key: '0-30', label: '1–30 Days', color: '#6366f1' },
  { key: '31-60', label: '31–60 Days', color: 'var(--color-command-amber)' },
  { key: '61-90', label: '61–90 Days', color: '#f97316' },
  { key: '90+', label: '90+ Days', color: 'var(--color-command-red)' },
];

function AgingBar({ aging, total }: { aging: Record<AgingKey, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', height: '8px', borderRadius: '999px', overflow: 'hidden', gap: '2px', width: '100%' }}>
      {AGING_BUCKETS.map(({ key, color }) => {
        const pct = total > 0 ? (aging[key] / total) * 100 : 0;
        if (pct === 0) return null;
        return (
          <div key={key} style={{ width: `${pct}%`, backgroundColor: color, borderRadius: '999px', minWidth: pct > 0 ? '4px' : '0' }} title={`${key}: ${formatINR(aging[key])}`} />
        );
      })}
    </div>
  );
}

function ClientRow({ client }: { client: any }) {
  const [expanded, setExpanded] = useState(false);
  const outstanding = client.outstanding;

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
        className="hover-row"
      >
        <td style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <div>
              <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{client.clientName}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{client.clientType} • {client.invoices.length} unpaid invoice{client.invoices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
          <span className="currency" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{formatINR(client.totalInvoiced)}</span>
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
          <span className="currency" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-command-green)' }}>{formatINR(client.totalCollected)}</span>
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
          <span className="currency" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: outstanding > 0 ? 'var(--color-command-amber)' : 'var(--color-command-green)' }}>
            {formatINR(outstanding)}
          </span>
        </td>
        <td style={{ padding: 'var(--space-4)', minWidth: 200 }}>
          <AgingBar aging={client.aging} total={outstanding} />
        </td>
      </tr>

      {expanded && client.invoices.map((inv: any, i: number) => (
        <tr key={i} style={{ backgroundColor: 'var(--surface-container-low)' }}>
          <td colSpan={1} style={{ padding: '8px 16px 8px 40px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {inv.invoiceNumber || 'Draft'} — {new Date(inv.date).toLocaleDateString('en-IN')}
            {inv.dueDate && ` (Due: ${new Date(inv.dueDate).toLocaleDateString('en-IN')})`}
          </td>
          <td colSpan={2} style={{ padding: '8px var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600,
              backgroundColor: inv.agingBucket === '90+' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.10)',
              color: inv.agingBucket === '90+' ? 'var(--color-command-red)' : 'var(--text-tertiary)',
            }}>
              {inv.agingBucket === 'current' ? 'Not Due' : `${inv.agingBucket} days`}
            </span>
          </td>
          <td style={{ padding: '8px var(--space-4)', textAlign: 'right', fontSize: 'var(--text-xs)' }}>
            <span className="currency" style={{ color: 'var(--color-command-amber)', fontWeight: 600 }}>{formatINR(inv.amount)}</span>
          </td>
          <td style={{ padding: '8px var(--space-4)' }} />
        </tr>
      ))}
    </>
  );
}

export function OutstandingView({ onNavigate }: OutstandingViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'Customer' | 'Vendor'>('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/outstanding?type=${typeFilter}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clients: any[] = data?.clients || [];
  const agingTotals = data?.agingTotals || {};
  const totalOutstanding = data?.totalOutstanding || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Outstanding & Aging"
        description="Real-time AR/AP tracker with aging analysis across all clients."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{
                height: '36px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
                color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
              }}
            >
              <option value="all">All Parties</option>
              <option value="Customer">Buyers (AR)</option>
              <option value="Vendor">Sellers (AP)</option>
            </select>
            <button onClick={fetchData} style={btnStyle}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* Aging Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-3)' }}>
        {AGING_BUCKETS.map(({ key, label, color }) => (
          <div key={key} style={{
            padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
            border: `1px solid ${color}30`, backgroundColor: `${color}0d`,
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
            </div>
            <p className="currency" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color }}>
              {formatINR(agingTotals[key] || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Total Outstanding */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <AlertTriangle size={20} color="var(--color-command-amber)" />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Outstanding Balance</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                Across {clients.length} client{clients.length !== 1 ? 's' : ''} • As of {new Date().toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <p className="currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-command-amber)' }}>
            {formatINR(totalOutstanding)}
          </p>
        </div>
      </Card>

      {/* Client Table */}
      <Card padding={false}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Loading outstanding balances...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Users size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }} />
            <p>No outstanding balances found.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th style={{ textAlign: 'right' }}>Total Invoiced</th>
                <th style={{ textAlign: 'right' }}>Collected</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th>Aging</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client: any) => (
                <ClientRow key={client.clientId} client={client} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        {AGING_BUCKETS.map(({ key, label, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: color }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: '36px', padding: '0 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
  color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-data)',
};
