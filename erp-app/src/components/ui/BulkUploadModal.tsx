'use client';

import React, { useState, useRef } from 'react';
import { FileUp, Download, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface Column {
  key: string;
  label: string;
  required?: boolean;
}

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  columns: Column[];
  endpoint: string;
  onSuccess: () => void;
}

export function BulkUploadModal({
  open,
  onClose,
  title,
  entityName,
  columns,
  endpoint,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleDownloadTemplate = () => {
    const csvContent = columns.map(c => c.label).join(',') + '\n' +
                       columns.map(c => c.required ? '(Required)' : '(Optional)').join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${entityName.toLowerCase()}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResults(null);
    }
  };

  const parseCsv = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = lines.slice(1);
    
    return dataRows.map(row => {
      const values = row.split(',').map(v => v.trim());
      const obj: any = {};
      columns.forEach((col) => {
        const index = headers.indexOf(col.label.toLowerCase());
        if (index !== -1) {
          obj[col.key] = values[index];
        }
      });
      return obj;
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setParsing(true);
    
    try {
      const text = await file.text();
      const items = parseCsv(text);
      
      if (items.length === 0) {
        alert('No data rows found in CSV');
        return;
      }

      setParsing(false);
      setUploading(true);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const resData = await response.json();
      
      if (resData.success) {
        setResults({
          success: resData.results?.success || items.length,
          failed: resData.results?.failed || 0,
          errors: resData.results?.errors || [],
        });
        if (onSuccess && (resData.results?.success > 0)) {
           // Wait a bit before revalidating
           setTimeout(onSuccess, 1000);
        }
      } else {
        throw new Error(resData.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error(err);
      setResults({ success: 0, failed: 1, errors: [err.message] });
    } finally {
      setParsing(false);
      setUploading(false);
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, zIndex: 1100, 
        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          backgroundColor: 'var(--surface-container)', 
          borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', 
          boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)', 
          width: '500px', maxWidth: '90vw' 
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '2px' }}>Upload CSV file with {entityName.toLowerCase()} details.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>

        {!results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
             <button 
              onClick={handleDownloadTemplate}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)', 
                fontSize: 'var(--text-sm)', color: 'var(--color-primary)', 
                background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600
              }}
            >
              <Download size={16} /> Download CSV Template
            </button>

            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', 
                padding: 'var(--space-10)', textAlign: 'center', cursor: 'pointer',
                transition: 'var(--transition-all)', backgroundColor: file ? 'var(--color-primary-lightest)' : 'transparent'
              }}
            >
              <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileChange} />
              <FileUp size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file ? file.name : 'Click to select or drag CSV file'}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Maximum file size: 5MB</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file || uploading || parsing}>
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={16} className="animate-spin" /> Uploading...
                  </span>
                ) : 'Start Batch Import'}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {results.failed === 0 ? <CheckCircle2 color="var(--color-success)" size={24} /> : <AlertCircle color="var(--color-warning)" size={24} />}
                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Import Complete</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ backgroundColor: 'var(--color-success-lightest)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>{results.success}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success-dark)' }}>Successfully Imported</p>
                </div>
                <div style={{ backgroundColor: 'var(--color-danger-lightest)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>{results.failed}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-dark)' }}>Failed / Skipped</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Errors encountered:</p>
                  {results.errors.slice(0, 5).map((err, i) => (
                    <p key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: '2px' }}>• {err}</p>
                  ))}
                  {results.errors.length > 5 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>+ {results.errors.length - 5} more errors...</p>}
                </div>
              )}
            </Card>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>Finish</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
