'use client';

import { useMemo } from 'react';
import { Archive, Edit, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useBrandsQuery } from '@/hooks/brands/useBrandsQuery';
import { useArchiveBrand } from '@/hooks/brands/useArchiveBrand';
import type { Brand } from '@/types/brand';

interface BrandsTableProps {
  page: number;
  pageSize?: number;
  search: string;
  includeArchived?: boolean;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEdit: (brand: Brand) => void;
}

export default function BrandsTable({
  page,
  pageSize = 10,
  search,
  includeArchived = false,
  canManage,
  onPageChange,
  onEdit,
}: BrandsTableProps) {
  const { data: brands, meta, isLoading, error, refetch } = useBrandsQuery({
    page,
    pageSize,
    includeArchived,
  });
  const archiveBrand = useArchiveBrand();

  const handleArchive = async (brand: Brand) => {
    try {
      await archiveBrand.mutateAsync(brand.id);
      toast.success(`"${brand.name}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const filtered = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q),
    );
  }, [brands, search]);

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      header: 'Brand',
      render: (brand) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-violet-50 flex items-center justify-center text-violet-500 border border-violet-100/50 group-hover:scale-105 transition-transform">
            <Tag size={16} />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">{brand.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (brand) => (
        <span className="text-slate-500">{brand.description || '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (brand) => (
        <Badge variant={brand.isActive ? 'success' : 'warning'}>
          {brand.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (brand) => (
        <span className="text-slate-500 font-medium">
          {new Date(brand.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (brand) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(brand)}
              className="h-8 w-8 !p-0"
              title="Edit"
              aria-label="Edit"
            >
              <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
            {brand.isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleArchive(brand)}
                className="h-8 w-8 !p-0"
                disabled={archiveBrand.isPending}
                title="Archive"
                aria-label="Archive"
              >
                <Archive size={14} className="text-slate-400 hover:text-rose-500" />
              </Button>
            )}
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
        error={error ? 'Failed to load brands' : null}
        onRetry={() => void refetch()}
        rowKey={(brand) => brand.id}
        empty="No brands found."
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
