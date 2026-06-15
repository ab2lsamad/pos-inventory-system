'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import TransferDetail from '@/components/transfers/TransferDetail';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { useTransferById } from '@/hooks/transfers/useTransferById';

interface TransferDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TransferDetailPage({ params }: TransferDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: transfer, isLoading, error } = useTransferById(id);

  const back = (
    <Button variant="ghost" size="icon" onClick={() => router.back()}>
      <ArrowLeft size={18} />
    </Button>
  );

  if (isLoading) {
    return (
      <PageLayout title="Stock Transfer" back={back}>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error || !transfer) {
    return (
      <PageLayout title="Stock Transfer" back={back}>
        <div className="flex items-center justify-center py-20 text-slate-400">
          Transfer not found.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={transfer.transferNumber}
      description={`Created ${new Date(transfer.createdAt).toLocaleDateString()} by ${transfer.createdBy.fullName}`}
      back={back}
      badge={<StatusBadge kind="transfer" status={transfer.status} />}
    >
      <TransferDetail transfer={transfer} />
    </PageLayout>
  );
}
