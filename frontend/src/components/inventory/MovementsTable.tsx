'use client';

import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import StatusBadge from '@/components/ui/StatusBadge';
import { useStockMovements } from '@/hooks/inventory/useStockMovements';
import type { StockMovement } from '@/types/inventory';
import { StockMovementType } from '@/types/shared';

interface MovementsTableProps {
  page: number;
  pageSize?: number;
  storeId?: string;
  variantId?: string;
  movementType?: StockMovementType;
  onPageChange: (page: number) => void;
}

function referenceLink(movement: StockMovement) {
  if (!movement.referenceType || !movement.referenceId) return <span className="text-slate-400">—</span>;

  const label = `${movement.referenceType} ${movement.referenceId.slice(0, 8)}…`;
  let href: string | undefined;

  if (movement.referenceType === 'PurchaseOrder') {
    href = `/purchase-orders/${movement.referenceId}`;
  } else if (movement.referenceType === 'StockTransfer') {
    href = `/transfers/${movement.referenceId}`;
  } else if (movement.referenceType === 'Order') {
    href = `/orders/${movement.referenceId}`;
  }

  if (href) {
    return (
      <a href={href} className="text-indigo-500 hover:text-indigo-700 text-sm font-mono">
        {label}
      </a>
    );
  }
  return <span className="text-slate-500 text-sm font-mono">{label}</span>;
}

export default function MovementsTable({
  page,
  pageSize = 20,
  storeId,
  variantId,
  movementType,
  onPageChange,
}: MovementsTableProps) {
  const { data: movements, meta, isLoading, error, refetch } = useStockMovements({
    page,
    pageSize,
    storeId,
    variantId,
    type: movementType,
  });

  const columns: Column<StockMovement>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (m) => (
        <span className="text-slate-500 text-sm">
          {new Date(m.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (m) => (
        <span className="font-medium text-[var(--text-primary)]">
          {m.store?.name ?? m.storeId}
        </span>
      ),
    },
    {
      key: 'variant',
      header: 'Variant',
      render: (m) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--text-primary)] text-sm">
            {m.variant?.product?.name ?? '—'}
          </span>
          <span className="text-slate-400 text-xs font-mono">{m.variant?.sku}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (m) => <StatusBadge kind="stockMovement" status={m.type} />,
    },
    {
      key: 'quantity',
      header: 'Qty Change',
      render: (m) => (
        <span
          className={`font-semibold text-sm ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}
        >
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (m) => referenceLink(m),
    },
    {
      key: 'user',
      header: 'By',
      render: (m) => (
        <span className="text-slate-400 text-sm">{m.user?.fullName ?? '—'}</span>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={movements}
        loading={isLoading}
        error={error ? 'Failed to load stock movements' : null}
        onRetry={() => void refetch()}
        rowKey={(m) => m.id}
        empty="No stock movements found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={movements.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
