'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { useOrderQuery } from '@/hooks/orders/useOrderQuery';
import PageLayout from '@/components/layout/PageLayout';
import ReceiptPrint from '@/components/orders/ReceiptPrint';
import Button from '@/components/ui/Button';
import { printReceipt } from '@/lib/print-receipt';
import { orderToReceiptSnapshot } from '@/lib/order-receipt-snapshot';

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrderQuery(id);

  const back = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => order ? router.push(`/orders/${order.id}`) : router.push('/orders')}
    >
      <ArrowLeft size={18} />
    </Button>
  );

  if (isLoading) {
    return (
      <PageLayout title="Receipt" back={back}>
        <div className="space-y-4">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="Receipt" back={back}>
        <div className="py-20 text-center">
          <p className="text-[var(--text-muted)]">Order not found</p>
        </div>
      </PageLayout>
    );
  }

  const snapshot = orderToReceiptSnapshot(order);
  const title = order.receiptNumber
    ? `Receipt #${order.receiptNumber}`
    : `Order #${order.id.slice(0, 8)}`;

  return (
    <PageLayout
      title={title}
      back={back}
      action={
        <Button onClick={() => printReceipt(snapshot)} className="rounded-xl">
          <Printer size={16} />
          Print
        </Button>
      }
    >
      <ReceiptPrint order={order} />
    </PageLayout>
  );
}
