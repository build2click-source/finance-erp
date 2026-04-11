'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, Phone, Mail, Shield, Save, CheckCircle,
  FileText, Hash, MessageSquare, AlertTriangle, Users, Plus,
  Eye, EyeOff, Key, Lock, UserCheck, UserX, Edit2, X, Check, Settings2
} from 'lucide-react';
import { Card, PageHeader, Input } from '@/components/ui';
import { ViewId } from '@/components/layout/Sidebar';
import { useToast } from '@/lib/hooks/useToast';
import { useRole } from '@/lib/hooks/useRole';
import { PermissionsTab } from '@/components/settings/PermissionsTab';

interface SettingsViewProps {
  onNavigate: (view: ViewId) => void;
}

interface CompanyProfile {
  name: string; gstin: string; state: string; city: string;
  address: string; pincode: string; email: string; phone: string;
}

interface UserRecord {
  id: string; username: string; displayName: string;
  email: string | null; role: string; isActive: boolean; createdAt: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'data_entry', label: 'Data Entry Clerk' },
];

const ROLE_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(59,106,219,0.15)', color: '#6aadff' },
  accountant: { bg: 'rgba(90,138,94,0.15)', color: '#82c987' },
  data_entry: { bg: 'rgba(180,160,80,0.15)', color: '#d4b94a' },
};

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{description}</p>
      </div>
    </div>
  );
}

// ─── Form Field ────────────────────────────────────────────────────────────────
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

// ─── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const levels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            backgroundColor: i < score ? colors[score - 1] : 'var(--border-subtle)',
            transition: 'background-color 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: score > 0 ? colors[score - 1] : 'var(--text-tertiary)' }}>
        {score > 0 ? levels[score - 1] : ''}
        {score < 4 && password && ' — add uppercase, numbers, or symbols'}
      </p>
    </div>
  );
}

// ─── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { success, error } = useToast();
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '', role: 'data_entry' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { error(data.error || 'Failed to create user'); return; }
      success(`User "${form.displayName}" created successfully.`);
      onCreated();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '2rem', width: '100%', maxWidth: '440px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Create New User</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Display Name" required>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Rahul Sharma" required />
          </FormField>
          <FormField label="Username" required>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="e.g. rahul.sharma" required />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@company.com" />
          </FormField>
          <FormField label="Password" required>
            <div style={{ position: 'relative' }}>
              <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" required style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </FormField>
          <FormField label="Role" required>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)', outline: 'none' }}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </FormField>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: '40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-data)', fontSize: 'var(--text-sm)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, height: '40px', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: 'var(--color-command-navy)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-data)', fontSize: 'var(--text-sm)', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Row ──────────────────────────────────────────────────────────────────
