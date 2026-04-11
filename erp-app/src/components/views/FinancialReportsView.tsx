'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Scale, FileSearch, RefreshCw,
  TrendingUp, TrendingDown, BarChart3, Scale, FileSearch, RefreshCw,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Download
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';

interface FinancialReportsViewProps {
  onNavigate: (view: ViewId) => void;
}

type ReportTab = 'pl' | 'balance-sheet' | 'trial-balance';

function DateRangeSelector({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>From</label>
      <input
        type="date" value={from} onChange={(e) => onFromChange(e.target.value)}
        style={{
          height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
          color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
        }}
      />
      <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>To</label>
      <input
        type="date" value={to} onChange={(e) => onToChange(e.target.value)}
        style={{
          height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
          color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
        }}
      />
    </div>
  );
}

/* ─── P&L View ─────────────────────────────────────────────────────────── */
function PLView() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(now.toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/pl?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingCard label="Calculating Profit & Loss..." />;
  if (!data) return <EmptyCard label="No P&L data available." />;

  const isProfitable = data.netProfit >= 0;

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Profit & Loss Statement'],
      [`Period: ${from} to ${to}`],
      [],
      ['Account', 'Amount (INR)'],
      ['REVENUE', ''],
      ...data.revenue.map((r: any) => [`"${r.name}"`, r.balance]),
      ['Total Revenue', data.totalRevenue],
      [],
      ['EXPENSES', ''],
      ...data.expenses.map((r: any) => [`"${r.name}"`, r.balance]),
      ['Total Expenses', data.totalExpenses],
      [],
      [isProfitable ? 'Net Profit' : 'Net Loss', Math.abs(data.netProfit)]
    ];
    downloadCSV(rows, `pnl_${from}_to_${to}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
        <DateRangeSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <button onClick={fetchData} style={btnSecondaryStyle}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button onClick={exportCSV} style={btnSecondaryStyle}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <SummaryCard label="Total Revenue" value={data.totalRevenue} color="var(--color-command-green)" icon={<TrendingUp size={18} />} />
        <SummaryCard label="Total Expenses" value={data.totalExpenses} color="var(--color-command-red)" icon={<TrendingDown size={18} />} />
        <SummaryCard
          label={isProfitable ? 'Net Profit' : 'Net Loss'}
          value={Math.abs(data.netProfit)}
          color={isProfitable ? 'var(--color-command-green)' : 'var(--color-command-red)'}
          icon={isProfitable ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          highlight
        />
      </div>

      {/* Revenue section */}
      <AccountSection
        title="Revenue"
        rows={data.revenue}
        total={data.totalRevenue}
        totalLabel="Total Revenue"
        accentColor="var(--color-command-green)"
      />

      {/* Expenses section */}
      <AccountSection
        title="Expenses"
        rows={data.expenses}
        total={data.totalExpenses}
        totalLabel="Total Expenses"
        accentColor="var(--color-command-red)"
      />
    </div>
  );
}

/* ─── Balance Sheet View ────────────────────────────────────────────────── */
function BalanceSheetView() {
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/balance-sheet?asOf=${asOf}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [asOf]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingCard label="Compiling Balance Sheet..." />;
  if (!data) return <EmptyCard label="No balance sheet data." />;

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Balance Sheet'],
      [`As of: ${asOf}`],
      [],
      ['ASSETS', ''],
      ['Account', 'Amount (INR)'],
      ...data.assets.map((r: any) => [`"${r.name}"`, r.balance]),
      ['Total Assets', data.totalAssets],
      [],
      ['LIABILITIES', ''],
      ['Account', 'Amount (INR)'],
      ...data.liabilities.map((r: any) => [`"${r.name}"`, r.balance]),
      ['Total Liabilities', data.totalLiabilities],
      [],
      ['EQUITY', ''],
      ['Account', 'Amount (INR)'],
      ...data.equity.map((r: any) => [`"${r.name}"`, r.balance]),
      ['Total Equity', data.totalEquity],
      [],
      ['Total Liabilities + Equity', data.totalLiabilities + data.totalEquity]
    ];
    downloadCSV(rows, `balance_sheet_${asOf}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>As of Date</label>
        <input
          type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
          style={{
            height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
            color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
          }}
        />
        <button onClick={fetchData} style={btnSecondaryStyle}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button onClick={exportCSV} style={btnSecondaryStyle}>
          <Download size={14} /> Export CSV
        </button>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: 'var(--radius-full)',
          backgroundColor: data.isBalanced ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${data.isBalanced ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {data.isBalanced
            ? <><CheckCircle size={14} color="var(--color-command-green)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-command-green)', fontWeight: 600 }}>Balanced</span></>
            : <><XCircle size={14} color="var(--color-command-red)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-command-red)', fontWeight: 600 }}>Out of Balance</span></>
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Left: Assets */}
        <div>
          <AccountSection title="Assets" rows={data.assets} total={data.totalAssets} totalLabel="Total Assets" accentColor="var(--color-command-green)" />
        </div>
        {/* Right: Liabilities + Equity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <AccountSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} totalLabel="Total Liabilities" accentColor="var(--color-command-red)" />
          <AccountSection title="Equity" rows={data.equity} total={data.totalEquity} totalLabel="Total Equity" accentColor="var(--color-command-amber)" />
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Total Liabilities + Equity
              </span>
              <span className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatINR(data.totalLiabilities + data.totalEquity)}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Trial Balance View ────────────────────────────────────────────────── */
function TrialBalanceView() {
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/trial-balance?asOf=${asOf}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [asOf]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingCard label="Computing Trial Balance..." />;
  if (!data) return <EmptyCard label="No trial balance data." />;

  const accounts: any[] = data.accounts || [];

  const exportCSV = () => {
    if (!accounts.length) return;
    const rows = [
      ['Trial Balance'],
      [`As of: ${asOf}`],
      [],
      ['Code', 'Account Name', 'Type', 'Debit (Dr)', 'Credit (Cr)'],
      ...accounts.map(acc => [
        `"${acc.code}"`, 
        `"${acc.name}"`, 
        acc.type, 
        acc.debit, 
        acc.credit
      ]),
      [],
      ['', 'TOTALS', '', data.totalDebit, data.totalCredit]
    ];
    downloadCSV(rows, `trial_balance_${asOf}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>As of Date</label>
        <input
          type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
          style={{
            height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
            color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
          }}
        />
        <button onClick={fetchData} style={btnSecondaryStyle}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button onClick={exportCSV} style={btnSecondaryStyle}>
          <Download size={14} /> Export CSV
        </button>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: 'var(--radius-full)',
          backgroundColor: data.isBalanced ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${data.isBalanced ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {data.isBalanced
            ? <><CheckCircle size={14} color="var(--color-command-green)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-command-green)', fontWeight: 600 }}>Dr = Cr</span></>
            : <><XCircle size={14} color="var(--color-command-red)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-command-red)', fontWeight: 600 }}>Imbalanced</span></>
          }
        </div>
      </div>

      <Card padding={false}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
              <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No entries found.</td></tr>
            ) : accounts.map((acc: any, i: number) => (
              <tr key={i}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{acc.accountCode}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>{acc.accountName}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span style={{
                    fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    backgroundColor: `${typeColor(acc.accountType)}20`, color: typeColor(acc.accountType), fontWeight: 600,
                  }}>
                    {acc.accountType}
                  </span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                  <span className="currency" style={{ color: acc.balance > 0 ? 'var(--text-primary)' : 'transparent' }}>
                    {acc.balance > 0 ? formatINR(acc.balance) : '—'}
                  </span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                  <span className="currency" style={{ color: acc.balance < 0 ? 'var(--color-command-red)' : 'transparent' }}>
                    {acc.balance < 0 ? formatINR(Math.abs(acc.balance)) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'var(--surface-container-high)', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 700 }}>Totals</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                <span className="currency" style={{ color: 'var(--text-primary)' }}>{formatINR(data.totalDebits)}</span>
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                <span className="currency" style={{ color: 'var(--color-command-red)' }}>{formatINR(data.totalCredits)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────────── */
function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border-default)', borderTopColor: 'var(--text-primary)', animation: 'spin 0.8s linear infinite' }} />
        {label}
      </div>
    </Card>
  );
}

function EmptyCard({ label }: { label: string }) {
  return <Card><p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>{label}</p></Card>;
}

function SummaryCard({ label, value, color, icon, highlight }: {
  label: string; value: number; color: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
      border: `1px solid ${highlight ? color + '40' : 'var(--border-subtle)'}`,
      backgroundColor: highlight ? color + '10' : 'var(--surface-container)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
        {icon}
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <p className="currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color, letterSpacing: '-0.02em' }}>
        {formatINR(value)}
      </p>
    </div>
  );
}

function AccountSection({ title, rows, total, totalLabel, accentColor }: {
  title: string; rows: any[]; total: number; totalLabel: string; accentColor: string;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card padding={false}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-4) var(--space-5)', background: 'none', border: 'none',
          cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '4px', height: '20px', borderRadius: '2px', backgroundColor: accentColor }} />
          <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{title}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', backgroundColor: 'var(--surface-container-high)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {rows.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: accentColor }}>
            {formatINR(total)}
          </span>
          {expanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
        </div>
      </button>
      {expanded && (
        <table className="data-table">
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No accounts in this category.</td></tr>
            ) : rows.map((row: any, i: number) => (
              <tr key={i}>
                <td style={{ padding: 'var(--space-3) var(--space-5)', width: '80px', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-data)' }}>{row.accountCode}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>{row.accountName}</td>
                <td style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'right' }}>
                  <span className="currency" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatINR(row.amount)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'var(--surface-container-high)' }}>
              <td colSpan={2} style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{totalLabel}</td>
              <td style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'right' }}>
                <span className="currency" style={{ fontWeight: 700, color: accentColor }}>{formatINR(total)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </Card>
  );
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    Asset: 'var(--color-command-green)',
    Liability: 'var(--color-command-red)',
    Equity: 'var(--color-command-amber)',
    Revenue: '#6366f1',
    Expense: '#f97316',
  };
  return map[type] || 'var(--text-tertiary)';
}

const btnSecondaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: '36px', padding: '0 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
  color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-data)',
};

/* ─── Main View ─────────────────────────────────────────────────────────── */
const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'pl', label: 'Profit & Loss', icon: <TrendingUp size={16} /> },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: <Scale size={16} /> },
  { id: 'trial-balance', label: 'Trial Balance', icon: <BarChart3 size={16} /> },
];

export function FinancialReportsView({ onNavigate }: FinancialReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('pl');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Financial Reports"
        description="Comprehensive financial intelligence — P&L, Balance Sheet, and Trial Balance."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-subtle)' }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: 'var(--radius-md)',
                    border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500,
                    fontFamily: 'var(--font-data)', transition: 'all var(--transition-fast)',
                    backgroundColor: isActive ? 'var(--surface-container-high)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      {activeTab === 'pl' && <PLView />}
      {activeTab === 'balance-sheet' && <BalanceSheetView />}
      {activeTab === 'trial-balance' && <TrialBalanceView />}
    </div>
  );
}
