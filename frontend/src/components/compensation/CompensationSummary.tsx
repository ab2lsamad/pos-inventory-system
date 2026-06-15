'use client';

import { CalendarRange, Eye, ReceiptText, TrendingDown, Wallet } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { CompensationSummaryResponse } from '@/types/compensation';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

interface CompensationSummaryProps {
  summary: CompensationSummaryResponse | null;
  loading: boolean;
  onViewEmployee: (userId: string) => void;
}

export default function CompensationSummary({ summary, loading, onViewEmployee }: CompensationSummaryProps) {
  const cards = [
    {
      label: 'Payroll Total',
      value: formatCurrency(summary?.totals.totalPayableAmount ?? 0),
      hint: `${summary?.totals.employees ?? 0} employees in range`,
      icon: <Wallet size={20} />,
    },
    {
      label: 'Base Salary',
      value: formatCurrency(summary?.totals.baseSalaryAmount ?? 0),
      hint: 'Fixed salary loaded into this period',
      icon: <CalendarRange size={20} />,
    },
    {
      label: 'Commission',
      value: formatCurrency(summary?.totals.commissionAmount ?? 0),
      hint: `${summary?.totals.orderCount ?? 0} completed orders counted`,
      icon: <ReceiptText size={20} />,
    },
    {
      label: 'Refund Impact',
      value: formatCurrency(summary?.totals.refunds ?? 0),
      hint: 'Completed returns/exchanges deducted',
      icon: <TrendingDown size={20} />,
    },
  ];

  return (
    <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">{card.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">{card.value}</p>
                <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">{card.hint}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 p-3 text-[var(--accent)] border border-[var(--border-glass)]">{card.icon}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {[
                  'Employee',
                  'Store',
                  'Salary',
                  'Commission %',
                  'Orders',
                  'Net Sales',
                  'Commission',
                  'Total Payable',
                ].map((h) => (
                  <th
                    key={h}
                    className="p-5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500"
                  >
                    {h}
                  </th>
                ))}
                <th className="p-5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <tr key={index}>
                    {[...Array(9)].map((__, cellIndex) => (
                      <td key={cellIndex} className="p-5">
                        <div className="skeleton h-5 w-24 rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !summary || summary.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm font-medium text-slate-500">
                    No compensation records were found for the selected period.
                  </td>
                </tr>
              ) : (
                summary.data.map((item) => (
                  <tr key={item.userId} className="group bg-white transition-colors hover:bg-slate-50/60">
                    <td className="p-5">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{item.employee.email}</p>
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                          {item.role}
                        </p>
                      </div>
                    </td>
                    <td className="p-5 text-slate-500">{item.store?.name || 'Unassigned'}</td>
                    <td className="p-5 font-medium text-slate-600">{formatCurrency(item.baseSalary)}</td>
                    <td className="p-5 text-slate-600">{formatPercent(item.commissionPercent)}</td>
                    <td className="p-5 text-slate-600">{item.orderCount}</td>
                    <td className="p-5 font-medium text-slate-600">{formatCurrency(item.netCommissionableSales)}</td>
                    <td className="p-5 font-medium text-slate-600">{formatCurrency(item.commissionAmount)}</td>
                    <td className="p-5 font-bold text-[var(--accent)]">{formatCurrency(item.totalPayableAmount)}</td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewEmployee(item.userId)}
                          className="h-8 w-8 !p-0"
                          title="View employee"
                          aria-label="View employee"
                        >
                          <Eye size={14} className="text-slate-400 hover:text-slate-700" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
