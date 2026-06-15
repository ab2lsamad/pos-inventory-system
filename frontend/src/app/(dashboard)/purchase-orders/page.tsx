'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import PageLayout from '@/components/layout/PageLayout';
import PoTable from '@/components/purchase-orders/PoTable';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import { PurchaseOrderStatus } from '@/types/shared';
import type { PurchaseOrder } from '@/types/purchase-order';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: PurchaseOrderStatus.DRAFT, label: 'Draft' },
  { value: PurchaseOrderStatus.ORDERED, label: 'Ordered' },
  { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Partially Received' },
  { value: PurchaseOrderStatus.RECEIVED, label: 'Received' },
  { value: PurchaseOrderStatus.CANCELLED, label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/purchase-orders');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>(undefined);

  const handleStatusChange = (value: string) => {
    setStatus(value ? (value as PurchaseOrderStatus) : undefined);
    setPage(1);
  };

  return (
    <PageLayout
      title="Purchase Orders"
      description="Manage supplier purchase orders and stock receiving"
      action={
        <div className="flex items-center gap-3">
          <Select
            value={status ?? ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-48"
          />
          {canManage && (
            <Button onClick={() => router.push('/purchase-orders/new')}>
              <Plus size={16} />
              New PO
            </Button>
          )}
        </div>
      }
    >
      <PoTable
        page={page}
        status={status}
        onPageChange={setPage}
        onRowClick={(po: PurchaseOrder) => router.push(`/purchase-orders/${po.id}`)}
      />
    </PageLayout>
  );
}
