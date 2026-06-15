'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import PageLayout from '@/components/layout/PageLayout';
import TransfersTable from '@/components/transfers/TransfersTable';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import { TransferStatus } from '@/types/shared';
import type { StockTransfer } from '@/types/transfer';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: TransferStatus.DRAFT, label: 'Draft' },
  { value: TransferStatus.IN_TRANSIT, label: 'In Transit' },
  { value: TransferStatus.RECEIVED, label: 'Received' },
  { value: TransferStatus.CANCELLED, label: 'Cancelled' },
];

export default function TransfersPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/transfers');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TransferStatus | undefined>(undefined);

  const handleStatusChange = (value: string) => {
    setStatus(value ? (value as TransferStatus) : undefined);
    setPage(1);
  };

  return (
    <PageLayout
      title="Stock Transfers"
      description="Move inventory between stores"
      action={
        <div className="flex items-center gap-3">
          <Select
            value={status ?? ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-48"
          />
          {canManage && (
            <Button onClick={() => router.push('/transfers/new')}>
              <Plus size={16} />
              New Transfer
            </Button>
          )}
        </div>
      }
    >
      <TransfersTable
        page={page}
        status={status}
        onPageChange={setPage}
        onRowClick={(t: StockTransfer) => router.push(`/transfers/${t.id}`)}
      />
    </PageLayout>
  );
}
