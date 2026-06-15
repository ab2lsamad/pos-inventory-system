'use client';

import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import type { EmployeeCompensationPayout } from '@/types/compensation';
import { PayoutStatus } from '@/types/shared';
import { useUpdatePayout } from '@/hooks/compensation/useUpdatePayout';
import toast from 'react-hot-toast';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatPercent(value: number) {
  return `${(Number(value) || 0).toFixed(2)}%`;
}

const STATUS_ORDER = [PayoutStatus.DRAFT, PayoutStatus.APPROVED, PayoutStatus.PAID];

interface TimelineStepProps {
  label: string;
  date?: string | null;
  active: boolean;
  cancelled?: boolean;
}

function TimelineStep({ label, date, active, cancelled }: TimelineStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {cancelled ? (
          <XCircle size={18} className="text-red-400" />
        ) : active ? (
          <CheckCircle size={18} className="text-emerald-500" />
        ) : (
          <Clock size={18} className="text-slate-300" />
        )}
      </div>
      <div>
        <p className={`text-sm font-semibold ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-[var(--text-muted)]">{new Date(date).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

interface PayoutDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payout: EmployeeCompensationPayout | null;
}

export default function PayoutDetailDrawer({ isOpen, onClose, payout }: PayoutDetailDrawerProps) {
  const updatePayout = useUpdatePayout();

  if (!payout) return null;

  const isCancelled = payout.status === PayoutStatus.CANCELLED;
  const isTerminal = payout.status === PayoutStatus.PAID || isCancelled;

  async function transition(next: PayoutStatus) {
    if (!payout) return;
    try {
      await updatePayout.mutateAsync({ id: payout.id, status: next });
      toast.success(`Payout marked as ${next.toLowerCase()}`);
      onClose();
    } catch {
      // error toast handled by hook
    }
  }

  const currentStep = STATUS_ORDER.indexOf(payout.status as PayoutStatus);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payout Details" maxWidth="max-w-lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {new Date(payout.periodStart).toLocaleDateString()} –{' '}
            {new Date(payout.periodEnd).toLocaleDateString()}
          </p>
          <StatusBadge kind="payout" status={payout.status} />
        </div>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] border border-[var(--border-glass)] bg-white/80 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Base Salary</p>
            <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {formatCurrency(payout.baseSalaryAmount)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border-glass)] bg-white/80 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Commission</p>
            <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {formatCurrency(payout.commissionAmount)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatPercent(payout.commissionPercentSnapshot)} of{' '}
              {formatCurrency(payout.commissionableSalesAmount)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border-glass)] bg-white/80 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Adjustment</p>
            <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {formatCurrency(payout.adjustmentAmount)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border-glass)] bg-[var(--accent)]/5 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Total Payable</p>
            <p className="mt-2 text-lg font-black text-[var(--accent)]">
              {formatCurrency(payout.totalPayableAmount)}
            </p>
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Status Timeline
          </p>
          <div className="space-y-3">
            {isCancelled ? (
              <>
                <TimelineStep label="Created" date={payout.createdAt} active cancelled={false} />
                <TimelineStep label="Cancelled" active cancelled />
              </>
            ) : (
              STATUS_ORDER.map((step, idx) => (
                <TimelineStep
                  key={step}
                  label={step.charAt(0) + step.slice(1).toLowerCase()}
                  date={
                    idx === 0
                      ? payout.createdAt
                      : idx === 2 && payout.paidAt
                        ? payout.paidAt
                        : undefined
                  }
                  active={idx <= currentStep}
                />
              ))
            )}
          </div>
        </section>

        {payout.notes && (
          <section>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Notes</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{payout.notes}</p>
          </section>
        )}

        {payout.generatedBy?.email && (
          <p className="text-xs text-[var(--text-muted)]">
            Saved by {payout.generatedBy.email} on {new Date(payout.createdAt).toLocaleString()}
          </p>
        )}

        {!isTerminal && (
          <div className="flex gap-2 pt-2">
            {payout.status === PayoutStatus.DRAFT && (
              <Button
                variant="secondary"
                className="flex-1"
                isLoading={updatePayout.isPending}
                onClick={() => transition(PayoutStatus.APPROVED)}
              >
                Approve
              </Button>
            )}
            {payout.status === PayoutStatus.APPROVED && (
              <Button
                className="flex-1"
                isLoading={updatePayout.isPending}
                onClick={() => transition(PayoutStatus.PAID)}
              >
                Mark Paid
              </Button>
            )}
            <Button
              variant="danger"
              className="flex-1"
              isLoading={updatePayout.isPending}
              onClick={() => transition(PayoutStatus.CANCELLED)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
