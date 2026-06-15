'use client';

import { useMemo } from 'react';
import { Building2, Edit, ExternalLink } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useSuppliersQuery } from '@/hooks/suppliers/useSuppliersQuery';
import type { Supplier } from '@/types/supplier';

interface SuppliersTableProps {
  page: number;
  pageSize?: number;
  search: string;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEdit: (supplier: Supplier) => void;
  onViewProducts: (supplier: Supplier) => void;
}

export default function SuppliersTable({
  page,
  pageSize = 10,
  search,
  canManage,
  onPageChange,
  onEdit,
  onViewProducts,
}: SuppliersTableProps) {
  const { data: suppliers, meta, isLoading, error, refetch } = useSuppliersQuery({
    page,
    pageSize,
    search: search || undefined,
  });

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100/50 group-hover:scale-105 transition-transform">
            <Building2 size={16} />
          </div>
          <div>
            <span className="font-semibold text-[var(--text-primary)] block">{supplier.name}</span>
            {supplier.taxId && (
              <span className="text-xs text-slate-400">NTN: {supplier.taxId}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact',
      render: (supplier) => (
        <span className="text-slate-500">{supplier.contactPerson || '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (supplier) => (
        <span className="text-slate-500">{supplier.phone || '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (supplier) => (
        <span className="text-slate-500">{supplier.email || '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (supplier) => (
        <Badge variant={supplier.isActive ? 'success' : 'warning'}>
          {supplier.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (supplier) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewProducts(supplier)}
              className="h-8 w-8 !p-0"
              title="Manage linked products"
            >
              <ExternalLink size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(supplier)}
              className="h-8 w-8 !p-0"
              title="Edit"
              aria-label="Edit"
            >
              <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error ? 'Failed to load suppliers' : null}
        onRetry={() => void refetch()}
        rowKey={(supplier) => supplier.id}
        empty="No suppliers found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={filtered.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
