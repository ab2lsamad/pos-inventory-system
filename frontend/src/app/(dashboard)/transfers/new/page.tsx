'use client';

import PageLayout from '@/components/layout/PageLayout';
import TransferForm from '@/components/transfers/TransferForm';

export default function NewTransferPage() {
  return (
    <PageLayout
      title="New Stock Transfer"
      description="Create a draft transfer between stores"
    >
      <TransferForm />
    </PageLayout>
  );
}
