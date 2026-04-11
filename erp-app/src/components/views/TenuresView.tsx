'use client';

import React, { useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { formatINR } from '@/lib/utils/format';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface TenuresViewProps {
  onNavigate: (view: ViewId) => void;
}

export function TenuresView({ onNavigate }: TenuresViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: tenuresResp, loading, revalidate } = useApi<any>('/api/tenures');
  const tenures = tenuresResp?.data || [];

  if (isCreating) {
    return (
      <TenureForm
        onCancel={() => setIsCreating(false)}
        onSuccess={() => {
          setIsCreating(false);
          revalidate();
        }}
      />
    );
  }

  const activeTenures = tenures.filter((t: any) => t.status === 'active');
  const totalMonthlyValue = activeTenures.reduce((sum: number, t: any) => {
    const amt = Number(t.amount) || 0;
    switch (t.frequency) {
      case 'Quarterly': return sum + amt / 3;
      case 'Annually': return sum + amt / 12;
      default: return sum + amt;
    }
  }, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Billing Tenures"
        description="Configure automated recurring billing cycles for clients."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Tenure
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ padding: 'var(--space-2)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Active Tenures</p>
            <p className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{activeTenures.length}</p>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 'var(--space-2)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Total Tenures</p>
            <p className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{tenures.length}</p>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 'var(--space-2)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Est. Monthly Revenue</p>
            <p className="font-display currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{formatINR(totalMonthlyValue)}</p>
          </div>
        </Card>
      </div>

      <DataTable<any>
        columns={[
          {
            key: 'client',
            header: 'Client',
            render: (t) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {t.client?.name || '—'}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {t.client?.code}
                </p>
              </div>
            ),
          },
          {
            key: 'description',
            header: 'Description',
            render: (t) => (
              <span style={{ color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {t.description}
              </span>
            ),
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (t) => <span className="currency" style={{ fontWeight: 500 }}>{formatINR(Number(t.amount))}</span>,
          },
          {
            key: 'frequency',
            header: 'Cycle',
            render: (t) => (
              <Badge variant="default">
                <CalendarClock size={12} style={{ marginRight: '4px' }} />
                {t.frequency}
              </Badge>
            ),
          },
          {
            key: 'nextBillingDate',
            header: 'Next Billing',
            render: (t) => (
              <span className="font-technical" style={{ color: 'var(--text-secondary)' }}>
                {new Date(t.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (t) => (
              <Badge variant={t.status === 'active' ? 'success' : t.status === 'paused' ? 'warning' : 'danger'}>
                {t.status}
              </Badge>
            ),
          },
        ]}
        data={tenures}
        loading={loading}
        searchPlaceholder="Search by description, client..."
        renderRowActions={(t: any) => (
          <button
            onClick={() => {
              const msg = `Tenure: ${t.description}\nClient ID: ${t.clientId}\nAmount: ₹${Number(t.amount).toLocaleString('en-IN')}\nFrequency: ${t.frequency}\nNext Billing: ${new Date(t.nextBillingDate).toLocaleDateString()}`;
              alert(msg);
            }}
            style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Details
          </button>
        )}
      />
    </div>
  );
}

/* ============================================================
   TENURE CREATION FORM
   ============================================================ */
function TenureForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { data: clientsResp } = useApi<any>('/api/clients');
  const clients = clientsResp?.data || [];
  const { mutate } = useApi('/api/tenures');

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    description: '',
    amount: '',
    frequency: 'Monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    gstRate: '18',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutate('POST', {
        clientId: formData.clientId,
        description: formData.description,
        amount: Number(formData.amount),
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        gstRate: Number(formData.gstRate),
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Failed to create tenure');
    } finally {
      setSaving(false);
    }
  };

  const baseAmount = Number(formData.amount) || 0;
  const gst = Number(formData.gstRate) || 0;
  const taxAmount = Math.round((baseAmount * gst) / 100 * 100) / 100;
  const totalAmount = baseAmount + taxAmount;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title="Create Billing Tenure"
        description="Set up a new recurring billing cycle for a client."
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.clientId || !formData.description || !formData.amount}>
              {saving ? 'Creating...' : 'Create Tenure'}
            </Button>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Client & Cycle Config */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Billing Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <Select
                label="Client"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                options={[
                  { value: '', label: 'Select Client...' },
                  ...clients.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code})` })),
                ]}
              />
              <Select
                label="Billing Frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Quarterly', label: 'Quarterly' },
                  { value: 'Annually', label: 'Annually' },
                ]}
              />
              <div style={{ gridColumn: 'span 2' }}>
                <Input
                  label="Service Description"
                  placeholder="e.g. Platform Subscription Fee, Consulting Retainer..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Financial Details */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Financial Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
              <Input
                label="Base Amount (₹)"
                type="number"
                placeholder="10000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <Input
                label="GST Rate (%)"
                type="number"
                placeholder="18"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total per Cycle</p>
                <p className="font-display currency" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatINR(totalAmount)}
                </p>
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Schedule
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <Input
                label="Start Date (First Billing)"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <Input
                label="End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </section>

          {/* Summary Card */}
          <div
            style={{
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--border-subtle)',
              padding: 'var(--space-6)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Tenure Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base Amount</span>
                <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatINR(baseAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST ({gst}%)</span>
                <span className="currency" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatINR(taxAmount)}</span>
              </div>
              <div
                style={{
                  paddingTop: 'var(--space-4)',
                  marginTop: 'var(--space-2)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="font-display" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Total per {formData.frequency === 'Monthly' ? 'Month' : formData.frequency === 'Quarterly' ? 'Quarter' : 'Year'}
                </span>
                <span className="font-display currency" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
