'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useOrdersQuery } from '@/hooks/orders/useOrdersQuery';
import { getPaymentMethodVariant } from '@/lib/badge-helpers';
import { format } from '@/lib/money';
import { OrderStatus } from '@/types/shared';
import type { Order } from '@/types/order';

interface OrdersTableProps {
  page: number;
  pageSize?: number;
  search: string;
  receiptNumber?: number;
  statusFilter: 'all' | OrderStatus;
  dateFilter: string;
  onPageChange: (page: number) => void;
}

export default function OrdersTable({
  page,
  pageSize = 10,
  search,
  receiptNumber,
  statusFilter,
  dateFilter,
  onPageChange,
}: OrdersTableProps) {
  const { data: orders, meta, isLoading, error, refetch } = useOrdersQuery({
    page,
    pageSize,
    receiptNumber,
  });

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const normalizedSearch = search.trim().toLowerCase();
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
      const matchesSearch =
        !normalizedSearch ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        (order.customer?.fullName ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDate = !dateFilter || orderDate === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, dateFilter]);

  const columns: Column<Order>[] = [
    {
      key: 'receipt',
      header: 'Receipt #',
      render: (order) => (
        <span className="font-mono text-xs font-bold text-slate-600">
          {order.receiptNumber ?? `#${order.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (order) => (
        <span className="font-medium text-slate-500">
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <span className="text-slate-500 font-medium">{order.customer?.fullName ?? '-'}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order) => (
        <span className="font-black text-[var(--accent)]">
          {format(order.currency ?? 'PKR', order.grandTotal)}
        </span>
      ),
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (order) => (
        <span className="font-semibold text-emerald-600">
          {format(order.currency ?? 'PKR', order.amountPaid)}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => (
        <Badge variant={getPaymentMethodVariant(order.paymentMethod)}>
          {order.paymentMethod.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge kind="order" status={order.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (order) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Link href={`/orders/${order.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 !p-0"
              title="View order"
              aria-label="View order"
            >
              <Eye size={14} className="text-slate-400 hover:text-slate-700" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error ? 'Failed to load orders' : null}
        onRetry={() => void refetch()}
        rowKey={(order) => order.id}
        empty="No orders match the current filters."
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
