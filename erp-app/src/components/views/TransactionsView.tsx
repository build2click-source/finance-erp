'use client';

import React, { useState, useMemo } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Button, Card, Input, Select, Textarea } from '@/components/ui';
import { formatINR } from '@/lib/mock-data';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface TransactionsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TransactionsView({ onNavigate }: TransactionsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: trxData, loading, revalidate } = useApi<any>('/api/transactions?limit=100');
  const { data: clientsResp } = useApi<any>('/api/clients');
  const transactions = trxData?.data || [];
  const clients = clientsResp?.data || [];

  // Filter state
  const [selectedClient, setSelectedClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Flatten the transactions into journal entry lines
  const flatLines = useMemo(() => {
    return transactions.flatMap((trx: any) =>
      (trx.journalEntries || []).map((je: any) => ({
        id: je.id,
        type: trx.metadata?.type || 'Journal',
        no: trx.referenceId || trx.id.split('-')[0].toUpperCase(),
        date: trx.createdAt,
        dateFormatted: new Date(trx.createdAt).toLocaleDateString(),
        particulars: `${je.account.name} — ${trx.description || ''}`,
        drAmt: je.entryType === 'Dr' ? je.amount : null,
        crAmt: je.entryType === 'Cr' ? Math.abs(je.amount) : null,
        clientId: trx.invoice?.clientId || trx.receipt?.clientId || null,
      }))
    );
  }, [transactions]);

  // Filtered lines
  const filteredLines = useMemo(() => {
    return flatLines.filter((line: any) => {
      if (selectedClient && line.clientId !== selectedClient) return false;
      if (dateFrom) {
        const lineDate = new Date(line.date);
        const from = new Date(dateFrom);
        if (lineDate < from) return false;
      }
      if (dateTo) {
        const lineDate = new Date(line.date);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (lineDate > to) return false;
      }
      return true;
    });
  }, [flatLines, selectedClient, dateFrom, dateTo]);

  if (isCreating) {
    return <TransactionForm onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); revalidate(); }} />;
  }

  const handleClearFilters = () => {
    setSelectedClient('');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'Ref No', 'Date', 'Particulars', 'Debit (Dr)', 'Credit (Cr)'];
    const rows = filteredLines.map((line: any) => [
      line.type,
      line.no,
      line.dateFormatted,
      `"${line.particulars}"`,
      line.drAmt ? Number(line.drAmt).toFixed(2) : '',
      line.crAmt ? Number(line.crAmt).toFixed(2) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Transaction Details"
        description="Detailed ledger of all system transactions."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Return to Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Transaction
            </Button>
          </>
        }
      />

      <Card padding={false}>
        {/* Filters */}
        <div
          style={{
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-container-low)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <Select
              label="Select Client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              options={[
                { value: '', label: '-- All Clients --' },
                ...clients.map((c: any) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>→</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={handleClearFilters}>Clear</Button>
            <Button variant="secondary" onClick={handleExportCSV}><Download size={16} /> CSV</Button>
          </div>
        </div>

        {/* Transaction Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Type</th>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Ref No</th>
                <th style={{ width: '12%', borderRight: '1px solid var(--border-subtle)' }}>Date</th>
                <th style={{ width: '34%', borderRight: '1px solid var(--border-subtle)' }}>Particulars</th>
                <th style={{ width: '15%', textAlign: 'right', borderRight: '1px solid var(--border-subtle)' }}>Debit (Dr)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.length > 0 ? (
                filteredLines.map((trx: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, borderRight: '1px solid var(--border-subtle)', textTransform: 'capitalize' }}>{trx.type.replace('_', ' ')}</td>
                    <td style={{ fontFamily: 'var(--font-technical)', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-subtle)' }}>{trx.no}</td>
                    <td style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border-subtle)' }}>{trx.dateFormatted}</td>
                    <td style={{ borderRight: '1px solid var(--border-subtle)' }}>{trx.particulars}</td>
                    <td className="currency" style={{ textAlign: 'right', borderRight: '1px solid var(--border-subtle)' }}>
                      {trx.drAmt ? formatINR(trx.drAmt) : '-'}
                    </td>
                    <td className="currency" style={{ textAlign: 'right' }}>
                      {trx.crAmt ? formatINR(trx.crAmt) : '-'}
                    </td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No transactions match your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredLines.length}</strong> journal entries
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TRANSACTION CREATION FORM
   ============================================================ */
function TransactionForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { data: accountsResp } = useApi<any>('/api/accounts');
  const accounts = accountsResp?.data || [];
  const { mutate } = useApi('/api/transactions');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    referenceId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [lines, setLines] = useState([
    { id: 1, accountId: '', entryType: 'Dr', amount: '' },
    { id: 2, accountId: '', entryType: 'Cr', amount: '' }
  ]);

  const addLine = () => setLines([...lines, { id: Date.now(), accountId: '', entryType: 'Dr', amount: '' }]);
  const removeLine = (id: number) => setLines(lines.filter((l) => l.id !== id));
  
  const updateLine = (id: number, field: string, value: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const totalDr = lines.filter(l => l.entryType === 'Dr').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalCr = lines.filter(l => l.entryType === 'Cr').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  
  const isBalanced = totalDr === totalCr && totalDr > 0;
  const isValid = isBalanced && lines.every(l => l.accountId && Number(l.amount) > 0) && lines.length >= 2;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        description: formData.description,
        referenceId: formData.referenceId,
        lines: lines.map(l => ({
          accountId: l.accountId,
          amount: Number(l.amount),
          entryType: l.entryType,
        })),
        metadata: {
          type: 'Manual Journal',
          manualDate: formData.date
        },
        postImmediately: true
      };
      await mutate('POST', payload);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert('Failed to save transaction: ' + (e.message || 'Validation error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Journal Entry"
        description="Record a manual double-entry transaction."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !isValid}>
              {saving ? 'Saving...' : 'Post Transaction'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Header Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
            <Input label="Reference No" placeholder="e.g. JRN-8800" value={formData.referenceId} onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })} />
            <Input label="Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            <div style={{ gridColumn: 'span 3' }}>
              <Input label="Description (Particulars)" required placeholder="Reason for journal entry..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Journal Lines
            </h3>
            
            <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              {/* Header row */}
              <div
                style={{
                  backgroundColor: 'var(--surface-container-low)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  padding: '8px 16px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <div style={{ flex: 1 }}>Account</div>
                <div style={{ width: '100px', paddingLeft: '8px' }}>Dr / Cr</div>
                <div style={{ width: '150px', paddingLeft: '8px', textAlign: 'right' }}>Amount</div>
                <div style={{ width: '40px' }} />
              </div>
              
              {/* Line items */}
              <div style={{ backgroundColor: 'var(--surface-container)' }}>
                {lines.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      borderBottom: '1px solid var(--border-subtle)',
                      gap: '4px',
                    }}
                  >
                    <div style={{ flex: 1, padding: '4px' }}>
                      <select 
                        style={{ width: '100%', border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)', padding: '6px 8px', borderRadius: '4px' }} 
                        value={item.accountId} 
                        onChange={(e) => updateLine(item.id, 'accountId', e.target.value)}
                      >
                        <option value="">Select Account...</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>)}
                      </select>
                    </div>
                    <div style={{ width: '100px', padding: '4px' }}>
                      <select 
                        style={{ width: '100%', border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)', padding: '6px 8px', borderRadius: '4px' }}
                        value={item.entryType} 
                        onChange={(e) => updateLine(item.id, 'entryType', e.target.value)}
                      >
                        <option value="Dr">Debit (Dr)</option>
                        <option value="Cr">Credit (Cr)</option>
                      </select>
                    </div>
                    <div style={{ width: '150px', padding: '4px' }}>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        style={{ border: '1px solid transparent', backgroundColor: 'var(--surface-container-low)', textAlign: 'right' }} 
                        value={item.amount} 
                        onChange={(e) => updateLine(item.id, 'amount', e.target.value)} 
                      />
                    </div>
                    <button
                      onClick={() => removeLine(item.id)}
                      style={{
                        padding: '8px',
                        color: 'var(--text-tertiary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'all var(--transition-fast)',
                      }}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={addLine}
              style={{
                marginTop: 'var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-data)',
              }}
            >
              <Plus size={16} /> Add journal line
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Validation Summary */}
          <div style={{
            borderRadius: 'var(--radius-xl)',
            backgroundColor: isBalanced ? 'rgba(34, 197, 94, 0.05)' : 'var(--surface-container-low)',
            border: `1px solid ${isBalanced ? 'rgba(34, 197, 94, 0.2)' : 'var(--border-subtle)'}`,
            padding: 'var(--space-5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 'var(--space-10)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Debits</div>
                  <div className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(totalDr)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Credits</div>
                  <div className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(totalCr)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difference</div>
                <div className="currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: isBalanced ? 'var(--text-success)' : 'var(--text-danger)' }}>
                  {formatINR(Math.abs(totalDr - totalCr))}
                </div>
                {!isBalanced && totalDr > 0 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-danger)', marginTop: '4px' }}>Debits must equal Credits</div>}
                {isBalanced && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-success)', marginTop: '4px' }}>Perfectly balanced ✓</div>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
