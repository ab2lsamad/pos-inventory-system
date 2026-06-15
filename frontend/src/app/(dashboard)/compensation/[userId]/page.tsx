'use client';

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import Button from '@/components/ui/Button';
import EmployeeCompensationView from '@/components/compensation/EmployeeCompensationView';
import { useEmployeeCompensationQuery } from '@/hooks/compensation/useEmployeeCompensationQuery';

function getMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const toInput = (v: Date) => v.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}

export default function EmployeeCompensationPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const userId = params.userId;

  const monthBounds = useMemo(() => getMonthBounds(), []);
  const periodStart = searchParams.get('periodStart') || monthBounds.start;
  const periodEnd = searchParams.get('periodEnd') || monthBounds.end;
  const storeId = searchParams.get('storeId') || undefined;

  const formattedPeriod = useMemo(() => {
    const fmt = (d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
  }, [periodStart, periodEnd]);

  const employeeQuery = useEmployeeCompensationQuery({
    userId,
    periodStart,
    periodEnd,
    storeId,
  });
  const employee = employeeQuery.data ?? null;
  const loading = employeeQuery.isLoading || employeeQuery.isFetching;

  return (
    <PageLayout
      title={employee ? employee.employee.email : 'Employee Compensation'}
      description={`Period: ${formattedPeriod} · Review orders and adjustments counted for this payroll period and save a payout snapshot.`}
      back={
        <Button variant="ghost" size="icon" onClick={() => router.push('/compensation')}>
          <ArrowLeft size={18} />
        </Button>
      }
    >
      <EmployeeCompensationView
        employee={employee}
        loading={loading}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </PageLayout>
  );
}
