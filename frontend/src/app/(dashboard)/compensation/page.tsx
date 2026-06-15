'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import { useStoresQuery } from '@/hooks/stores/useStoresQuery';
import { useCompensationSummaryQuery } from '@/hooks/compensation/useCompensationSummaryQuery';
import CompensationSummary from '@/components/compensation/CompensationSummary';

function getMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const toInput = (v: Date) => v.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}

export default function CompensationPage() {
  const router = useRouter();
  const monthBounds = useMemo(() => getMonthBounds(), []);
  const [storeId, setStoreId] = useState('');
  const [periodStart, setPeriodStart] = useState(monthBounds.start);
  const [periodEnd, setPeriodEnd] = useState(monthBounds.end);

  const { data: stores } = useStoresQuery({ page: 1, pageSize: 100 });

  const summaryQuery = useCompensationSummaryQuery({
    periodStart,
    periodEnd,
    storeId: storeId || undefined,
  });
  const summary = summaryQuery.data ?? null;
  const loading = summaryQuery.isLoading || summaryQuery.isFetching;

  const handleRefresh = () => {
    if (!periodStart || !periodEnd) {
      toast.error('Select both period start and end dates');
      return;
    }
    void summaryQuery.refetch();
  };

  const openDetail = (userId: string) => {
    const params = new URLSearchParams({ periodStart, periodEnd });
    if (storeId) params.set('storeId', storeId);
    router.push(`/compensation/${userId}?${params.toString()}`);
  };

  return (
    <PageLayout
      title="Compensation"
      description="Review live salary and commission totals, inspect the counted transactions, and save payout snapshots for payroll audit."
      action={
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Period Start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <Input label="Period End" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          <Select
            label="Store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            options={[
              { value: '', label: 'All stores' },
              ...stores.map((store) => ({ value: store.id, label: store.name })),
            ]}
          />
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      }
    >
      <div className="flex flex-col section-gap">
        <CompensationSummary summary={summary} loading={loading} onViewEmployee={openDetail} />
      </div>
    </PageLayout>
  );
}
