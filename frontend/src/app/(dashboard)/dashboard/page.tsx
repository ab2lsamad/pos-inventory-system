'use client';

import PageLayout from '@/components/layout/PageLayout';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';

export default function DashboardPage() {
  return (
    <PageLayout
      title="Dashboard"
      description="Today's store activity, inventory pressure, and recent transactions."
    >
      <DashboardMetrics />
    </PageLayout>
  );
}
