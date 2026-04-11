'use client';

import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { formatINR } from '@/lib/utils/format';
import { useApi } from '@/lib/hooks/useApi';

interface TradeBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TradeBulkUploadModal({ open, onClose, onSuccess }: TradeBulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useApi<any>('/api/clients');
  const { data: productsData } = useApi<any>('/api/products');
  const clients = clientsData?.data || [];
  const products = productsData?.data || [];

  if (!open) return null;

  // Basic CSV Parser (handles comma separation and quotes)
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) throw new Error("CSV must contain a header row and at least one data row.");
    
    // Split by comma, respecting quotes
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = lines[0].split(splitRegex).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    // Expected headers roughly: Date, Seller, Buyer, Product, Qty, Price, Type, Rate, Amount
    const data = lines.slice(1).map(line => {
      const values = line.split(splitRegex).map(v => v.replace(/^"|"$/g, '').trim());
      const row: any = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });

    return { headers, data };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setErrorMsg('');
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { data } = parseCSV(text);
        
        // Map to valid entities
        const resolved = data.map((d: any, index: number) => {
          // Normalize column lookups (loose matching)
          const dateRaw = d['date'] || d['trade date'] || '';
          const sellerRaw = d['seller'] || d['seller code'] || '';
          const buyerRaw = d['buyer'] || d['buyer code'] || '';
          const productRaw = d['product'] || d['product sku'] || d['sku'] || '';
          const qtyRaw = d['qty'] || d['quantity'] || '0';
          const priceRaw = d['price'] || d['rate'] || '0';
          const commRateRaw = d['comm %'] || d['commission rate'] || d['comm rate'] || '0';
          const commAmtRaw = d['comm amt'] || d['commission'] || d['amount'] || '0';

          const sellerMatch = clients.find((c: any) => c.code.toLowerCase() === sellerRaw.toLowerCase() || c.name.toLowerCase() === sellerRaw.toLowerCase());
          const buyerMatch = clients.find((c: any) => c.code.toLowerCase() === buyerRaw.toLowerCase() || c.name.toLowerCase() === buyerRaw.toLowerCase());
          const productMatch = products.find((p: any) => p.sku === productRaw || p.name.toLowerCase() === productRaw.toLowerCase());

          // Basic validation
          let isValid = true;
          let errors: string[] = [];

          if (isNaN(Date.parse(dateRaw))) { isValid = false; errors.push('Invalid Date'); }
          if (!sellerMatch) { isValid = false; errors.push(`Unknown Seller: ${sellerRaw}`); }
          if (!buyerMatch) { isValid = false; errors.push(`Unknown Buyer: ${buyerRaw}`); }
          if (!productMatch) { isValid = false; errors.push(`Unknown Product: ${productRaw}`); }
          if (isNaN(Number(qtyRaw)) || Number(qtyRaw) <= 0) { isValid = false; errors.push('Invalid Qty'); }
          
          return {
            _originalRow: index + 2,
            _isValid: isValid,
            _errors: errors,
            
            // Validated payload format
            date: isValid ? new Date(dateRaw).toISOString() : '',
            sellerId: sellerMatch?.id || '',
            buyerId: buyerMatch?.id || '',
            productId: productMatch?.id || '',
            quantity: Number(qtyRaw),
            price: Number(priceRaw),
            tradeType: 'sell', // standard default
            commissionRate: Number(commRateRaw),
            commissionAmt: Number(commAmtRaw) || (Number(qtyRaw) * Number(priceRaw) * Number(commRateRaw) / 100),
            
            // Display only
            _sellerName: sellerMatch?.name || sellerRaw,
            _buyerName: buyerMatch?.name || buyerRaw,
            _productName: productMatch?.name || productRaw,
          };
        });

        setParsedRows(resolved);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) return;

    setUploading(true);
    // Strip frontend display fields 
    const payload = validRows.map(r => ({
      date: r.date.split('T')[0],
      sellerId: r.sellerId,
      buyerId: r.buyerId,
      productId: r.productId,
      quantity: r.quantity,
      price: r.price,
      tradeType: r.tradeType,
      commissionRate: r.commissionRate,
      commissionAmt: r.commissionAmt
    }));

    try {
      const res = await fetch('/api/trades/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed due to server error.');
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsedRows.filter(r => r._isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fade-in 0.15s ease' }}>
      <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>Bulk Upload Trades (CSV)</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Map CSV headers to: Date, Seller, Buyer, Product, Qty, Price, Comm Rate, Comm Amt.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {!file ? (
            <div 
              style={{ padding: '60px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', textAlign: 'center', backgroundColor: 'var(--surface-container-low)', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Select CSV File</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>Click to browse your computer</p>
              <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          ) : (
            <>
              {errorMsg && (
                <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--error-surface)', color: 'var(--error)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <Card style={{ flex: 1, backgroundColor: 'var(--surface-container-low)' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontWeight: 600 }}>Valid Records</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-command-green)', marginTop: '4px' }}>{validCount}</div>
                </Card>
                <Card style={{ flex: 1, backgroundColor: 'var(--surface-container-low)' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontWeight: 600 }}>Invalid Records</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: invalidCount > 0 ? 'var(--color-danger)' : 'var(--text-primary)', marginTop: '4px' }}>{invalidCount}</div>
                </Card>
              </div>

              {parsedRows.length > 0 && (
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', whiteSpace: 'nowrap' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-container-high)' }}>
                        <th style={{ width: '30px' }}></th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Row</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Seller</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Buyer</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Comm Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: row._isValid ? 'transparent' : 'var(--error-surface)' }}>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {row._isValid ? <CheckCircle2 size={16} color="var(--color-command-green)" /> : <AlertCircle size={16} color="var(--color-danger)" />}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--text-tertiary)' }}>{row._originalRow}</td>
                          <td style={{ padding: '10px' }}>{row._isValid ? new Date(row.date).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '10px' }} title={row._errors.join(', ')}>
                            {row._sellerName} {!row.sellerId && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {row._buyerName} {!row.buyerId && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {row._productName} {!row.productId && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{row.quantity}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{formatINR(row.commissionAmt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 50 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', borderTop: '1px solid var(--border-subtle)' }}>
                      Showing first 50 of {parsedRows.length} rows
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-container-low)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || validCount === 0 || uploading}>
            {uploading ? 'Processing & Posting...' : `Upload ${validCount} Valid Trades`}
          </Button>
        </div>
      </div>
    </div>
  );
}
