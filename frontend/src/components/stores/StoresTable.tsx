'use client';

import { Archive, Edit, Store as StoreIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useStoresQuery } from '@/hooks/stores/useStoresQuery';
import { useArchiveStore } from '@/hooks/stores/useArchiveStore';
import type { Store } from '@/types/store';

interface StoresTableProps {
  page: number;
  pageSize?: number;
  includeArchived?: boolean;
  onPageChange: (page: number) => void;
  onEdit: (store: Store) => void;
}

export default function StoresTable({
  page,
  pageSize = 10,
  includeArchived = false,
  onPageChange,
  onEdit,
}: StoresTableProps) {
  const { data: stores, meta, isLoading, error, refetch } = useStoresQuery({
    page,
    pageSize,
    includeArchived,
  });
  const archiveStore = useArchiveStore();

  const handleArchive = async (store: Store) => {
    try {
      await archiveStore.mutateAsync(store.id);
      toast.success(`"${store.name}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const columns: Column<Store>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (store) => (
        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {store.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Store',
      render: (store) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100/50 group-hover:scale-105 transition-transform">
            <StoreIcon size={16} />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">{store.name}</span>
        </div>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (store) => (
        <span className="font-mono text-sm font-medium text-slate-600">{store.currency}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (store) => (
        <Badge variant={store.isActive ? 'success' : 'warning'}>
          {store.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'receiptCounter',
      header: 'Receipt #',
      render: (store) => (
        <span className="font-mono text-sm text-slate-500">{store.receiptCounter}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (store) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onEdit(store)} className="h-8 w-8 !p-0" title="Edit" aria-label="Edit">
            <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
          </Button>
          {store.isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleArchive(store)}
              className="h-8 w-8 !p-0"
              disabled={archiveStore.isPending}
              title="Archive"
              aria-label="Archive"
            >
              <Archive size={14} className="text-slate-400 hover:text-rose-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={stores}
        loading={isLoading}
        error={error ? 'Failed to load stores' : null}
        onRetry={() => void refetch()}
        rowKey={(store) => store.id}
        empty="No stores found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={stores.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
