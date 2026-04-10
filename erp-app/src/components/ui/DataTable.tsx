'use client';

import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button } from './index';

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
  filters,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // reset to page 1 on search
    onSearch?.(e.target.value);
  };

  // Client-side search filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row: any) => {
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
  }, [data, searchQuery, columns]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIdx, startIdx + pageSize);

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

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
              paginatedData.map((row, i) => (
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
              ))
            ) : loading ? (
              <tr>
                <td colSpan={columns.length + (renderRowActions ? 1 : 0)} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading data...
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
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{startIdx + 1}–{Math.min(startIdx + pageSize, filteredData.length)}</strong> of {filteredData.length} results
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }} onClick={goToPrev} disabled={safeCurrentPage <= 1}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <span style={{ padding: '0 8px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {safeCurrentPage} / {totalPages}
          </span>
          <Button variant="secondary" size="sm" style={{ padding: '4px 10px', height: '28px' }} onClick={goToNext} disabled={safeCurrentPage >= totalPages}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
