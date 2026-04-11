'use client';

import React, { useState, useCallback } from 'react';
import { Download, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import { PageHeader, Button, Card, Badge } from '@/components/ui';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface LedgerViewProps {
  onNavigate: (view: ViewId) => void;
}

/* ─── Drilldown: Journal entries for a single client ───────────────────── */
function ClientLedger({ client, onBack }: { client: any; onBack: () => void }) {
  const { data: trxResp, loading } = useApi<any>(`/api/transactions?clientId=${client.id}&limit=100`);
  const entries = trxResp?.data || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={`Ledger — ${client.client}`}
        description={`All journal entries linked to ${client.client} (${client.type})`}
        actions={
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Summary
          </Button>
        }
      />
      <Card>
        <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
          {[
            { label: 'Total Invoiced', value: client.totalInvoiced, color: 'var(--text-primary)' },
            { label: 'Total Paid', value: client.totalPaid, color: 'var(--color-command-green)' },
            { label: 'Outstanding', value: client.outstanding, color: client.outstanding > 0 ? 'var(--color-command-red)' : 'var(--text-tertiary)' },
          ].map(stat => (
            <div key={stat.label}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>{stat.label}</p>
              <p className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: stat.color, marginTop: '4px' }}>{formatINR(stat.value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card><p style={{ color: 'var(--text-tertiary)' }}>Loading transactions...</p></Card>
      ) : entries.length === 0 ? (
        <Card><p style={{ color: 'var(--text-tertiary)' }}>No transactions found for this client.</p></Card>
      ) : (
        <Card padding={false}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Reference</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((tx: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                    {new Date(tx.createdAt || tx.date).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {tx.description || '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-data)', color: 'var(--text-tertiary)' }}>
                    {tx.referenceId || '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <span className="currency" style={{ color: 'var(--text-primary)' }}>
                      {tx.debit ? formatINR(tx.debit) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <span className="currency" style={{ color: 'var(--text-tertiary)' }}>
                      {tx.credit ? formatINR(tx.credit) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={tx.postedAt ? 'success' : 'warning'}>
                      {tx.postedAt ? 'Posted' : 'Draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ─── Summary View ──────────────────────────────────────────────────────── */
export function LedgerView({ onNavigate }: LedgerViewProps) {
  const [drilldown, setDrilldown] = useState<any | null>(null);
  const { data: clientsData, loading: cLoad } = useApi<any>('/api/clients?limit=100');
  const { data: invoicesData, loading: iLoad } = useApi<any>('/api/invoices?limit=100');
  const { data: receiptsData, loading: rLoad } = useApi<any>('/api/receipts?limit=100');

  const clients = clientsData?.data || [];
  const invoices = invoicesData?.data || [];
  const receipts = receiptsData?.data || [];

  const ledgerData = clients.map((c: any) => {
    const clientInvoices = invoices.filter((inv: any) => inv.clientId === c.id);
    const clientReceipts = receipts.filter((rcpt: any) => rcpt.clientId === c.id);
    const totalInvoiced = clientInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = clientReceipts.reduce((sum: number, rcpt: any) => sum + Number(rcpt.amount || 0), 0);
    return {
      id: c.id,
      client: c.name,
      code: c.code,
      type: c.type,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
    };
  });

  const handleExportCSV = () => {
    const headers = ['Client', 'Code', 'Type', 'Total Invoiced', 'Total Paid', 'Outstanding'];
    const rows = ledgerData.map((row: any) => [
      `"${row.client}"`, row.code, row.type,
      row.totalInvoiced.toFixed(2), row.totalPaid.toFixed(2), row.outstanding.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (drilldown) {
    return <ClientLedger client={drilldown} onBack={() => setDrilldown(null)} />;
  }

  const loading = cLoad || iLoad || rLoad;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Client Ledgers"
        description="Per-client summary of invoices, receipts, and outstanding balance. Click a row to see the full transaction drilldown."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button variant="secondary" onClick={handleExportCSV}><Download size={16} /> Export CSV</Button>
          </>
        }
      />

      <Card padding={false}>
        {loading ? (
          <div style={{ padding: 'var(--space-6)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading ledger...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th><th>Type</th>
                <th style={{ textAlign: 'right' }}>Total Invoiced</th>
                <th style={{ textAlign: 'right' }}>Total Paid</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No client data available.</td></tr>
              ) : ledgerData.map((row: any) => (
                <tr
                  key={row.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDrilldown(row)}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{row.client}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{row.code}</p>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={row.type === 'Customer' ? 'success' : row.type === 'Vendor' ? 'warning' : 'info'}>
                      {row.type}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <span className="currency" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{formatINR(row.totalInvoiced)}</span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <span className="currency" style={{ color: 'var(--color-command-green)', fontSize: 'var(--text-sm)' }}>{formatINR(row.totalPaid)}</span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <span className="currency" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: row.outstanding > 0 ? 'var(--color-command-red)' : 'var(--text-tertiary)' }}>
                      {formatINR(row.outstanding)}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
