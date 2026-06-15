'use client';

import { useState } from 'react';
import { Package, SlidersHorizontal } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useInventoryLevels } from '@/hooks/inventory/useInventoryLevels';
import ReorderModal from '@/components/inventory/ReorderModal';
import type { InventoryLevel } from '@/types/inventory';

interface LevelsTableProps {
  page: number;
  pageSize?: number;
  storeId?: string;
  search?: string;
  lowStockOnly?: boolean;
  canManage?: boolean;
  onPageChange: (page: number) => void;
}

function stockStatusBadge(level: InventoryLevel) {
  const { quantity, reorderPoint } = level;
  if (quantity <= 0) {
    return <Badge variant="danger">Out</Badge>;
  }
  if (reorderPoint > 0 && quantity <= reorderPoint) {
    return <Badge variant="warning">Low</Badge>;
  }
  return <Badge variant="success">OK</Badge>;
}

export default function LevelsTable({
  page,
  pageSize = 20,
  storeId,
  search,
  lowStockOnly,
  canManage = false,
  onPageChange,
}: LevelsTableProps) {
  const { data: levels, meta, isLoading, error, refetch } = useInventoryLevels({
    page,
    pageSize,
    storeId,
    search,
    lowStockOnly,
  });
  const [editLevel, setEditLevel] = useState<InventoryLevel | null>(null);

  const columns: Column<InventoryLevel>[] = [
    {
      key: 'store',
      header: 'Store',
      render: (level) => (
        <span className="font-medium text-[var(--text-primary)]">
          {level.store?.name ?? level.storeId}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (level) => (
        <span className="font-mono text-sm text-slate-500">
          {level.variant?.sku ?? '—'}
        </span>
      ),
    },
    {
      key: 'variant',
      header: 'Variant',
      render: (level) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-violet-50 flex items-center justify-center text-violet-500 border border-violet-100/50">
            <Package size={14} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--text-primary)] text-sm">
              {level.variant?.product?.name ?? '—'}
            </span>
            <span className="text-slate-400 text-xs">{level.variant?.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'On Hand',
      render: (level) => (
        <span className="font-semibold text-[var(--text-primary)]">{level.quantity}</span>
      ),
    },
    {
      key: 'reorderPoint',
      header: 'Reorder Point',
      render: (level) => (
        <span className="text-slate-500">
          {level.reorderPoint > 0 ? level.reorderPoint : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (level) => stockStatusBadge(level),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (level) => (
        <span className="text-slate-400 text-sm">
          {new Date(level.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (level) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditLevel(level)}
            className="h-8 w-8 !p-0"
            title="Set reorder point"
            aria-label="Set reorder point"
          >
            <SlidersHorizontal size={14} className="text-slate-400 hover:text-indigo-500" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={levels}
        loading={isLoading}
        error={error ? 'Failed to load inventory levels' : null}
        onRetry={() => void refetch()}
        rowKey={(level) => level.id}
        empty="No inventory levels found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={levels.length}
        onPageChange={onPageChange}
      />
      <ReorderModal
        isOpen={editLevel !== null}
        onClose={() => setEditLevel(null)}
        level={editLevel}
      />
    </div>
  );
}
