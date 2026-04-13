'use client';

import React, { useState } from 'react';
import { Plus, FileUp } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Input, Select, Textarea, ConfirmModal, BulkUploadModal, ViewSkeleton } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ViewId } from '@/components/layout/Sidebar';
import { useApi } from '@/lib/hooks/useApi';

interface ClientsViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState<any>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [importing, setImporting] = useState(false);

  const { data: clientsResp, loading, error, revalidate } = useApi<any>('/api/clients');
  const clients = clientsResp?.data || [];

  const filteredClients = React.useMemo(() => {
    return clients.filter((c: any) => {
      if (typeFilter === 'all') return true;
      if (typeFilter === 'Both') return c.type === 'Both';
      return c.type === typeFilter;
    });
  }, [clients, typeFilter]);

  if (loading && !clients.length) return <ViewSkeleton />;

  if (isCreating || editingClient) {
    return <ClientForm 
      initialData={editingClient}
      onCancel={() => { setIsCreating(false); setEditingClient(null); }} 
      onSuccess={() => {
        setIsCreating(false);
        setEditingClient(null);
        revalidate();
      }} 
    />;
  }

  if (viewingClient) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <PageHeader
          title={`Client Details: ${viewingClient.name}`}
          description={`Viewing profile for ${viewingClient.code}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setViewingClient(null)}>Back</Button>
              <Button onClick={() => { setEditingClient(viewingClient); setViewingClient(null); }}>Edit Client</Button>
            </>
          }
        />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Name</p><p>{viewingClient.name}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Code / Alias</p><p>{viewingClient.code}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Type</p><p>{viewingClient.type}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>GSTIN</p><p className="font-technical">{viewingClient.gstin || 'N/A'}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Email</p><p>{viewingClient.email || 'N/A'}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Contact</p><p>{viewingClient.contact || 'N/A'}</p></div>
            <div style={{gridColumn: 'span 2'}}><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Address</p><p>{viewingClient.address || 'N/A'}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>City</p><p>{viewingClient.city || 'N/A'}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>State</p><p>{viewingClient.state || 'N/A'}</p></div>
            <div><p style={{color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)'}}>Pincode</p><p>{viewingClient.pincode || 'N/A'}</p></div>
          </div>
        </Card>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(s => s.trim());
          if (cols.length >= 2 && cols[0]) {
             try {
               await fetch('/api/clients', {
                  method: 'POST',
                  body: JSON.stringify({
                    name: cols[0],
                    type: ['Customer', 'Vendor', 'Both'].includes(cols[1]) ? cols[1] : 'Both',
                    code: cols[2] || `BL-${Math.floor(Math.random()*10000)}`,
                    email: cols[3] || 'imported@example.com',
                    contact: cols[4] || '9999999999',
                    address: cols[5] || 'Imported Address',
                    defaultCurrency: 'INR'
                  })
               });
               importedCount++;
             } catch(err) { console.error('Row failed', err) }
          }
      }
      alert(`CSV Processing Complete: Successfully imported ${importedCount} records.`);
      setImporting(false);
      revalidate();
    };
    reader.readAsText(file);
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      const res = await fetch(`/api/clients/${deletingClient.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      revalidate();
    } catch (e) {
      console.error(e);
      alert('Failed to delete client');
    } finally {
      setDeletingClient(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Client Management"
        description="Manage all buyer and seller profiles."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
              <FileUp size={16} /> Batch Upload
            </Button>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} /> New Client
            </Button>
          </>
        }
      />

      <DataTable<any>
        columns={[
          {
            key: 'name',
            header: 'Client Name',
            render: (c) => (
              <div>
                <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {c.code}
                </p>
              </div>
            ),
          },
          { key: 'type', header: 'Type', render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.type}</span> },
          { key: 'gstin', header: 'GSTIN', render: (c) => <span className="font-technical" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{c.gstin || '—'}</span> },
        ]}
        data={filteredClients}
        loading={loading}
        filters={
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'Customer', label: 'Customers (Buyers)' },
              { value: 'Vendor', label: 'Vendors (Sellers)' },
              { value: 'Both', label: 'Both' },
            ]}
            style={{ width: '200px' }}
          />
        }
        searchPlaceholder="Search by name, code, or GSTIN..."
        renderRowActions={(c: any) => (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setViewingClient(c)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              View
            </button>
            <button
              onClick={() => setEditingClient(c)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Edit
            </button>
            <button
              onClick={() => onNavigate('invoices')}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Invoices
            </button>
            <button
              onClick={() => setDeletingClient(c)}
              style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Archive
            </button>
          </div>
        )}
      />

      <ConfirmModal
        open={!!deletingClient}
        title="Archive Client?"
        message={`Are you sure you want to archive "${deletingClient?.name}"? If they have transactions, they will be deactivated instead of deleted.`}
        confirmLabel="Archive"
        variant="danger"
        onConfirm={handleDeleteClient}
        onCancel={() => setDeletingClient(null)}
      />

      <BulkUploadModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Batch Import Clients"
        entityName="Clients"
        endpoint="/api/clients/bulk"
        onSuccess={revalidate}
        columns={[
          { key: 'name', label: 'Name', required: true },
          { key: 'code', label: 'Code', required: true },
          { key: 'type', label: 'Type' },
          { key: 'email', label: 'Email' },
          { key: 'contact', label: 'Contact' },
          { key: 'gstin', label: 'GSTIN' },
          { key: 'address', label: 'Address' },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CLIENT CREATION / EDIT FORM
   ============================================================ */
function ClientForm({ initialData, onCancel, onSuccess }: { initialData?: any, onCancel: () => void, onSuccess: () => void }) {
  const [loadingGst, setLoadingGst] = useState(false);
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { mutate } = useApi(initialData ? `/api/clients/${initialData.id}` : '/api/clients');
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    alias: initialData?.code || '',
    type: initialData?.type ? (initialData.type === 'Customer' ? 'Buyer' : initialData.type === 'Vendor' ? 'Seller' : 'Both') : 'Both',
    doj: '2026-04-01',
    address: initialData?.address || '',
    pincode: initialData?.pincode || '',
    contact: initialData?.contact || '',
    city: initialData?.city || '',
    state: initialData?.state || initialData?.placeOfSupply || '',
    email: initialData?.email || '',
    gstin: initialData?.gstin || ''
  });

  const handleGstinLookup = async () => {
    if (!formData.gstin || formData.gstin.length !== 15) return;
    setLoadingGst(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/gstin/${formData.gstin}`);
      const json = await res.json();
      if (json.success && json.data) {
        // We will populate state even if valid is false (the fallback logic gives us stateName)
        setFormData(prev => ({
          ...prev,
          name: json.data.tradeName || json.data.legalName || prev.name,
          address: json.data.address?.fullAddress || prev.address,
          pincode: json.data.address?.pincode || prev.pincode,
          city: json.data.address?.district || prev.city,
          state: json.data.stateName || json.data.address?.state || prev.state,
        }));
      }
    } catch (e) {
      console.error('GSTIN lookup failed', e);
    } finally {
      setLoadingGst(false);
    }
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value;
    setFormData({ ...formData, pincode: pin });
    if (pin.length === 6 && /^[0-9]+$/.test(pin)) {
      setLoadingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setFormData(prev => ({
            ...prev,
            city: po.District || prev.city,
            state: po.State || prev.state,
          }));
        }
      } catch (err) {
        console.error('Pincode lookup error:', err);
      } finally {
        setLoadingPincode(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    
    // Frontend Validation
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMsg('Valid billing email address is required.');
      setSaving(false);
      return;
    }
    if (!formData.contact || !/^\+?[0-9]{10,14}$/.test(formData.contact)) {
      setErrorMsg('Valid primary contact number (10-14 digits) is required.');
      setSaving(false);
      return;
    }

    try {
      const method = initialData ? 'PUT' : 'POST';
      let code = formData.alias || formData.name.substring(0, 4).toUpperCase() + Math.floor(Math.random() * 1000);
      if (code.length > 20) code = code.substring(0, 20); // enforce validation max length
      
      const payload = {
        code,
        name: formData.name,
        type: formData.type === 'Buyer' ? 'Customer' : formData.type === 'Seller' ? 'Vendor' : 'Both',
        gstin: formData.gstin || undefined,
        placeOfSupply: formData.state || undefined,
        email: formData.email,
        contact: formData.contact,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        defaultCurrency: 'INR',
      };
      
      await mutate(method, payload);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to save client due to a server error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
      <PageHeader
        title={initialData ? "Edit Client Profile" : "Create Client Profile"}
        description={initialData ? "Update the client profile." : "Add a new buyer, seller, or dual-role client to the system."}
        actions={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Saving...' : (initialData ? 'Update Client' : 'Save Client')}
            </Button>
          </>
        }
      />

      {errorMsg && (
        <div style={{ padding: 'var(--space-3)', backgroundColor: '#ef444415', color: '#ef4444', borderRadius: 'var(--radius-md)', border: '1px solid #ef444450' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Billing & Compliance - Moved to top for GSTIN auto-fill */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Billing & Compliance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div>
                <Input 
                  label="Tax ID / GSTIN" 
                  placeholder="Enter 15-digit GSTIN" 
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  style={{ marginTop: 'var(--space-2)' }}
                  onClick={handleGstinLookup}
                  disabled={loadingGst || formData.gstin.length !== 15}
                >
                  {loadingGst ? 'Verifying...' : 'Verify & Auto-fill'}
                </Button>
              </div>
              <Input 
                label="Billing Email Address" 
                type="email" 
                placeholder="billing@company.com" 
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </section>

          {/* Basic Details */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Basic Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Input 
                  label="Client Name" 
                  placeholder="Acme Corporation" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <Input 
                label="Alias Name" 
                placeholder="Acme" 
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              />
              <Select
                label="Client Type"
                options={[
                  { value: 'Buyer', label: 'Buyer' },
                  { value: 'Seller', label: 'Seller' },
                  { value: 'Both', label: 'Both' },
                ]}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
              <Input 
                label="Date of Joining" 
                type="date" 
                value={formData.doj}
                onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
              />
            </div>
          </section>

          {/* Contact & Location */}
          <section>
            <h3 className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              Contact & Location
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Textarea 
                  label="Full Address" 
                  placeholder="123 Business Rd, Suite 100..." 
                  rows={2} 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Input 
                label="Pincode / Zip Code" 
                placeholder="Enter 6-digit Pincode" 
                value={formData.pincode}
                onChange={handlePincodeChange}
                disabled={loadingPincode}
              />
              <Input 
                label="Primary Contact Number" 
                placeholder="e.g. 9876543210" 
                required
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
              <Input label="City" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              <Input label="State / Region" placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
            </div>
          </section>
        </div>
      </Card>

      {/* Bulk Upload Callout */}
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-container-low)',
          padding: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Import multiple clients</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '4px' }}>Use our CSV template to upload clients in bulk.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm">Download Template</Button>
          <Button variant="secondary" size="sm"><FileUp size={16} /> Upload CSV</Button>
        </div>
      </div>
    </div>
  );
}
