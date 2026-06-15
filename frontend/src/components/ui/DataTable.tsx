'use client';

import React from 'react';
import Button from './Button';
import TableSkeleton from './TableSkeleton';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  rowKey,
  empty,
  skeletonRows = 5,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const colCount = columns.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  col.headerClassName ??
                  'text-left p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]'
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <TableSkeleton cols={colCount} rows={skeletonRows} />
          ) : error ? (
            <tr className="bg-white">
              <td colSpan={colCount} className="p-8 text-center">
                <p className="font-semibold text-rose-600">{error}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Check your access and API connection, then try again.
                </p>
                {onRetry ? (
                  <div className="mt-4 flex justify-center">
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                      Retry
                    </Button>
                  </div>
                ) : null}
              </td>
            </tr>
          ) : !data || data.length === 0 ? (
            <tr className="bg-white">
              <td
                colSpan={colCount}
                className="p-8 text-center text-sm font-medium text-slate-500"
              >
                {empty ?? 'No results found.'}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group bg-white hover:bg-slate-50/50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className ?? 'p-5'}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
