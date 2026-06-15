'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PageLayout from '@/components/layout/PageLayout';
import OrdersTable from '@/components/orders/OrdersTable';
import { OrderStatus } from '@/types/shared';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [receiptInput, setReceiptInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [dateFilter, setDateFilter] = useState('');

  const trimmedReceipt = receiptInput.trim();
  const receiptNumber =
    trimmedReceipt && /^\d+$/.test(trimmedReceipt)
      ? Number(trimmedReceipt)
      : undefined;

  return (
    <PageLayout title="Orders" description="View and manage all orders">
      <div className="flex flex-col section-gap">
        <div className="glass-panel p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(9rem,0.7fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)]">
            <div className="flex flex-col gap-2">
              <label htmlFor="order-search" className="text-xs font-semibold text-[var(--text-secondary)]">
                Search
              </label>
              <Input
                placeholder="Order ID or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
                id="order-search"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="order-receipt-filter" className="text-xs font-semibold text-[var(--text-secondary)]">
                Receipt #
              </label>
              <Input
                id="order-receipt-filter"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1042"
                value={receiptInput}
                onChange={(e) => {
                  setReceiptInput(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              id="order-status-filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: OrderStatus.PENDING, label: 'Pending' },
                { value: OrderStatus.COMPLETED, label: 'Completed' },
                { value: OrderStatus.ON_HOLD, label: 'On Hold' },
                { value: OrderStatus.REFUNDED, label: 'Refunded' },
                { value: OrderStatus.PARTIALLY_REFUNDED, label: 'Partially Refunded' },
                { value: OrderStatus.CANCELLED, label: 'Cancelled' },
              ]}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="order-date-filter" className="text-xs font-semibold text-[var(--text-secondary)]">
                Date
              </label>
              <input
                id="order-date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
              />
            </div>
          </div>
        </div>

        <OrdersTable
          page={page}
          search={search}
          receiptNumber={receiptNumber}
          statusFilter={statusFilter}
          dateFilter={dateFilter}
          onPageChange={setPage}
        />
      </div>
    </PageLayout>
  );
}
