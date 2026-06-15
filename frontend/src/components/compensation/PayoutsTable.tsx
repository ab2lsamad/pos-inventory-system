'use client';

import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import type { EmployeeCompensationPayout } from '@/types/compensation';
import { PayoutStatus } from '@/types/shared';
import { useUpdatePayout } from '@/hooks/compensation/useUpdatePayout';
import toast from 'react-hot-toast';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface PayoutsTableProps {
  payouts: EmployeeCompensationPayout[];
  onViewDetail: (payout: EmployeeCompensationPayout) => void;
}

export default function PayoutsTable({ payouts, onViewDetail }: PayoutsTableProps) {
  const updatePayout = useUpdatePayout();

  async function transition(payout: EmployeeCompensationPayout, next: PayoutStatus) {
    try {
      await updatePayout.mutateAsync({ id: payout.id, status: next });
      toast.success(`Payout marked as ${next.toLowerCase()}`);
    } catch {
      // error toast handled by hook
    }
  }

  if (payouts.length === 0) {
    return (
      <p className="py-4 text-sm text-[var(--text-secondary)]">
        No payout snapshots saved yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            {['Period', 'Base Salary', 'Commission', 'Total', 'Status', 'Saved'].map((h) => (
              <th
                key={h}
                className="p-4 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                {h}
              </th>
            ))}
            <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payouts.map((payout) => {
            const isTerminal =
              payout.status === PayoutStatus.PAID ||
              payout.status === PayoutStatus.CANCELLED;

            return (
              <tr key={payout.id} className="bg-white transition-colors hover:bg-slate-50/60">
                <td className="p-4">
                  <p className="font-medium text-[var(--text-primary)]">
                    {new Date(payout.periodStart).toLocaleDateString()} –{' '}
                    {new Date(payout.periodEnd).toLocaleDateString()}
                  </p>
                </td>
                <td className="p-4 text-slate-600">
                  {formatCurrency(payout.baseSalaryAmount)}
                </td>
                <td className="p-4 text-slate-600">
                  {formatCurrency(payout.commissionAmount)}
                </td>
                <td className="p-4 font-bold text-[var(--accent)]">
                  {formatCurrency(payout.totalPayableAmount)}
                </td>
                <td className="p-4">
                  <StatusBadge kind="payout" status={payout.status} />
                </td>
                <td className="p-4 text-xs text-[var(--text-muted)]">
                  {new Date(payout.createdAt).toLocaleString()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewDetail(payout)}
                    >
                      Details
                    </Button>
                    {payout.status === PayoutStatus.DRAFT && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={updatePayout.isPending}
                        onClick={() => transition(payout, PayoutStatus.APPROVED)}
                      >
                        Approve
                      </Button>
                    )}
                    {payout.status === PayoutStatus.APPROVED && (
                      <Button
                        size="sm"
                        isLoading={updatePayout.isPending}
                        onClick={() => transition(payout, PayoutStatus.PAID)}
                      >
                        Mark Paid
                      </Button>
                    )}
                    {!isTerminal && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={updatePayout.isPending}
                        onClick={() => transition(payout, PayoutStatus.CANCELLED)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
