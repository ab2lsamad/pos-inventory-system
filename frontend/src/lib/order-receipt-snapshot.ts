import { DiscountType } from '@/types/shared';
import type { CartLine, CartLineDiscount } from '@/types/pos';
import type { Order } from '@/types/order';
import type { ReceiptSnapshot } from './print-receipt';
import { toNumber } from './money';

export function orderToReceiptSnapshot(order: Order): ReceiptSnapshot {
  const items: CartLine[] = order.items.map((item) => {
    const lineGross = (toNumber(item.unitPrice) * item.quantity).toFixed(2);
    const discounts: CartLineDiscount[] = (item.itemDiscounts ?? []).map((d) => ({
      discountId: d.discountId ?? undefined,
      name: d.description,
      type: DiscountType.FIXED_AMOUNT,
      value: toNumber(d.amount).toFixed(2),
    }));
    return {
      variantId: item.variantId,
      productName: item.productNameSnapshot ?? '-',
      variantName: item.variantNameSnapshot ?? '',
      sku: item.variantSkuSnapshot ?? '',
      attributeChips: [],
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discounts,
      taxRatePercent: '0',
      runningTotals: {
        lineGross,
        lineDiscount: item.discountAmount,
        lineTax: item.taxAmount,
        lineNet: item.total,
      },
    };
  });

  const orderDiscounts: CartLineDiscount[] = (order.discounts ?? []).map((d) => ({
    discountId: d.discountId ?? undefined,
    name: d.description,
    type: DiscountType.FIXED_AMOUNT,
    value: toNumber(d.amount).toFixed(2),
  }));

  const totalLineDiscount = order.items
    .reduce((sum, i) => sum + toNumber(i.discountAmount), 0)
    .toFixed(2);
  const totalOrderDiscount = (order.discounts ?? [])
    .reduce((sum, d) => sum + toNumber(d.amount), 0)
    .toFixed(2);

  return {
    receiptNumber: order.receiptNumber,
    orderId: order.id,
    createdAt: order.createdAt,
    currency: order.currency ?? 'PKR',
    storeName: order.store?.name,
    storeLocation: order.store?.location ?? undefined,
    storePhone: order.store?.phone ?? undefined,
    cashierName: order.cashier?.fullName ?? order.cashier?.email,
    salespersonName: order.salesperson?.fullName ?? order.salesperson?.email,
    customer: order.customer ?? null,
    paymentMethod: order.paymentMethod,
    items,
    orderDiscounts,
    subtotal: order.subtotal,
    totalLineDiscount,
    totalTax: order.taxTotal,
    totalOrderDiscount,
    grandTotal: order.grandTotal,
    amountPaid: order.amountPaid,
    changeGiven: order.changeGiven,
  };
}
