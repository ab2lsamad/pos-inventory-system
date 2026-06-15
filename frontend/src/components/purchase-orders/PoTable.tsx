'use client';

import { Eye, ShoppingCart } from 'lucide-react';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import StatusBadge from '@/components/ui/StatusBadge';
import { usePoList } from '@/hooks/purchase-orders/usePoList';
import { format } from '@/lib/money';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchase-order';

interface PoTableProps {
  page: number;
  pageSize?: number;
  status?: PurchaseOrderStatus;
  onPageChange: (page: number) => void;
  onRowClick: (po: PurchaseOrder) => void;
}

export default function PoTable({
  page,
  pageSize = 10,
  status,
  onPageChange,
  onRowClick,
}: PoTableProps) {
  const { data: orders, meta, isLoading, error, refetch } = usePoList({
    page,
    pageSize,
    status,
  });

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO #',
      render: (po) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100/50 group-hover:scale-105 transition-transform">
            <ShoppingCart size={16} />
          </div>
          <span className="font-semibold text-[var(--text-primary)] font-mono">
            {po.poNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (po) => <span className="text-slate-600">{po.supplier.name}</span>,
    },
    {
      key: 'store',
      header: 'Store',
      render: (po) => (
        <span className="text-slate-500">
          {po.store.name}
          <span className="ml-1 text-xs text-slate-400">({po.store.code})</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => <StatusBadge kind="purchaseOrder" status={po.status} />,
    },
    {
      key: 'items',
      header: 'Lines',
      render: (po) => (
        <span className="text-slate-500">{po.items.length} item{po.items.length !== 1 ? 's' : ''}</span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Total',
      render: (po) => (
        <span className="font-semibold text-slate-700">
          {format(po.currency, po.grandTotal)}
        </span>
      ),
    },
    {
      key: 'expectedAt',
      header: 'Expected',
      render: (po) => (
        <span className="text-slate-500">
          {po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (po) => (
        <span className="text-slate-500">
          {new Date(po.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (po) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onRowClick(po);
            }}
            className="h-8 w-8 !p-0"
            title="View purchase order"
            aria-label="View purchase order"
          >
            <Eye size={14} className="text-slate-400 hover:text-slate-700" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={orders}
        loading={isLoading}
        error={error ? 'Failed to load purchase orders' : null}
        onRetry={() => void refetch()}
        rowKey={(po) => po.id}
        empty="No purchase orders found."
        onRowClick={onRowClick}
        rowClassName={() => 'cursor-pointer'}
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={orders?.length ?? 0}
        onPageChange={onPageChange}
      />
    </div>
  );
}
