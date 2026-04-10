'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Shield, Receipt, RefreshCw, Building2, CheckCircle } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';

interface TaxReportsViewProps {
  onNavigate: (view: ViewId) => void;
}

type TaxTab = 'gstr1' | 'itc' | 'tds';

/* ─── Date Range Picker ─────────────────────────────────────────────────── */
function PeriodPicker({ from, to, onFromChange, onToChange, onRefresh }: {
  from: string; to: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={inputStyle} />
      <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>to</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={inputStyle} />
      <button onClick={onRefresh} style={btnStyle}>
        <RefreshCw size={14} /> Run Report
      </button>
    </div>
  );
}

/* ─── GSTR-1 Tab ────────────────────────────────────────────────────────── */
function GSTR1Tab({ data }: { data: any }) {
  const { b2b = [], b2c = [], totals = {} } = data?.gstr1 || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Summary Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <TaxSummaryCard label="Taxable Value" value={totals.taxableAmount || 0} color="var(--text-primary)" />
        <TaxSummaryCard label="Total CGST" value={totals.cgst || 0} color="var(--color-command-amber)" />
        <TaxSummaryCard label="Total SGST" value={totals.sgst || 0} color="var(--color-command-amber)" />
        <TaxSummaryCard label="Total IGST" value={totals.igst || 0} color="#6366f1" />
      </div>

      {/* B2B Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <Building2 size={16} color="#6366f1" />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
            B2B Supplies — Registered Buyers ({b2b.length})
          </h3>
        </div>
        <Card padding={false}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th><th>Date</th><th>Buyer Name</th><th>GSTIN</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                <th style={{ textAlign: 'right' }}>CGST</th>
                <th style={{ textAlign: 'right' }}>SGST</th>
                <th style={{ textAlign: 'right' }}>IGST</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {b2b.length === 0 ? (
                <tr><td colSpan={9} style={emptyTdStyle}>No B2B invoices in this period.</td></tr>
              ) : b2b.map((row: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{row.invoiceNumber || '—'}</td>
                  <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-IN')}</td>
                  <td style={tdStyle}>{row.clientName}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{row.clientGstin}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency">{formatINR(row.taxableAmount)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-amber)' }}>{formatINR(row.cgst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-amber)' }}>{formatINR(row.sgst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: '#6366f1' }}>{formatINR(row.igst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}><span className="currency">{formatINR(row.totalAmount)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* B2C Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <Receipt size={16} color="var(--color-command-green)" />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
            B2C Supplies — Unregistered Buyers ({b2c.length})
          </h3>
        </div>
        <Card padding={false}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th><th>Date</th><th>Buyer Name</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                <th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th><th style={{ textAlign: 'right' }}>IGST</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {b2c.length === 0 ? (
                <tr><td colSpan={8} style={emptyTdStyle}>No B2C invoices in this period.</td></tr>
              ) : b2c.map((row: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{row.invoiceNumber || '—'}</td>
                  <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-IN')}</td>
                  <td style={tdStyle}>{row.clientName}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency">{formatINR(row.taxableAmount)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-amber)' }}>{formatINR(row.cgst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-amber)' }}>{formatINR(row.sgst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: '#6366f1' }}>{formatINR(row.igst)}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}><span className="currency">{formatINR(row.totalAmount)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

/* ─── ITC Tracker Tab ───────────────────────────────────────────────────── */
function ITCTab({ data }: { data: any }) {
  const { rows = [], totals = {} } = data?.itc || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <TaxSummaryCard label="Total Input Value" value={totals.taxableAmount || 0} color="var(--text-primary)" />
        <TaxSummaryCard label="ITC CGST" value={totals.cgst || 0} color="var(--color-command-green)" />
        <TaxSummaryCard label="ITC SGST" value={totals.sgst || 0} color="var(--color-command-green)" />
        <TaxSummaryCard label="ITC IGST" value={totals.igst || 0} color="var(--color-command-green)" />
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <CheckCircle size={18} color="var(--color-command-green)" />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Eligible ITC</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Net GST credit from all vendor bills in period</p>
            </div>
          </div>
          <p className="currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-command-green)' }}>
            {formatINR(totals.totalITC || 0)}
          </p>
        </div>
      </Card>
      <Card padding={false}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No.</th><th>Date</th><th>Vendor</th><th>Vendor GSTIN</th>
              <th style={{ textAlign: 'right' }}>Taxable</th>
              <th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th><th style={{ textAlign: 'right' }}>IGST</th>
              <th style={{ textAlign: 'right' }}>Total ITC</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={emptyTdStyle}>No vendor bills with ITC in this period.</td></tr>
            ) : rows.map((row: any, i: number) => (
              <tr key={i}>
                <td style={tdStyle}>{row.billNumber}</td>
                <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>{row.vendorName}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{row.vendorGstin || '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency">{formatINR(row.taxableAmount)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(row.cgst)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(row.sgst)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(row.igst)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(row.totalITC)}</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: 'var(--surface-container-high)', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: 'var(--space-3) var(--space-4)' }}>Total ITC</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency">{formatINR(totals.taxableAmount || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(totals.cgst || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(totals.sgst || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(totals.igst || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(totals.totalITC || 0)}</span></td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

/* ─── TDS Ledger Tab ────────────────────────────────────────────────────── */
function TDSTab({ data }: { data: any }) {
  const { rows = [], totals = {} } = data?.tds || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <TaxSummaryCard label="Gross Receipts" value={totals.grossAmount || 0} color="var(--text-primary)" />
        <TaxSummaryCard label="TDS Deducted" value={totals.tdsAmount || 0} color="var(--color-command-red)" />
        <TaxSummaryCard label="Net Received" value={totals.netAmount || 0} color="var(--color-command-green)" />
      </div>
      <Card padding={false}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt No.</th><th>Date</th><th>Party Name</th>
              <th style={{ textAlign: 'right' }}>Gross Amount</th>
              <th style={{ textAlign: 'right' }}>TDS Deducted</th>
              <th style={{ textAlign: 'right' }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={emptyTdStyle}>No TDS transactions in this period.</td></tr>
            ) : rows.map((row: any, i: number) => (
              <tr key={i}>
                <td style={tdStyle}>{row.receiptNumber}</td>
                <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>{row.partyName}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency">{formatINR(row.grossAmount)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-red)' }}>{formatINR(row.tdsAmount)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(row.netAmount)}</span></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: 'var(--surface-container-high)', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: 'var(--space-3) var(--space-4)' }}>Totals</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency">{formatINR(totals.grossAmount || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-red)' }}>{formatINR(totals.tdsAmount || 0)}</span></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><span className="currency" style={{ color: 'var(--color-command-green)' }}>{formatINR(totals.netAmount || 0)}</span></td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

/* ─── Shared ────────────────────────────────────────────────────────────── */
function TaxSummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-container)',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</p>
      <p className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color }}>{formatINR(value)}</p>
    </div>
  );
}

/* ─── Main View ─────────────────────────────────────────────────────────── */
const TABS: { id: TaxTab; label: string; icon: React.ReactNode }[] = [
  { id: 'gstr1', label: 'GSTR-1 Worksheet', icon: <FileText size={16} /> },
  { id: 'itc', label: 'ITC Tracker', icon: <Shield size={16} /> },
  { id: 'tds', label: 'TDS Ledger', icon: <Receipt size={16} /> },
];

export function TaxReportsView({ onNavigate }: TaxReportsViewProps) {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(now.toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<TaxTab>('gstr1');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/tax?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Tax & Compliance"
        description="GSTR-1 worksheet, Input Tax Credit tracker, and TDS deduction ledger."
        actions={<PeriodPicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} onRefresh={fetchData} />}
      />

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '0' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: 'var(--space-3) var(--space-5)',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-data)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all var(--transition-fast)',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border-default)', borderTopColor: 'var(--text-primary)', animation: 'spin 0.8s linear infinite' }} />
            Compiling tax data...
          </div>
        </Card>
      ) : !data ? (
        <Card><p style={{ color: 'var(--text-tertiary)' }}>No data. Click "Run Report" to fetch.</p></Card>
      ) : (
        <>
          {activeTab === 'gstr1' && <GSTR1Tab data={data} />}
          {activeTab === 'itc' && <ITCTab data={data} />}
          {activeTab === 'tds' && <TDSTab data={data} />}
        </>
      )}
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
  color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
};

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: '36px', padding: '0 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
  color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-data)',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 'var(--text-sm)',
};

const emptyTdStyle: React.CSSProperties = {
  padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)',
};