function UserRow({ user, currentUserId, onRefresh }: { user: UserRecord; currentUserId?: string; onRefresh: () => void }) {
  const { error: toastError, success } = useToast();
  const [editRole, setEditRole] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const isSelf = user.id === currentUserId;
  const badge = ROLE_BADGE_STYLE[user.role] ?? ROLE_BADGE_STYLE['data_entry'];

  const saveRole = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { toastError(data.error || 'Failed to update role'); setNewRole(user.role); }
      else { success('Role updated.'); onRefresh(); }
    } finally { setSaving(false); setEditRole(false); }
  };

  const toggleActive = async () => {
    if (isSelf) { toastError("You can't deactivate your own account."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) toastError(data.error || 'Failed to update status');
      else { success(user.isActive ? 'User deactivated.' : 'User reactivated.'); onRefresh(); }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: user.isActive ? 'var(--surface-container-low)' : 'var(--surface-container)', border: '1px solid var(--border-subtle)', opacity: user.isActive ? 1 : 0.6 }}>
      <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', backgroundColor: badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: badge.color, flexShrink: 0 }}>
        {user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{user.displayName}</p>
          {isSelf && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1px 5px' }}>You</span>}
          {!user.isActive && <span style={{ fontSize: '10px', color: 'var(--color-danger)', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '4px', padding: '1px 5px' }}>Inactive</span>}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>@{user.username}{user.email ? ` · ${user.email}` : ''}</p>
      </div>

      {/* Role editor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {editRole ? (
          <>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ height: '32px', padding: '0 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-data)', outline: 'none' }}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={saveRole} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', padding: '4px' }}><Check size={16} /></button>
            <button onClick={() => { setEditRole(false); setNewRole(user.role); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><X size={16} /></button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: badge.bg, color: badge.color }}>
              {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role}
            </span>
            <button onClick={() => setEditRole(true)} title="Edit role" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}><Edit2 size={14} /></button>
          </>
        )}
        <button onClick={toggleActive} disabled={saving || isSelf} title={user.isActive ? 'Deactivate user' : 'Reactivate user'}
          style={{ background: 'none', border: 'none', cursor: (saving || isSelf) ? 'not-allowed' : 'pointer', color: user.isActive ? 'var(--color-danger)' : '#22c55e', padding: '4px', opacity: (saving || isSelf) ? 0.4 : 1 }}>
          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main SettingsView ─────────────────────────────────────────────────────────
export function SettingsView({ onNavigate }: SettingsViewProps) {
  const { success, error } = useToast();
  const { canManageUsers, user: sessionUser } = useRole();

  // Active tab
  const [activeTab, setActiveTab] = useState<'company' | 'security' | 'users' | 'permissions'>('company');

  // Company profile
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', gstin: '', state: '', city: '', address: '', pincode: '', email: '', phone: '' });
  const [docPrefs, setDocPrefs] = useState({ invoicePrefix: 'INV', invoiceStartNo: '001', footerNote: 'Thank you for your business!', bankDetails: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Change password
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // User management
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      if (d.data) {
        setProfile({ name: d.data.name || '', gstin: d.data.gstin || '', state: d.data.state || '', city: d.data.city || '', address: d.data.address || '', pincode: d.data.pincode || '', email: d.data.email || '', phone: d.data.phone || '' });
        setDocPrefs({ invoicePrefix: d.data.invoicePrefix || 'INV', invoiceStartNo: d.data.invoiceStartNo || '001', footerNote: d.data.footerNote || 'Thank you for your business!', bankDetails: d.data.bankDetails || '' });
      }
      setLoadingProfile(false);
    }).catch(() => setLoadingProfile(false));
  }, []);

  const fetchUsers = () => {
    if (!canManageUsers) return;
    setLoadingUsers(true);
    fetch('/api/users').then((r) => r.json()).then((d) => { if (d.data) setUsers(d.data); }).finally(() => setLoadingUsers(false));
  };

  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab]);

  const handleSaveProfile = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, ...docPrefs }) });
      if (res.ok) { success('Settings saved successfully.'); setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else error('Failed to save settings.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { error('New passwords do not match.'); return; }
    if (pwForm.newPassword.length < 8) { error('New password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pwForm) });
      const data = await res.json();
      if (!res.ok) { error(data.error || 'Failed to change password.'); return; }
      success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally { setPwSaving(false); }
  };

  const tabs = [
    { id: 'company', label: 'Company & Documents', icon: <Building2 size={14} /> },
    { id: 'security', label: 'Security', icon: <Lock size={14} /> },
    ...(canManageUsers ? [
      { id: 'users', label: 'User Management', icon: <Users size={14} /> },
      { id: 'permissions', label: 'Permissions', icon: <Shield size={14} /> }
    ] : []),
  ] as { id: typeof activeTab; label: string; icon: React.ReactNode }[];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader title="Settings" description="Manage company settings, security, and user access." />

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              backgroundColor: 'transparent', fontFamily: 'var(--font-data)',
              fontSize: 'var(--text-sm)', fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-command-navy)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all var(--transition-fast)',
            }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Company & Documents ── */}
      {activeTab === 'company' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSaveProfile} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: saved ? 'var(--color-command-green)' : 'var(--color-command-navy)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-data)', transition: 'all var(--transition-fast)', opacity: saving ? 0.7 : 1 }}>
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {loadingProfile ? <Card><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></Card> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
              <Card>
                <SectionHeader icon={<Building2 size={20} color="var(--text-secondary)" />} title="Company Profile" description="This information appears on all invoices and documents." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  <FormField label="Company Name" required>
                    <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="e.g. CommisERP Pvt. Ltd." />
                  </FormField>
                  <FormField label="GSTIN">
                    <div style={{ position: 'relative' }}>
                      <Shield size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <Input value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" style={{ paddingLeft: '32px', fontFamily: 'var(--font-data)', letterSpacing: '0.08em' }} />
                    </div>
                    {profile.gstin && profile.gstin.length !== 15 && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-command-amber)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> GSTIN must be exactly 15 characters
                      </p>
                    )}
                  </FormField>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <FormField label="State"><Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder="e.g. West Bengal" /></FormField>
                    <FormField label="City"><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="e.g. Kolkata" /></FormField>
                  </div>
                  <FormField label="Address">
                    <textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Full registered address..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <Card>
                  <SectionHeader icon={<FileText size={20} color="var(--text-secondary)" />} title="Invoice Numbering" description="Set the starting invoice number and format." />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    <FormField label="Invoice Prefix">
                      <div style={{ position: 'relative' }}>
                        <Hash size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <Input value={docPrefs.invoicePrefix} onChange={(e) => setDocPrefs({ ...docPrefs, invoicePrefix: e.target.value })} placeholder="INV" style={{ paddingLeft: '32px', fontFamily: 'var(--font-data)' }} />
                      </div>
                    </FormField>
                    <FormField label="Starting Invoice Number">
                      <Input type="number" value={docPrefs.invoiceStartNo} onChange={(e) => setDocPrefs({ ...docPrefs, invoiceStartNo: e.target.value })} placeholder="001" style={{ fontFamily: 'var(--font-data)' }} />
                    </FormField>
                    <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Preview:</p>
                      <p style={{ fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{docPrefs.invoicePrefix}/{docPrefs.invoiceStartNo.padStart(3, '0')}</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <SectionHeader icon={<MessageSquare size={20} color="var(--text-secondary)" />} title="Document Footer" description="Text that appears at the bottom of every invoice." />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    <FormField label="Footer Note">
                      <textarea value={docPrefs.footerNote} onChange={(e) => setDocPrefs({ ...docPrefs, footerNote: e.target.value })} rows={3} placeholder="Thank you for your business!" style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    </FormField>
                    <FormField label="Bank Details (for invoice footer)">
                      <textarea value={docPrefs.bankDetails} onChange={(e) => setDocPrefs({ ...docPrefs, bankDetails: e.target.value })} rows={4} placeholder={`Account Name: My Company\nBank: Bandhan Bank\nA/C No: 000654321910\nIFSC: BAND000563`} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-data)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    </FormField>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Permissions ── */}
      {activeTab === 'permissions' && canManageUsers && (
        <PermissionsTab />
      )}

      {/* ── Tab: Security ── */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '480px' }}>
          <Card>
            <SectionHeader icon={<Key size={20} color="var(--text-secondary)" />} title="Change Password" description="Update your account password. You'll need your current password to confirm." />
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <FormField label="Current Password" required>
                <div style={{ position: 'relative' }}>
                  <Input type={showPw.current ? 'text' : 'password'} value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Enter current password" required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPw({ ...showPw, current: !showPw.current })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                    {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>

              <FormField label="New Password" required>
                <div style={{ position: 'relative' }}>
                  <Input type={showPw.new ? 'text' : 'password'} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Min. 8 characters" required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPw({ ...showPw, new: !showPw.new })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                    {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={pwForm.newPassword} />
              </FormField>

              <FormField label="Confirm New Password" required>
                <div style={{ position: 'relative' }}>
                  <Input type={showPw.confirm ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Repeat new password" required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                    {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>
                )}
              </FormField>

              <button type="submit" disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '40px', borderRadius: 'var(--radius-md)', border: 'none', cursor: (pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) ? 'not-allowed' : 'pointer', backgroundColor: 'var(--color-command-navy)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-data)', opacity: (pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) ? 0.6 : 1, transition: 'opacity var(--transition-fast)' }}>
                <Lock size={15} />
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Tab: User Management ── */}
      {activeTab === 'users' && canManageUsers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
              {users.length} user{users.length !== 1 ? 's' : ''} in the system
            </p>
            <button onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', backgroundColor: 'var(--color-command-navy)', color: 'white', fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-data)' }}>
              <Plus size={15} /> Add User
            </button>
          </div>

          <Card>
            {loadingUsers ? (
              <p style={{ color: 'var(--text-tertiary)' }}>Loading users...</p>
            ) : users.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-8)' }}>No users found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} currentUserId={sessionUser?.userId} onRefresh={fetchUsers} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={fetchUsers} />}
    </div>
  );
}
