'use client';

import PageLayout from '@/components/layout/PageLayout';
import ReportsView from '@/components/reports/ReportsView';

export default function ReportsPage() {
  return (
    <PageLayout
      title="Reports"
      description="Sales, refunds, stock and tax reports across all stores. Pick a report and date range, then print."
    >
      <ReportsView />
    </PageLayout>
  );
}
