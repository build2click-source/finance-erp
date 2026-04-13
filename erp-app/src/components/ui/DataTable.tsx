'use client';

import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, SkeletonTable } from './index';

/* ============================================================
   DATA TABLE COMPONENT
   Reusable table with search, filter, pagination
   Per PRD: no vertical borders, row-striping/hover
   ============================================================ */

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  searchable?: boolean; // marks column as searchable (defaults to true)
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  pageSize?: number;
  totalCount?: number; // Total records in DB (if server-side)
  currentPage?: number; // Current page (if server-side)
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  filters?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  onSearch,
  renderRowActions,
  emptyMessage = 'No results found.',
  loading = false,
  pageSize = 10,
  totalCount,
  currentPage: externalCurrentPage,
  onPageChange,
  onPageSizeChange,
  filters,
}: DataTableProps<T>) {
  const isServerSide = totalCount !== undefined;
  const [internalSearchQuery, setInternalSearchQuery] = React.useState('');
  const [internalCurrentPage, setInternalCurrentPage] = React.useState(1);

  const currentPage = isServerSide ? (externalCurrentPage || 1) : internalCurrentPage;
  const setCurrentPage = isServerSide ? onPageChange : setInternalCurrentPage;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isServerSide) {
      setInternalSearchQuery(val);
      setInternalCurrentPage(1);
    }
    onSearch?.(val);
  };

  const searchQuery = isServerSide ? '' : internalSearchQuery;

  // Client-side search filtering
  const filteredData = React.useMemo(() => {
    if (isServerSide) return data;
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row: any) => {
      if (!row) return false;
      // Search across all column keys + common fields
      return columns.some((col) => {
        try {
          const val = row[col.key];
          if (val == null) return false;
          if (typeof val === 'string') return val.toLowerCase().includes(query);
          if (typeof val === 'number') return val.toString().includes(query);
          // Search nested objects (e.g. row.client.name)
          if (typeof val === 'object' && val.name) return val.name.toLowerCase().includes(query);
          return false;
        } catch {
          return false;
        }
      }) ||
      // Also search common nested fields
      (row as any).name?.toLowerCase?.()?.includes?.(query) ||
      (row as any).code?.toLowerCase?.()?.includes?.(query) ||
      (row as any).description?.toLowerCase?.()?.includes?.(query) ||
      (row as any).invoiceNumber?.toLowerCase?.()?.includes?.(query) ||
      (row as any).receiptNumber?.toLowerCase?.()?.includes?.(query) ||
      (row as any).sku?.toLowerCase?.()?.includes?.(query) ||
      (row as any).client?.name?.toLowerCase?.()?.includes?.(query);
    });
  }, [isServerSide, data, searchQuery, columns]);

  // Pagination logic
  const actualTotalCount = isServerSide ? (totalCount || 0) : filteredData.length;
  const totalPages = Math.max(1, Math.ceil(actualTotalCount / pageSize));
  
  const paginatedData = React.useMemo(() => {
    if (isServerSide) return data;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [isServerSide, data, filteredData, currentPage, pageSize]);

  const goToPrev = () => setCurrentPage?.(Math.max(1, currentPage - 1));
  const goToNext = () => setCurrentPage?.(Math.min(totalPages, currentPage + 1));

  return (
    <Card padding={false}>
      {/* Toolbar */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            style={{
              display: 'flex',
              height: '36px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-container)',
              paddingLeft: '36px',
              paddingRight: '12px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        </div>

        {filters && (
          <div style={{ flex: 1, display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {filters}
          </div>
        )}

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          {filteredData.length} of {data.length} records
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: col.align || 'left',
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
              {renderRowActions && (
                <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, i) => {
                if (!row) return null;
                return (
                <tr key={i}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td style={{ textAlign: 'right' }}>{renderRowActions(row)}</td>
                  )}
                </tr>
                );
              })
            ) : loading ? (
              <tr>
                <td colSpan={columns.length + (renderRowActions ? 1 : 0)} style={{ padding: 'var(--space-6)' }}>
                  <SkeletonTable rows={5} />
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  style={{
                    padding: 'var(--space-10)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span>
            {isServerSide 
              ? `Page ${currentPage} of ${totalPages}`
              : `Showing ${Math.min((currentPage - 1) * pageSize + 1, actualTotalCount)}–${Math.min(currentPage * pageSize, actualTotalCount)} of ${actualTotalCount}`
            }
          </span>
          {isServerSide && onPageSizeChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Show:</span>
              <select 
                value={pageSize} 
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                style={{
                  padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--surface-container)', color: 'var(--text-primary)',
                  fontSize: '11px', outline: 'none'
                }}
              >
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }} onClick={goToPrev} disabled={currentPage <= 1 || loading}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <span style={{ padding: '0 8px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {currentPage} / {totalPages}
          </span>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }} onClick={goToNext} disabled={currentPage >= totalPages || loading}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
