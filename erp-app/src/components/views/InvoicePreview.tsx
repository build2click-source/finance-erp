'use client';

import React from 'react';
import { PageHeader, Button } from '@/components/ui';
import { useApi } from '@/lib/hooks/useApi';
import { formatINR } from '@/lib/utils/format';
import { amountToWords } from '@/lib/utils/number-to-words';

interface InvoicePreviewProps {
  id: string;
  onBack: () => void;
}

export function InvoicePreview({ id, onBack }: InvoicePreviewProps) {
  const { data: invResp, loading } = useApi<any>(`/api/invoices/${id}`);
  const { data: companyResp } = useApi<any>('/api/setup-company');
  const invoice = invResp?.data;
  const company = companyResp?.profile;

  if (loading || !invoice) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading invoice preview...</div>;

  const handlePrint = () => window.print();
  
  const handleWhatsApp = () => {
    const text = `Invoice from ${company?.name || 'ARM Enterprises'}\n` +
                 `Invoice No: ${invoice.invoiceNumber}\n` +
                 `Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}\n` +
                 `Amount: ₹${Number(invoice.totalAmount).toLocaleString('en-IN')}\n` +
                 `Status: ${invoice.status.toUpperCase()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    const email = (invoice.client as any)?.email;
    window.location.href = `mailto:${email || ''}?subject=Invoice ${invoice.invoiceNumber}&body=Please find attached invoice ${invoice.invoiceNumber} for ₹${Number(invoice.totalAmount).toLocaleString('en-IN')}`;
  };

  // GST Breakdown Calculation
  const hsnMap: Record<string, { taxableValue: number, cgst: number, sgst: number, igst: number, rate: number }> = {};
  const isInterState = Number(invoice.igst) > 0;

  invoice.lines.forEach((line: any) => {
    const hsn = line.hsnCode || '—';
    if (!hsnMap[hsn]) {
      hsnMap[hsn] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, rate: Number(line.gstRate) || 0 };
    }
    const net = Number(line.lineNet);
    const tax = Number(line.gstAmount || 0);
    hsnMap[hsn].taxableValue += net;
    if (isInterState) {
      hsnMap[hsn].igst += tax;
    } else {
      hsnMap[hsn].cgst += tax / 2;
      hsnMap[hsn].sgst += tax / 2;
    }
  });

  const hsnList = Object.entries(hsnMap).map(([hsn, data]) => ({ hsn, ...data }));
  const totalTaxAmount = Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={`Preview: ${invoice.invoiceNumber || 'Draft Invoice'}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={onBack}>Back</Button>
            <Button variant="secondary" onClick={handlePrint}>Download PDF / Print</Button>
            <Button variant="secondary" onClick={handleWhatsApp}>WhatsApp</Button>
            <Button variant="secondary" onClick={handleEmail}>Email</Button>
          </div>
        }
      />

      <div className="printable-invoice" style={{ backgroundColor: 'white', color: 'black', padding: '40px', border: '1px solid #333', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '11px', fontFamily: 'serif' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .printable-invoice, .printable-invoice * { visibility: visible; }
            .printable-invoice { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
            @page { size: A4; margin: 1cm; }
          }
          .invoice-table th, .invoice-table td { border: 1px solid #333; padding: 6px 8px; }
          .invoice-table { width: 100%; border-collapse: collapse; }
        `}} />
        
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '0' }}>
          <h1 style={{ margin: 0, fontSize: '16px', textTransform: 'uppercase', fontWeight: 700 }}>Tax Invoice</h1>
          <p style={{ margin: '2px 0', fontSize: '10px' }}>({invoice.status === 'draft' ? 'DRAFT - NOT FOR PAYMENT' : 'ORIGINAL FOR RECIPIENT'})</p>
        </div>

        {/* Top Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', border: '1px solid #333', borderTop: 'none' }}>
          {/* Seller Details */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
            <div style={{ padding: '8px', borderBottom: '1px solid #333' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{company?.name}</div>
              <div style={{ whiteSpace: 'pre-line', marginBottom: '4px' }}>{company?.address || 'KOLKATA, WEST BENGAL'}</div>
              <div>State Name: <strong>{company?.state}</strong>, Code: 19</div>
              <div>GSTIN/UIN: <strong>{company?.gstin}</strong></div>
              <div>E-Mail: {company?.email}</div>
            </div>
            
            {/* Consignee */}
            <div style={{ padding: '8px', borderBottom: '1px solid #333', minHeight: '80px' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#666', marginBottom: '2px' }}>Consignee (Ship to)</div>
              <div style={{ fontWeight: 700 }}>{invoice.consignee?.name || invoice.client?.name}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{invoice.consignee?.address || invoice.client?.address || '—'}</div>
              <div>State Name: <strong>{invoice.consignee?.state || invoice.client?.state}</strong>, Code: 19</div>
              <div>GSTIN/UIN: <strong>{invoice.consignee?.gstin || invoice.client?.gstin || '—'}</strong></div>
            </div>

            {/* Buyer */}
            <div style={{ padding: '8px', minHeight: '80px' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#666', marginBottom: '2px' }}>Buyer (Bill to) (if other than consignee)</div>
              <div style={{ fontWeight: 700 }}>{invoice.buyer?.name || invoice.client?.name}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{invoice.buyer?.address || invoice.client?.address || '—'}</div>
              <div>State Name: <strong>{invoice.buyer?.state || invoice.client?.state}</strong>, Code: 19</div>
              <div>GSTIN/UIN: <strong>{invoice.buyer?.gstin || invoice.client?.gstin || '—'}</strong></div>
            </div>
          </div>

          {/* Logistics & Reference Details */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Invoice No.</div>
                  <div style={{ fontWeight: 700 }}>{invoice.invoiceNumber || '(DRAFT)'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Dated</div>
                  <div style={{ fontWeight: 700 }}>{new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Delivery Note</div>
                  <div>{invoice.deliveryNote || '—'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Mode/Terms of Payment</div>
                  <div>{invoice.paymentTerms || '—'}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Supplier's Ref.</div>
                  <div>{invoice.suppliersRef || '—'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Other Reference(s)</div>
                  <div>{invoice.otherRef || '—'}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Buyer's Order No.</div>
                  <div>{invoice.buyersOrderNo || '—'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Dated</div>
                  <div>{invoice.buyersOrderDate ? new Date(invoice.buyersOrderDate).toLocaleDateString('en-IN') : '—'}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Dispatch Document No.</div>
                  <div>{invoice.dispatchDocNo || '—'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Delivery Note Date</div>
                  <div>{invoice.deliveryNoteDate ? new Date(invoice.deliveryNoteDate).toLocaleDateString('en-IN') : '—'}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #333' }}>
                <div style={{ padding: '6px', borderRight: '1px solid #333' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Dispatched through</div>
                  <div>{invoice.dispatchedThrough || '—'}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>Destination</div>
                  <div>{invoice.destination || '—'}</div>
                </div>
             </div>
             <div style={{ padding: '6px', minHeight: '60px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>Terms of Delivery</div>
                <div style={{ whiteSpace: 'pre-line' }}>{invoice.termsOfDelivery || '—'}</div>
             </div>
          </div>
        </div>

        {/* Particulars Table */}
        <table className="invoice-table" style={{ borderTop: 'none', marginTop: '-1px' }}>
          <thead>
            <tr style={{ textAlign: 'center', fontSize: '10px' }}>
              <th style={{ width: '40px' }}>Sl No</th>
              <th style={{ textAlign: 'left' }}>Particulars</th>
              <th style={{ width: '80px' }}>HSN/SAC</th>
              <th style={{ width: '60px' }}>Quantity</th>
              <th style={{ width: '80px' }}>Rate</th>
              <th style={{ width: '40px' }}>Per</th>
              <th style={{ width: '100px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line: any, idx: number) => (
              <tr key={line.id} style={{ borderBottom: 'none' }}>
                <td style={{ textAlign: 'center', verticalAlign: 'top', height: '30px' }}>{idx + 1}</td>
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700 }}>{line.product?.name || line.description}</div>
                  <div style={{ fontSize: '9px', paddingLeft: '10px' }}>{line.product?.name ? line.description : ''}</div>
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{line.hsnCode}</td>
                <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{Number(line.qty)}</td>
                <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{Number(line.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{line.per || 'NOS'}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>{Number(line.lineNet).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {/* Tax lines */}
            {Number(invoice.cgst) > 0 && (
              <tr>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>CGST @ {Number(invoice.lines[0]?.gstRate || 18) / 2}%</td>
                <td></td><td></td><td></td><td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(invoice.cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {Number(invoice.sgst) > 0 && (
              <tr>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>SGST @ {Number(invoice.lines[0]?.gstRate || 18) / 2}%</td>
                <td></td><td></td><td></td><td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {Number(invoice.igst) > 0 && (
              <tr>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>IGST @ {Number(invoice.lines[0]?.gstRate || 18)}%</td>
                <td></td><td></td><td></td><td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(invoice.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            <tr style={{ height: '80px' }}>
              <td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td><td style={{ borderBottom: 'none' }}></td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={3} style={{ textAlign: 'right', textTransform: 'uppercase', fontSize: '10px' }}>Total</td>
              <td style={{ textAlign: 'center' }}>{invoice.lines.reduce((s: number, l: any) => s + Number(l.qty), 0)}</td>
              <td colSpan={2}></td>
              <td style={{ textAlign: 'right', fontSize: '13px' }}>₹ {Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        {/* Amount in Words */}
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '9px', marginBottom: '2px' }}>Amount Chargeable (in words)</div>
            <div style={{ fontWeight: 700, fontSize: '11px' }}>INR Rupees {amountToWords(Number(invoice.totalAmount))}</div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700 }}>E. & O.E</div>
        </div>

        {/* GST Level Details */}
        <table className="invoice-table" style={{ marginTop: '10px', fontSize: '10px' }}>
          <thead>
            <tr style={{ textAlign: 'center' }}>
              <th rowSpan={2} style={{ width: '100px' }}>HSN/SAC</th>
              <th rowSpan={2} style={{ width: '120px' }}>Taxable Value</th>
              {!isInterState ? (
                <>
                  <th colSpan={2}>Central Tax</th>
                  <th colSpan={2}>State Tax</th>
                </>
              ) : (
                <th colSpan={2}>Integrated Tax</th>
              )}
              <th rowSpan={2} style={{ width: '100px' }}>Total Tax Amount</th>
            </tr>
            <tr style={{ textAlign: 'center' }}>
              {!isInterState ? (
                <>
                  <th style={{ width: '60px' }}>Rate</th>
                  <th style={{ width: '80px' }}>Amount</th>
                  <th style={{ width: '60px' }}>Rate</th>
                  <th style={{ width: '80px' }}>Amount</th>
                </>
              ) : (
                <>
                  <th style={{ width: '60px' }}>Rate</th>
                  <th style={{ width: '80px' }}>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {hsnList.map((item, idx) => (
              <tr key={idx} style={{ textAlign: 'right' }}>
                <td style={{ textAlign: 'center' }}>{item.hsn}</td>
                <td>{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                {!isInterState ? (
                  <>
                    <td style={{ textAlign: 'center' }}>{(item.rate / 2)}%</td>
                    <td>{item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'center' }}>{(item.rate / 2)}%</td>
                    <td>{item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'center' }}>{item.rate}%</td>
                    <td>{item.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </>
                )}
                <td style={{ fontWeight: 600 }}>{(item.cgst + item.sgst + item.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, textAlign: 'right' }}>
              <td>Total</td>
              <td>{hsnList.reduce((s, i) => s + i.taxableValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              {!isInterState ? (
                <>
                  <td></td>
                  <td>{hsnList.reduce((s, i) => s + i.cgst, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                  <td>{hsnList.reduce((s, i) => s + i.sgst, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </>
              ) : (
                <>
                  <td></td>
                  <td>{hsnList.reduce((s, i) => s + i.igst, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </>
              )}
              <td>{totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        {/* Tax Words */}
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '8px' }}>
          <div style={{ fontSize: '9px', marginBottom: '2px' }}>Tax Amount (in words)</div>
          <div style={{ fontWeight: 700, fontSize: '11px' }}>INR Rupees {amountToWords(totalTaxAmount)}</div>
        </div>

        {/* Disclaimer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #333', borderTop: 'none', minHeight: '120px' }}>
          <div style={{ padding: '8px', borderRight: '1px solid #333' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '4px', textDecoration: 'underline' }}>Declaration</div>
            <div style={{ fontSize: '9px', lineHeight: 1.4 }}>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
             <div style={{ fontSize: '10px', textAlign: 'right' }}>for <strong>{company?.name}</strong></div>
             <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '40px' }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
