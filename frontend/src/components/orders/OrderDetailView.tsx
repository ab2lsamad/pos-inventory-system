'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Receipt, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { format, toNumber } from '@/lib/money';
import { useOrderQuery, useOrderReturnSummaryQuery } from '@/hooks/orders/useOrderQuery';
import { getAdjustmentTypeVariant } from '@/lib/badge-helpers';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import PageLayout from '@/components/layout/PageLayout';
import type { OrderAdjustment } from '@/types/order';

interface OrderDetailViewProps {
  orderId: string;
}

export default function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const router = useRouter();
  const { data: order, isLoading: orderLoading } = useOrderQuery(orderId);
  const { data: summary, isLoading: summaryLoading } = useOrderReturnSummaryQuery(orderId);
  const { data: adjustmentsData, isLoading: adjustmentsLoading } = useQuery<OrderAdjustment[]>({
    queryKey: ['orders', 'adjustments', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const res = await api.get<OrderAdjustment[]>(API_ENDPOINTS.orders.adjustments(orderId));
      return res.data || [];
    },
  });
  const adjustments = adjustmentsData ?? [];
  const loading = orderLoading || summaryLoading || adjustmentsLoading;
  const currency = order?.currency ?? 'PKR';

  const back = (
    <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
      <ArrowLeft size={18} />
    </Button>
  );

  if (loading) {
    return (
      <PageLayout title="Order Detail" back={back}>
        <div className="space-y-4">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout title="Order Detail" back={back}>
        <div className="py-20 text-center">
          <p className="text-[var(--text-muted)]">Order not found</p>
        </div>
      </PageLayout>
    );
  }

  const canAdjust =
    order.status !== 'CANCELLED' &&
    order.status !== 'REFUNDED';

  const title = order.receiptNumber
    ? `Receipt #${order.receiptNumber}`
    : `Order #${order.id.slice(0, 8)}`;

  return (
    <PageLayout
      title={title}
      description={new Date(order.createdAt).toLocaleString()}
      back={back}
      badge={<StatusBadge kind="order" status={order.status} />}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/orders/${order.id}/receipt`}>
            <Button variant="outline" size="sm" className="rounded-xl">
              <Printer size={16} />
              Print Receipt
            </Button>
          </Link>
          {canAdjust && (
            <Link href={`/orders/${order.id}/adjust`}>
              <Button className="rounded-xl">
                <RotateCcw size={16} />
                Process Return / Exchange
              </Button>
            </Link>
          )}
        </div>
      }
    >
    <div className="space-y-6">
      <div
        className={`grid grid-cols-2 gap-4 ${
          order.salesperson ? 'md:grid-cols-4' : 'md:grid-cols-3'
        }`}
      >
        <div className="glass-card p-5">
          <p className="mb-1 text-xs text-[var(--text-muted)]">Payment Method</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {order.paymentMethod.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="mb-1 text-xs text-[var(--text-muted)]">Cashier</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {order.cashier?.fullName ?? order.cashier?.email ?? '-'}
          </p>
        </div>
        {order.salesperson && (
          <div className="glass-card p-5">
            <p className="mb-1 text-xs text-[var(--text-muted)]">Salesperson</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {order.salesperson.fullName ?? order.salesperson.email}
            </p>
          </div>
        )}
        {order.customer ? (
          <div className="glass-card p-5">
            <p className="mb-1 text-xs text-[var(--text-muted)]">Customer</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{order.customer.fullName}</p>
            {order.customer.phone && (
              <p className="text-xs text-[var(--text-muted)]">{order.customer.phone}</p>
            )}
          </div>
        ) : (
          <div className="glass-card p-5">
            <p className="mb-1 text-xs text-[var(--text-muted)]">Adjustments</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{adjustments.length}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <p className="mb-1 text-xs text-[var(--text-muted)]">Grand Total</p>
          <p className="text-xl font-black text-[var(--accent)]">
            {format(currency, order.grandTotal)}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="mb-1 text-xs text-[var(--text-muted)]">Amount Paid</p>
          <p className="text-xl font-black text-emerald-600">
            {format(currency, order.amountPaid)}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="mb-1 text-xs text-[var(--text-muted)]">Change Given</p>
          <p className="text-xl font-black text-slate-600">
            {format(currency, order.changeGiven)}
          </p>
        </div>
      </div>

      {toNumber(order.refundedTotal) > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">
            Refunded: {format(currency, order.refundedTotal)}
          </p>
        </div>
      )}

      <div className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Totals Breakdown
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <dt>Subtotal</dt>
            <dd className="font-semibold">{format(currency, order.subtotal)}</dd>
          </div>
          {toNumber(order.discountTotal) > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <dt>Total Discounts</dt>
              <dd className="font-semibold">
                −{format(currency, order.discountTotal)}
              </dd>
            </div>
          )}
          {order.discounts && order.discounts.length > 0 && (
            <ul className="ml-4 space-y-1 border-l border-emerald-200 pl-3">
              {order.discounts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between text-xs text-emerald-700"
                >
                  <span>↳ {d.description}</span>
                  <span>−{format(currency, d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <dt>Tax</dt>
            <dd className="font-semibold">{format(currency, order.taxTotal)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-glass)] pt-2 text-base text-[var(--text-primary)]">
            <dt className="font-bold">Grand Total</dt>
            <dd className="font-black text-[var(--accent)]">
              {format(currency, order.grandTotal)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-[var(--border-glass)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-glass)]">
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">Product</th>
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">SKU</th>
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">Unit Price</th>
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">Sold</th>
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">Returned</th>
                <th className="p-4 text-left font-medium text-[var(--text-muted)]">Returnable</th>
                <th className="p-4 text-right font-medium text-[var(--text-muted)]">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const summaryItem = summary?.items.find(
                  (entry) => entry.orderItemId === item.id,
                );
                const lineDiscounts = item.itemDiscounts ?? [];
                return (
                  <tr key={item.id} className="border-b border-[var(--border-glass)]">
                    <td className="p-4 text-[var(--text-primary)]">
                      <div>{item.productNameSnapshot ?? item.variantId.slice(0, 8)}</div>
                      {item.variantNameSnapshot && (
                        <div className="text-xs text-[var(--text-muted)]">
                          {item.variantNameSnapshot}
                        </div>
                      )}
                      {lineDiscounts.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {lineDiscounts.map((d) => (
                            <li
                              key={d.id}
                              className="text-xs text-emerald-700"
                            >
                              ↳ {d.description} (−{format(currency, d.amount)})
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">
                      {item.variantSkuSnapshot ?? '-'}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)]">
                      {format(currency, item.unitPrice)}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)]">{item.quantity}</td>
                    <td className="p-4 text-[var(--text-secondary)]">
                      {summaryItem?.returnedQuantity ?? 0}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)]">
                      {summaryItem?.remainingReturnableQuantity ?? item.quantity}
                    </td>
                    <td className="p-4 text-right font-semibold text-[var(--text-primary)]">
                      {format(currency, item.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="p-4 text-right font-bold text-[var(--text-primary)]">
                  Total
                </td>
                <td className="p-4 text-right text-lg font-bold text-[var(--accent)]">
                  {format(currency, order.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-[var(--border-glass)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Adjustment History</h2>
        </div>
        {adjustments.length === 0 ? (
          <div className="p-5 text-sm text-[var(--text-muted)]">
            No returns or exchanges have been recorded for this order.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-glass)]">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getAdjustmentTypeVariant(adjustment.type)}>
                        {adjustment.type}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(adjustment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Cashier:{' '}
                      {adjustment.cashier?.fullName ?? adjustment.cashier?.email ?? '-'}
                    </p>
                    {adjustment.notes ? (
                      <p className="text-sm text-[var(--text-secondary)]">{adjustment.notes}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Net</p>
                    <p
                      className={`text-lg font-bold ${
                        toNumber(adjustment.netAmount) > 0
                          ? 'text-emerald-600'
                          : toNumber(adjustment.netAmount) < 0
                            ? 'text-rose-600'
                            : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {format(currency, adjustment.netAmount)}
                    </p>
                    {adjustment.amountPaid && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Paid: {format(currency, adjustment.amountPaid)}
                        {adjustment.changeGiven && toNumber(adjustment.changeGiven) > 0
                          ? ` · Change: ${format(currency, adjustment.changeGiven)}`
                          : ''}
                      </p>
                    )}
                    <Link
                      href={`/orders/${order.id}/adjustments/${adjustment.id}/receipt`}
                    >
                      <Button variant="outline" size="sm" className="mt-2 rounded-xl">
                        <Receipt size={14} />
                        Print Receipt
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Returned Items
                    </p>
                    {adjustment.returnItems.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">No returned items.</p>
                    ) : (
                      <div className="space-y-2">
                        {adjustment.returnItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-[var(--border-glass)] px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-[var(--text-primary)]">
                                {item.productNameSnapshot ?? item.adjustmentId.slice(0, 8)}
                              </span>
                              <span className="text-rose-600">
                                -{format(currency, item.subtotal)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-[var(--text-muted)]">
                                Qty {item.quantity} × {format(currency, item.unitPrice)}
                              </p>
                              {item.restock && (
                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                  Restocked
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      New Sale Items
                    </p>
                    {adjustment.saleItems.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">No replacement items.</p>
                    ) : (
                      <div className="space-y-2">
                        {adjustment.saleItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-[var(--border-glass)] px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-[var(--text-primary)]">
                                {item.productNameSnapshot ?? item.variantId.slice(0, 8)}
                              </span>
                              <span className="text-emerald-600">
                                +{format(currency, item.subtotal)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                              Qty {item.quantity} × {format(currency, item.unitPrice)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PageLayout>
  );
}
