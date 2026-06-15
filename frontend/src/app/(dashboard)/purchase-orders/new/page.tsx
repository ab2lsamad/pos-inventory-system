'use client';

import PageLayout from '@/components/layout/PageLayout';
import PoForm from '@/components/purchase-orders/PoForm';

export default function NewPurchaseOrderPage() {
  return (
    <PageLayout
      title="New Purchase Order"
      description="Create a draft purchase order for a supplier"
    >
      <PoForm />
    </PageLayout>
  );
}
