'use client';

import { ArrowRightLeft, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import StatusBadge from '@/components/ui/StatusBadge';
import { useTransferList } from '@/hooks/transfers/useTransferList';
import type { StockTransfer, TransferStatus } from '@/types/transfer';

interface TransfersTableProps {
  page: number;
  pageSize?: number;
  status?: TransferStatus;
  onPageChange: (page: number) => void;
  onRowClick: (transfer: StockTransfer) => void;
}

export default function TransfersTable({
  page,
  pageSize = 10,
  status,
  onPageChange,
  onRowClick,
}: TransfersTableProps) {
  const { data: transfers, meta, isLoading, error, refetch } = useTransferList({
    page,
    pageSize,
    status,
  });

  const columns: Column<StockTransfer>[] = [
    {
      key: 'transferNumber',
      header: 'Transfer #',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100/50 group-hover:scale-105 transition-transform">
            <ArrowRightLeft size={16} />
          </div>
          <span className="font-semibold text-[var(--text-primary)] font-mono">
            {t.transferNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'fromStore',
      header: 'From',
      render: (t) => (
        <span className="text-slate-600">
          {t.fromStore.name}
          <span className="ml-1 text-xs text-slate-400">({t.fromStore.code})</span>
        </span>
      ),
    },
    {
      key: 'toStore',
      header: 'To',
      render: (t) => (
        <span className="text-slate-600">
          {t.toStore.name}
          <span className="ml-1 text-xs text-slate-400">({t.toStore.code})</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge kind="transfer" status={t.status} />,
    },
    {
      key: 'items',
      header: 'Lines',
      render: (t) => (
        <span className="text-slate-500">
          {t.items.length} item{t.items.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'shippedAt',
      header: 'Shipped',
      render: (t) => (
        <span className="text-slate-500">
          {t.shippedAt ? new Date(t.shippedAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (t) => (
        <span className="text-slate-500">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onRowClick(t);
            }}
            className="h-8 w-8 !p-0"
            title="View transfer"
            aria-label="View transfer"
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
        data={transfers}
        loading={isLoading}
        error={error ? 'Failed to load transfers' : null}
        onRetry={() => void refetch()}
        rowKey={(t) => t.id}
        empty="No stock transfers found."
        onRowClick={onRowClick}
        rowClassName={() => 'cursor-pointer'}
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={transfers?.length ?? 0}
        onPageChange={onPageChange}
      />
    </div>
  );
}
