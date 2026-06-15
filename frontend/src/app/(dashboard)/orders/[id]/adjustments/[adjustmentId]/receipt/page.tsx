'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import PageLayout from '@/components/layout/PageLayout';
import { useAdjustmentQuery } from '@/hooks/orders/useAdjustmentQuery';
import { format, toNumber } from '@/lib/money';
import { printReceipt } from '@/lib/print-receipt';
import {
  adjustmentTitle,
  adjustmentToReceiptSnapshot,
} from '@/lib/adjustment-receipt-snapshot';
import { OrderAdjustmentType, PaymentMethod } from '@/types/shared';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.DEBIT_CARD]: 'Card',
  [PaymentMethod.MOBILE_WALLET]: 'Mobile Wallet',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.OTHER]: 'Other',
};

export default function AdjustmentReceiptPage() {
  const { id, adjustmentId } = useParams<{ id: string; adjustmentId: string }>();
  const router = useRouter();
  const { data: adj, isLoading } = useAdjustmentQuery(adjustmentId);

  const back = (
    <Button variant="ghost" size="icon" onClick={() => router.push(`/orders/${id}`)}>
      <ArrowLeft size={18} />
    </Button>
  );

  if (isLoading) {
    return (
      <PageLayout title="Adjustment Receipt">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!adj) {
    return (
      <PageLayout title="Adjustment Receipt" back={back}>
        <div className="py-20 text-center">
          <p className="text-[var(--text-muted)]">Adjustment not found</p>
        </div>
      </PageLayout>
    );
  }

  const snapshot = adjustmentToReceiptSnapshot(adj);
  const currency = snapshot.currency;
  const showFinalSaleNotice =
    adj.type === OrderAdjustmentType.EXCHANGE ||
    adj.type === OrderAdjustmentType.SALE_ADJUSTMENT;

  return (
    <PageLayout
      title={adjustmentTitle(adj.type)}
      back={back}
      action={
        <Button onClick={() => printReceipt(snapshot)} className="rounded-xl">
          <Printer size={16} />
          Print
        </Button>
      }
    >
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 font-mono text-xs text-slate-900 shadow-sm">
        <div className="mb-2 text-center">
          <h2 className="text-base font-black uppercase tracking-widest">
            {snapshot.storeName ?? 'Store'}
          </h2>
          {snapshot.storeLocation && (
            <p className="mt-1 text-[11px] text-slate-500">{snapshot.storeLocation}</p>
          )}
          {snapshot.storePhone && (
            <p className="text-[11px] text-slate-500">{snapshot.storePhone}</p>
          )}
          <p className="mt-2 text-[11px] font-bold tracking-widest text-rose-700">
            {adjustmentTitle(adj.type)}
          </p>
          {adj.originalOrder?.receiptNumber != null && (
            <p className="text-[10px] text-slate-500">
              Ref Receipt #{adj.originalOrder.receiptNumber}
            </p>
          )}
        </div>

        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Date</span>
            <span>{new Date(adj.createdAt).toLocaleString()}</span>
          </div>
          {snapshot.cashierName && (
            <div className="flex justify-between">
              <span>Cashier</span>
              <span>{snapshot.cashierName}</span>
            </div>
          )}
          {snapshot.salespersonName && (
            <div className="flex justify-between">
              <span>Salesperson</span>
              <span>{snapshot.salespersonName}</span>
            </div>
          )}
          {adj.originalOrder?.customer && (
            <div className="flex justify-between">
              <span>Customer</span>
              <span>{adj.originalOrder.customer.fullName}</span>
            </div>
          )}
        </div>

        {adj.returnItems.length > 0 && (
          <>
            <div className="my-2 border-t border-dashed border-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Returned Items
            </p>
            <table className="mt-1 w-full">
              <tbody>
                {adj.returnItems.map((item) => (
                  <tr key={item.id} className="border-b border-dotted border-slate-200 align-top">
                    <td className="py-1">
                      <div className="font-semibold">
                        {item.productNameSnapshot ?? '-'}
                      </div>
                      {item.variantSkuSnapshot && (
                        <div className="text-[10px] text-slate-500">
                          {item.variantSkuSnapshot}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Qty {item.quantity} ×{' '}
                        {format(currency, item.unitPrice)}
                        {item.restock ? ' · restocked' : ''}
                      </div>
                    </td>
                    <td className="py-1 text-right font-semibold text-rose-700">
                      −{format(currency, item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 flex justify-between text-rose-700">
              <span>Refund Total</span>
              <span>−{format(currency, adj.refundAmount)}</span>
            </div>
          </>
        )}

        {adj.saleItems.length > 0 && (
          <>
            <div className="my-2 border-t border-dashed border-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              New Items
            </p>
            <table className="mt-1 w-full">
              <tbody>
                {adj.saleItems.map((item) => (
                  <tr key={item.id} className="border-b border-dotted border-slate-200 align-top">
                    <td className="py-1">
                      <div className="font-semibold">
                        {item.productNameSnapshot ?? '-'}
                        {item.variantNameSnapshot
                          ? ` — ${item.variantNameSnapshot}`
                          : ''}
                      </div>
                      {item.variantSkuSnapshot && (
                        <div className="text-[10px] text-slate-500">
                          {item.variantSkuSnapshot}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Qty {item.quantity} ×{' '}
                        {format(currency, item.unitPrice)}
                      </div>
                      {(item.itemDiscounts ?? []).map((d) => (
                        <div
                          key={d.id}
                          className="text-[10px] text-emerald-700"
                        >
                          ↳ {d.description} (−{format(currency, d.amount)})
                        </div>
                      ))}
                      {toNumber(item.taxAmount) > 0 && (
                        <div className="text-[10px] text-slate-500">
                          + tax {format(currency, item.taxAmount)}
                        </div>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold text-emerald-700">
                      +{format(currency, item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 flex justify-between text-emerald-700">
              <span>Charge Total</span>
              <span>+{format(currency, adj.additionalChargeAmount)}</span>
            </div>
          </>
        )}

        <div className="my-2 border-t-2 border-slate-900" />
        <div className="flex justify-between text-sm font-black">
          <span>Net {toNumber(adj.netAmount) >= 0 ? 'Due' : 'Refund'}</span>
          <span>{format(currency, adj.netAmount)}</span>
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{PAYMENT_LABEL[adj.paymentMethod]}</span>
          </div>
          {adj.amountPaid && (
            <div className="flex justify-between">
              <span>Amount Paid</span>
              <span>{format(currency, adj.amountPaid)}</span>
            </div>
          )}
          {adj.changeGiven && toNumber(adj.changeGiven) > 0 && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{format(currency, adj.changeGiven)}</span>
            </div>
          )}
        </div>

        {adj.notes && (
          <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-[11px] text-slate-600">
            <p className="font-semibold">Notes</p>
            <p>{adj.notes}</p>
          </div>
        )}

        {showFinalSaleNotice && (
          <div className="mt-3 rounded-md bg-amber-50 px-2 py-1 text-center text-[10px] font-semibold text-amber-800">
            Exchange items are final sale — not eligible for return.
          </div>
        )}

        <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-center">
          <p className="text-[10px] text-slate-500">{adj.id}</p>
        </div>
      </div>
    </PageLayout>
  );
}
