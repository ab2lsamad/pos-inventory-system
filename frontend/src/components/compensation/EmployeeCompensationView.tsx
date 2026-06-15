'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import { payoutSchema, type PayoutFormData } from '@/schemas/compensation';
import type { CompensationDetailResponse, EmployeeCompensationPayout } from '@/types/compensation';
import { useCreatePayout } from '@/hooks/compensation/useCreatePayout';
import PayoutsTable from './PayoutsTable';
import PayoutDetailDrawer from './PayoutDetailDrawer';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatPercent(value: number) {
  return `${(Number(value) || 0).toFixed(2)}%`;
}

interface EmployeeCompensationViewProps {
  employee: CompensationDetailResponse | null;
  loading: boolean;
  periodStart: string;
  periodEnd: string;
}

export default function EmployeeCompensationView({
  employee,
  loading,
  periodStart,
  periodEnd,
}: EmployeeCompensationViewProps) {
  const createPayout = useCreatePayout();
  const savingPayout = createPayout.isPending;
  const [selectedPayout, setSelectedPayout] = useState<EmployeeCompensationPayout | null>(null);

  const form = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      periodStart,
      periodEnd,
      adjustmentAmount: '0.00',
      notes: '',
    },
  });

  useEffect(() => {
    form.reset({ periodStart, periodEnd, adjustmentAmount: '0.00', notes: '' });
  }, [periodStart, periodEnd, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!employee) return;
    try {
      await createPayout.mutateAsync({
        userId: employee.userId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        adjustmentAmount: Number(values.adjustmentAmount || 0),
        notes: values.notes?.trim() || undefined,
      });
      toast.success('Payout snapshot saved');
      form.reset({ periodStart, periodEnd, adjustmentAmount: '0.00', notes: '' });
    } catch {
      // error toast handled by hook
    }
  });

  if (loading || !employee) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-[1.5rem]" />
        <div className="skeleton h-48 rounded-[1.5rem]" />
        <div className="skeleton h-48 rounded-[1.5rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Salary</p>
          <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{formatCurrency(employee.baseSalary)}</p>
        </div>
        <div className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Commission</p>
          <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
            {formatCurrency(employee.commissionAmount)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {formatPercent(employee.commissionPercent)} of {formatCurrency(employee.netCommissionableSales)}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Total Payable</p>
          <p className="mt-3 text-2xl font-black text-[var(--accent)]">
            {formatCurrency(employee.totalPayableAmount)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Orders Counted</p>
                <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                  {employee.orders.length} completed orders
                </h3>
              </div>
              <p className="text-lg font-black text-[var(--accent)]">{formatCurrency(employee.grossSales)}</p>
            </div>
            <div className="mt-4 space-y-3">
              {employee.orders.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No completed orders in this period.</p>
              ) : (
                employee.orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-muted)]/60 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">Receipt #{order.receiptNumber}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(order.createdAt).toLocaleString()} | {order.paymentMethod}
                        </p>
                      </div>
                      <p className="font-bold text-[var(--accent)]">{formatCurrency(order.grandTotal)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Adjustments Counted
                </p>
                <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                  {employee.adjustments.length} completed adjustments
                </h3>
              </div>
              <div className="text-right text-sm font-semibold text-[var(--text-secondary)]">
                <p>Refunds {formatCurrency(employee.refunds)}</p>
                <p>Additions {formatCurrency(employee.additionalCharges)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {employee.adjustments.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No adjustments in this period.</p>
              ) : (
                employee.adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-muted)]/60 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {adjustment.type.replace('_', ' ')} #{adjustment.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(adjustment.createdAt).toLocaleString()}
                        </p>
                        {adjustment.notes ? (
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{adjustment.notes}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-sm font-semibold text-[var(--text-secondary)]">
                        <p>Refund {formatCurrency(adjustment.refundAmount)}</p>
                        <p>Charge {formatCurrency(adjustment.additionalChargeAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={onSubmit}
            className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4 space-y-4"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Save Snapshot</p>
              <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Finalize this payroll period</h3>
            </div>
            <div className="space-y-1.5">
              <FormField<PayoutFormData>
                name="adjustmentAmount"
                control={form.control}
                label="Manual Adjustment"
                type="number"
                step="0.01"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Positive for bonuses/perks, negative for deductions (e.g. unpaid leave).
              </p>
            </div>
            <FormField<PayoutFormData>
              name="notes"
              control={form.control}
              label="Notes"
              placeholder="Optional payroll note"
            />
            <Button type="submit" isLoading={savingPayout} className="w-full">
              Save payout snapshot
            </Button>
          </form>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/80 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Snapshot History</p>
        <div className="mt-4">
          <PayoutsTable payouts={employee.payouts} onViewDetail={setSelectedPayout} />
        </div>
      </section>

      <PayoutDetailDrawer
        isOpen={!!selectedPayout}
        onClose={() => setSelectedPayout(null)}
        payout={selectedPayout}
      />
    </div>
  );
}
