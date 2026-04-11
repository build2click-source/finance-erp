'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Input, Button } from '@/components/ui';
import { Download } from 'lucide-react';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface GstReportsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function GstReportsView({ onNavigate }: GstReportsViewProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!selectedMonth) return;
    
    setLoading(true);
    fetch(`/api/gst-reports?month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setReportData(data);
          setLoading(false);
        }
      })
      .catch(err => {
         console.error(err);
         if (active) setLoading(false);
      });
      
    return () => { active = false; };
  }, [selectedMonth]);

  const exportCSV = () => {
    if (!reportData?.gstr1) return;
    
    const d = reportData;
    const rows = [
      ['GST Filing Summary (GSTR-1 & GSTR-3B)'],
      [`Month: ${selectedMonth}`],
      [],
      ['GSTR-1: OUTWARD SUPPLIES'],
      ['Type', 'Invoice Count', 'Taxable Value', 'IGST', 'CGST', 'SGST'],
      ['B2B (Registered)', d.gstr1.b2b.count, d.gstr1.b2b.taxableValue, d.gstr1.b2b.igst, d.gstr1.b2b.cgst, d.gstr1.b2b.sgst],
      ['B2C (Unregistered)', d.gstr1.b2c.count, d.gstr1.b2c.taxableValue, d.gstr1.b2c.igst, d.gstr1.b2c.cgst, d.gstr1.b2c.sgst],
      [],
      ['GSTR-3B: SUMMARY & TAX LIABILITY'],
      ['Section', 'Taxable Value', 'IGST', 'CGST', 'SGST'],
      ['3.1 Outward Taxable', d.gstr3b.outward.taxableValue, d.gstr3b.outward.igst, d.gstr3b.outward.cgst, d.gstr3b.outward.sgst],
      ['4. Eligible ITC', '-', d.gstr3b.itc.igst, d.gstr3b.itc.cgst, d.gstr3b.itc.sgst],
      ['6.1 Net Tax Payable', '-', d.gstr3b.payable.igst, d.gstr3b.payable.cgst, d.gstr3b.payable.sgst]
    ];
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst_report_${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="GST Filings (CA Summary)"
        description="Auto-generated GSTR-1 and GSTR-3B summaries for your Chartered Accountant."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
             <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Filing Month:</span>
             <Input 
               type="month" 
               value={selectedMonth} 
               onChange={e => setSelectedMonth(e.target.value)} 
               style={{ width: '180px' }}
             />
             <Button variant="secondary" onClick={exportCSV} disabled={!reportData?.gstr1}>
               <Download size={16} /> Export CSV
             </Button>
          </div>
        }
      />

      {loading ? (
        <Card><p style={{ color: 'var(--text-secondary)' }}>Compiling aggregate GST data...</p></Card>
      ) : reportData && reportData.gstr1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          
          {/* GSTR-1 Section */}
          <section>
            <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              GSTR-1: Outward Supplies
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <Card>
                 <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                    B2B Supplies (Registered)
                 </h3>
                 <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Sales to businesses with GSTIN.
                 </p>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Invoice Count</p>
                      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{reportData.gstr1.b2b.count}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Taxable Value</p>
                      <p className="currency" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(reportData.gstr1.b2b.taxableValue)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Total IGST</p>
                      <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr1.b2b.igst)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>CGST / SGST</p>
                      <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr1.b2b.cgst)} / {formatINR(reportData.gstr1.b2b.sgst)}</p>
                    </div>
                 </div>
              </Card>

              <Card>
                 <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                    B2C Supplies (Unregistered)
                 </h3>
                 <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Sales to consumers or unregistered businesses.
                 </p>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Invoice Count</p>
                      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{reportData.gstr1.b2c.count}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Taxable Value</p>
                      <p className="currency" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(reportData.gstr1.b2c.taxableValue)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Total IGST</p>
                      <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr1.b2c.igst)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>CGST / SGST</p>
                      <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr1.b2c.cgst)} / {formatINR(reportData.gstr1.b2c.sgst)}</p>
                    </div>
                 </div>
              </Card>
            </div>
          </section>

          {/* GSTR-3B Section */}
          <section>
            <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              GSTR-3B: Summary & Tax Liability
            </h2>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                
                {/* Outward Block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>3.1 Outward Taxable</h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Total Sales (B2B + B2C)</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Taxable Value</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)' }}>{formatINR(reportData.gstr3b.outward.taxableValue)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>IGST Liability</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)' }}>{formatINR(reportData.gstr3b.outward.igst)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>CGST / SGST Liability</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)' }}>{formatINR(reportData.gstr3b.outward.cgst)} / {formatINR(reportData.gstr3b.outward.sgst)}</p>
                  </div>
                </div>

                {/* ITC Block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>4. Eligible ITC</h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-command-green)' }}>Input Tax Credit from Vendor Bills</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Taxable Value</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-secondary)' }}>-</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>ITC IGST</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-green)' }}>{formatINR(reportData.gstr3b.itc.igst)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>ITC CGST / SGST</p>
                    <p className="currency" style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-command-green)' }}>{formatINR(reportData.gstr3b.itc.cgst)} / {formatINR(reportData.gstr3b.itc.sgst)}</p>
                  </div>
                </div>

                {/* Payable Block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 'var(--space-4)', backgroundColor: 'var(--surface-container-high)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>6.1 Payment of Tax</h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-command-amber)' }}>Net Tax Payable in Cash</p>
                  </div>
                  <div>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Net IGST Payable</p>
                    <p className="currency" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr3b.payable.igst)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>Net CGST/SGST Payable</p>
                    <p className="currency" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-command-amber)' }}>{formatINR(reportData.gstr3b.payable.cgst)} / {formatINR(reportData.gstr3b.payable.sgst)}</p>
                  </div>
                </div>

              </div>
            </Card>
          </section>
        </div>
      ) : (
         <Card><p style={{ color: 'var(--color-command-red)' }}>{reportData?.error || 'Failed to load report data.'}</p></Card>
      )}
    </div>
  );
}
