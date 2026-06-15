'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import PoDetail from '@/components/purchase-orders/PoDetail';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { usePoById } from '@/hooks/purchase-orders/usePoById';

interface PoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PurchaseOrderDetailPage({ params }: PoDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: po, isLoading, error } = usePoById(id);

  const back = (
    <Button variant="ghost" size="icon" onClick={() => router.back()}>
      <ArrowLeft size={18} />
    </Button>
  );

  if (isLoading) {
    return (
      <PageLayout title="Purchase Order" back={back}>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error || !po) {
    return (
      <PageLayout title="Purchase Order" back={back}>
        <div className="flex items-center justify-center py-20 text-slate-400">
          Purchase order not found.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={po.poNumber}
      description={`Created ${new Date(po.createdAt).toLocaleDateString()} by ${po.createdBy.fullName}`}
      back={back}
      badge={<StatusBadge kind="purchaseOrder" status={po.status} />}
    >
      <PoDetail po={po} />
    </PageLayout>
  );
}
