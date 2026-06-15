'use client';

import { format, toNumber } from '@/lib/money';
import { orderToReceiptSnapshot } from '@/lib/order-receipt-snapshot';
import { PaymentMethod } from '@/types/shared';
import type { Order } from '@/types/order';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.DEBIT_CARD]: 'Card',
  [PaymentMethod.MOBILE_WALLET]: 'Mobile Wallet',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.OTHER]: 'Other',
};

interface ReceiptPrintProps {
  order: Order;
}

export default function ReceiptPrint({ order }: ReceiptPrintProps) {
  const snapshot = orderToReceiptSnapshot(order);
  const currency = snapshot.currency;

  return (
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
        </div>

        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span>{snapshot.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
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
          {snapshot.customer && (
            <div className="flex justify-between">
              <span>Customer</span>
              <span>{snapshot.customer.fullName}</span>
            </div>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-900 text-[10px] uppercase tracking-wider text-slate-600">
              <th className="py-1 text-left font-semibold">Item</th>
              <th className="py-1 pl-2.5 text-right text-[10px] font-semibold tabular-nums">Qty</th>
              <th className="py-1 pl-2.5 text-right text-[10px] font-semibold tabular-nums">Price</th>
              <th className="py-1 pl-2.5 text-right text-[10px] font-semibold tabular-nums">Total</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.items.map((line) => (
              <tr key={line.variantId} className="border-b border-dotted border-slate-200 align-top">
                <td className="py-1">
                  <div className="font-semibold">
                    {line.productName}
                    {line.variantName ? ` — ${line.variantName}` : ''}
                  </div>
                  {line.sku && (
                    <div className="text-[10px] text-slate-500">{line.sku}</div>
                  )}
                  {line.discounts.map((d, i) => (
                    <div key={`${d.discountId ?? i}`} className="text-[10px] text-emerald-700">
                      ↳ {d.name} (−{format(currency, d.value)})
                    </div>
                  ))}
                  {toNumber(line.runningTotals.lineTax) > 0 && (
                    <div className="text-[10px] text-slate-500">
                      + tax {format(currency, line.runningTotals.lineTax)}
                    </div>
                  )}
                </td>
                <td className="py-1 pl-2.5 text-right text-[11px] tabular-nums">{line.quantity}</td>
                <td className="py-1 pl-2.5 text-right text-[11px] tabular-nums">{toNumber(line.unitPrice).toFixed(2)}</td>
                <td className="py-1 pl-2.5 text-right text-[11px] font-semibold tabular-nums">
                  {toNumber(line.runningTotals.lineNet).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{format(currency, snapshot.subtotal)}</span>
          </div>
          {toNumber(snapshot.totalLineDiscount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Line discounts</span>
              <span>−{format(currency, snapshot.totalLineDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{format(currency, snapshot.totalTax)}</span>
          </div>
          {toNumber(snapshot.totalOrderDiscount) > 0 && (
            <>
              <div className="flex justify-between text-emerald-700">
                <span>Order discount</span>
                <span>−{format(currency, snapshot.totalOrderDiscount)}</span>
              </div>
              {snapshot.orderDiscounts.map((d, i) => (
                <div
                  key={`${d.discountId ?? i}`}
                  className="flex justify-between pl-3 text-[11px] text-emerald-700"
                >
                  <span>↳ {d.name}</span>
                  <span>−{format(currency, d.value)}</span>
                </div>
              ))}
            </>
          )}
          <div className="mt-1 flex justify-between border-t border-slate-900 pt-1 text-sm font-black">
            <span>Grand Total</span>
            <span>{format(currency, snapshot.grandTotal)}</span>
          </div>
          {toNumber(order.refundedTotal) > 0 && (
            <div className="flex justify-between text-rose-700">
              <span>Refunded</span>
              <span>−{format(currency, order.refundedTotal)}</span>
            </div>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{PAYMENT_LABEL[snapshot.paymentMethod]}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Paid</span>
            <span>{format(currency, snapshot.amountPaid)}</span>
          </div>
          {toNumber(snapshot.changeGiven) > 0 && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{format(currency, snapshot.changeGiven)}</span>
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-center">
          <p className="text-[11px] font-semibold">Thank you for your purchase!</p>
          <p className="mt-1 text-[10px] text-slate-500">{snapshot.orderId}</p>
        </div>
      </div>
  );
}
