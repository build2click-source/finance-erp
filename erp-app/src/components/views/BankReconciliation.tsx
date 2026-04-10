'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Upload, Check, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { PageHeader, Button, Card, Badge } from '@/components/ui';
import { useApi } from '@/lib/hooks/useApi';
import { useToast } from '@/lib/hooks/useToast';
import { formatINR } from '@/lib/mock-data';

interface BankReconciliationProps {
  bankId: string;
  bankName: string;
  onBack: () => void;
}

interface BankFeedRow {
  date: string;
  description: string;
  withdrawal: number;
  deposit: number;
  id: string;
  matchedId?: string;
}

export function BankReconciliation({ bankId, bankName, onBack }: BankReconciliationProps) {
  const { data: erpResp, loading: erpLoading, revalidate: revalidateErp } = useApi<any>(`/api/banks/${bankId}/unreconciled`);
  const erpTransactions = erpResp?.data || [];
  const { success, error, info } = useToast();
  
  const [bankFeed, setBankFeed] = useState<BankFeedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Parsing logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          error('CSV file is empty or missing data rows.');
          return;
        }

        const parsed: BankFeedRow[] = [];
        // Skip header
        const dataLines = lines.slice(1);
        
        dataLines.forEach((line, idx) => {
          // Robust CSV splitting (handles quotes, commas)
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim());

          if (cols.length >= 4) {
            const date = cols[0];
            const description = cols[1];
            const withdrawal = parseFloat(cols[2].replace(/[^\d.-]/g, '')) || 0;
            const deposit = parseFloat(cols[3].replace(/[^\d.-]/g, '')) || 0;

            if (date && (withdrawal > 0 || deposit > 0)) {
              parsed.push({
                id: `feed-${idx}-${Date.now()}`,
                date,
                description,
                withdrawal,
                deposit,
              });
            }
          }
        });

        if (parsed.length === 0) {
          error('No valid transactions found. Ensure CSV format is: Date, Description, Withdrawal, Deposit');
        } else {
          setBankFeed(parsed);
          info(`Successfully loaded ${parsed.length} transactions.`);
        }
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        error('Failed to parse CSV file. Please check the format.');
      } finally {
        setIsParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset for next upload
      }
    };
    reader.onerror = () => {
      error('Error reading file.');
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  // Auto-matching logic
  useEffect(() => {
    if (bankFeed.length > 0 && erpTransactions.length > 0) {
      const updatedFeed = [...bankFeed];
      let matchCount = 0;

      updatedFeed.forEach(feedRow => {
        if (feedRow.matchedId) return;

        const amount = feedRow.deposit || feedRow.withdrawal;
        const type = feedRow.deposit > 0 ? 'Deposit' : 'Withdrawal';

        const match = erpTransactions.find((erp: any) => {
          const erpAmount = erp.amount;
          const erpType = erp.transactionType;
          
          // Basic match: Amount and Type (Deposit/Withdrawal)
          // You could also add date +/- 2 days logic here
          const sameAmount = Math.abs(erpAmount - amount) < 0.01;
          const sameType = erpType === type;
          
          return sameAmount && sameType && !updatedFeed.some(f => f.matchedId === erp.id);
        });

        if (match) {
          feedRow.matchedId = match.id;
          matchCount++;
        }
      });

      if (matchCount > 0) {
        setBankFeed(updatedFeed);
        info(`Auto-matched ${matchCount} transactions with high confidence.`);
      }
    }
  }, [erpTransactions.length > 0, bankFeed.length > 0]);

  const toggleMatch = (feedRowId: string, erpTxId: string) => {
    setBankFeed(prev => prev.map(row => {
      if (row.id === feedRowId) {
        return { ...row, matchedId: row.matchedId === erpTxId ? undefined : erpTxId };
      }
      return row;
    }));
  };

  const handleReconcile = async () => {
    const matchedErpIds = bankFeed
      .filter(f => f.matchedId)
      .map(f => f.matchedId!);
    
    if (matchedErpIds.length === 0) {
      error('No matches selected to reconcile.');
      return;
    }

    setSaving(true);
    try {
      const receiptIds = erpTransactions
        .filter((t: any) => t.type === 'receipt' && matchedErpIds.includes(t.id))
        .map((t: any) => t.id);
      const paymentIds = erpTransactions
        .filter((t: any) => t.type === 'payment' && matchedErpIds.includes(t.id))
        .map((t: any) => t.id);

      const res = await fetch(`/api/banks/${bankId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptIds, paymentIds }),
      });

      if (!res.ok) throw new Error('Reconciliation failed');

      success(`Successfully reconciled ${matchedErpIds.length} transactions.`);
      revalidateErp();
      setBankFeed(prev => prev.filter(f => !f.matchedId)); // Remove matched ones from view
    } catch (e: any) {
      error(e.message || 'Failed to reconcile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={`Reconcile: ${bankName}`}
        description="Match your bank statement rows against ERP entries to ensure ledger accuracy."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={onBack}>Cancel</Button>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              <Upload size={16} /> {isParsing ? 'Parsing...' : 'Upload Statement (CSV)'}
            </Button>
            <Button onClick={handleReconcile} disabled={saving || bankFeed.filter(f => f.matchedId).length === 0}>
              {saving ? 'Processing...' : `Submit Reconciliation (${bankFeed.filter(f => f.matchedId).length})`}
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-6)', minHeight: '600px' }}>
        {/* Left Pane: Bank Feed */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-container-low)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>
              Bank Statement Feed
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
            {bankFeed.length === 0 ? (
              <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
                <Upload size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Upload a CSV bank statement to start matching.
                </p>
              </div>
            ) : (
              <table className="recon-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 8px' }}>Date</th>
                    <th style={{ padding: '12px 8px' }}>Description</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 8px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bankFeed.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: row.matchedId ? 'var(--color-command-green)08' : 'transparent' }}>
                      <td style={{ padding: '12px 8px', fontFamily: 'var(--font-data)' }}>{row.date}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.description}</div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--font-data)' }}>
                        <span style={{ color: row.deposit > 0 ? 'var(--color-command-green)' : 'var(--color-command-red)' }}>
                          {row.deposit > 0 ? `+${row.deposit.toFixed(2)}` : `-${row.withdrawal.toFixed(2)}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {row.matchedId ? <Check size={18} style={{ color: 'var(--color-command-green)' }} /> : <AlertCircle size={18} style={{ color: 'var(--text-tertiary)' }} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Right Pane: ERP Records */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>
              ERP Ledger Entries (Unreconciled)
            </h3>
            {erpLoading && <div className="loader-sm" />}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
            {erpTransactions.length === 0 ? (
              <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No unreconciled records found in the ledger.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {erpTransactions.map((tx: any) => {
                  const isMatched = bankFeed.some(f => f.matchedId === tx.id);
                  return (
                    <div 
                      key={tx.id}
                      onClick={() => {
                        // Manual linking logic
                        // If no bank row matches, user could select a bank row first?
                        // For simplicity, we just show matches from the auto-matcher or manual logic
                      }}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: isMatched ? 'var(--color-command-green)08' : 'var(--surface-container)',
                        display: 'flex',
                        gap: 'var(--space-3)',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                        cursor: 'default'
                      }}
                    >
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', 
                        backgroundColor: tx.transactionType === 'Deposit' ? 'var(--color-command-green)15' : 'var(--color-command-red)15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <ArrowRightLeft size={16} style={{ color: tx.transactionType === 'Deposit' ? 'var(--color-command-green)' : 'var(--color-command-red)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{tx.party}</span>
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>
                            {formatINR(tx.amount)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          <span>{new Date(tx.date).toLocaleDateString()} • {tx.reference}</span>
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.transactionType}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <style jsx>{`
        .loader-sm {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-subtle);
          border-top: 2px solid var(--color-command-navy);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
