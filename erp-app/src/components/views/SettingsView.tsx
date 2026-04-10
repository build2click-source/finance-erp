'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, Phone, Mail, Shield, Save, CheckCircle,
  FileText, Hash, MessageSquare, AlertTriangle,
} from 'lucide-react';
import { Card, PageHeader, Input } from '@/components/ui';
import { ViewId } from '@/components/layout/Sidebar';
import { useToast } from '@/lib/hooks/useToast';

interface SettingsViewProps {
  onNavigate: (view: ViewId) => void;
}

interface CompanyProfile {
  name: string;
  gstin: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  email: string;
  phone: string;
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--surface-container-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{description}</p>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
        {label} {required && <span style={{ color: 'var(--color-command-red)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const { success, error } = useToast();
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '', gstin: '', state: '', city: '', address: '', pincode: '', email: '', phone: '',
  });
  const [docPrefs, setDocPrefs] = useState({
    invoicePrefix: 'INV',
    invoiceStartNo: '001',
    footerNote: 'Thank you for your business!',
    bankDetails: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setProfile({
            name: d.data.name || '',
            gstin: d.data.gstin || '',
            state: d.data.state || '',
            city: d.data.city || '',
            address: d.data.address || '',
            pincode: d.data.pincode || '',
            email: d.data.email || '',
            phone: d.data.phone || '',
          });
          setDocPrefs({
            invoicePrefix: d.data.invoicePrefix || 'INV',
            invoiceStartNo: d.data.invoiceStartNo || '001',
            footerNote: d.data.footerNote || 'Thank you for your business!',
            bankDetails: d.data.bankDetails || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, ...docPrefs }),
      });
      if (res.ok) {
        success('Settings saved successfully.');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        error('Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <PageHeader title="Settings" description="Configure your company profile and document preferences." />
        <Card><p style={{ color: 'var(--text-tertiary)' }}>Loading settings...</p></Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Settings"
        description="Configure your company profile and document preferences."
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              height: '36px', padding: '0 18px', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              backgroundColor: saved ? 'var(--color-command-green)' : 'var(--color-command-navy)',
              color: 'white', fontSize: 'var(--text-sm)', fontWeight: 600,
              fontFamily: 'var(--font-data)', transition: 'all var(--transition-fast)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* ── Company Profile ─────────────────────────────────────────────── */}
        <Card>
          <SectionHeader
            icon={<Building2 size={20} color="var(--text-secondary)" />}
            title="Company Profile"
            description="This information appears on all invoices and documents."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <FormField label="Company Name" required>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. CommisERP Pvt. Ltd."
              />
            </FormField>

            <FormField label="GSTIN">
              <div style={{ position: 'relative' }}>
                <Shield size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <Input
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  style={{ paddingLeft: '32px', fontFamily: 'var(--font-data)', letterSpacing: '0.08em' }}
                />
              </div>
              {profile.gstin && profile.gstin.length !== 15 && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-command-amber)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} /> GSTIN must be exactly 15 characters
                </p>
              )}
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField label="State">
                <Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder="e.g. West Bengal" />
              </FormField>
              <FormField label="City">
                <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="e.g. Kolkata" />
              </FormField>
            </div>

            <FormField label="Address">
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Full registered address..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
                  color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="PIN Code">
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <Input value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} placeholder="700001" style={{ paddingLeft: '32px' }} />
              </div>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField label="Email">
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="info@company.com" style={{ paddingLeft: '32px' }} />
                </div>
              </FormField>
              <FormField label="Phone">
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" style={{ paddingLeft: '32px' }} />
                </div>
              </FormField>
            </div>
          </div>
        </Card>

        {/* ── Document Preferences ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <SectionHeader
              icon={<FileText size={20} color="var(--text-secondary)" />}
              title="Invoice Numbering"
              description="Set the starting invoice number and format."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <FormField label="Invoice Prefix">
                <div style={{ position: 'relative' }}>
                  <Hash size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <Input
                    value={docPrefs.invoicePrefix}
                    onChange={(e) => setDocPrefs({ ...docPrefs, invoicePrefix: e.target.value })}
                    placeholder="INV"
                    style={{ paddingLeft: '32px', fontFamily: 'var(--font-data)' }}
                  />
                </div>
              </FormField>
              <FormField label="Starting Invoice Number">
                <Input
                  type="number"
                  value={docPrefs.invoiceStartNo}
                  onChange={(e) => setDocPrefs({ ...docPrefs, invoiceStartNo: e.target.value })}
                  placeholder="001"
                  style={{ fontFamily: 'var(--font-data)' }}
                />
              </FormField>
              <div style={{
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--border-subtle)',
              }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Preview:</p>
                <p style={{ fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {docPrefs.invoicePrefix}/{docPrefs.invoiceStartNo.padStart(3, '0')}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader
              icon={<MessageSquare size={20} color="var(--text-secondary)" />}
              title="Document Footer"
              description="Text that appears at the bottom of every invoice."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <FormField label="Footer Note">
                <textarea
                  value={docPrefs.footerNote}
                  onChange={(e) => setDocPrefs({ ...docPrefs, footerNote: e.target.value })}
                  rows={3}
                  placeholder="Thank you for your business!"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
                    color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </FormField>
              <FormField label="Bank Details (for invoice footer)">
                <textarea
                  value={docPrefs.bankDetails}
                  onChange={(e) => setDocPrefs({ ...docPrefs, bankDetails: e.target.value })}
                  rows={4}
                  placeholder={`Account Name: My Company\nBank: Bandhan Bank\nA/C No: 000654321910\nIFSC: BAND000563`}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)',
                    color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </FormField>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
