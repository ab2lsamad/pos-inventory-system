import { DiscountType, OrderAdjustmentType } from '@/types/shared';
import type { CartLine, CartLineDiscount } from '@/types/pos';
import type { OrderAdjustment } from '@/types/order';
import type { ReceiptSnapshot } from './print-receipt';
import { toNumber } from './money';

const TYPE_LABEL: Record<OrderAdjustmentType, string> = {
  [OrderAdjustmentType.RETURN]: 'RETURN RECEIPT',
  [OrderAdjustmentType.EXCHANGE]: 'EXCHANGE RECEIPT',
  [OrderAdjustmentType.SALE_ADJUSTMENT]: 'SALE ADJUSTMENT',
};

export function adjustmentTitle(type: OrderAdjustmentType): string {
  return TYPE_LABEL[type] ?? 'ADJUSTMENT RECEIPT';
}

// Map the new sale items on an adjustment into POS-shaped CartLines so the
// existing printer (line discount chips, tax, totals) can render them.
function saleItemsToLines(adj: OrderAdjustment): CartLine[] {
  return adj.saleItems.map((item) => {
    const discounts: CartLineDiscount[] = (item.itemDiscounts ?? []).map((d) => ({
      discountId: d.discountId ?? undefined,
      name: d.description,
      type: DiscountType.FIXED_AMOUNT,
      value: toNumber(d.amount).toFixed(2),
    }));
    const lineGross = (toNumber(item.unitPrice) * item.quantity).toFixed(2);
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
}

// Map the returned items as negative CartLines (price stored as the per-unit
// effective refund). Showing them with quantity ensures the printed receipt
// makes the return obvious.
function returnItemsToLines(adj: OrderAdjustment): CartLine[] {
  return adj.returnItems.map((item) => {
    const lineGross = (toNumber(item.unitPrice) * item.quantity).toFixed(2);
    return {
      variantId: `return-${item.id}`,
      productName: `Return: ${item.productNameSnapshot ?? '-'}`,
      variantName: item.variantSkuSnapshot ?? '',
      sku: item.variantSkuSnapshot ?? '',
      attributeChips: [],
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discounts: [],
      taxRatePercent: '0',
      runningTotals: {
        lineGross,
        lineDiscount: '0',
        lineTax: '0',
        lineNet: `-${item.subtotal}`,
      },
    };
  });
}

export function adjustmentToReceiptSnapshot(
  adj: OrderAdjustment,
): ReceiptSnapshot {
  const saleLines = saleItemsToLines(adj);
  const returnLines = returnItemsToLines(adj);
  const items = [...returnLines, ...saleLines];

  const totalLineDiscount = adj.saleItems
    .reduce((sum, i) => sum + toNumber(i.discountAmount), 0)
    .toFixed(2);
  const totalTax = adj.saleItems
    .reduce((sum, i) => sum + toNumber(i.taxAmount), 0)
    .toFixed(2);

  const refTag = adj.originalOrder?.receiptNumber
    ? ` (Ref #${adj.originalOrder.receiptNumber})`
    : '';

  const showFinalSaleNotice =
    adj.type === OrderAdjustmentType.EXCHANGE ||
    adj.type === OrderAdjustmentType.SALE_ADJUSTMENT;

  return {
    receiptNumber: `${adjustmentTitle(adj.type)}${refTag}`,
    orderId: adj.id,
    createdAt: adj.createdAt,
    currency: adj.store?.currency ?? 'PKR',
    storeName: adj.store?.name,
    storeLocation: adj.store?.location ?? undefined,
    storePhone: adj.store?.phone ?? undefined,
    cashierName: adj.cashier?.fullName ?? adj.cashier?.email,
    salespersonName: adj.salesperson?.fullName ?? adj.salesperson?.email,
    customer: adj.originalOrder?.customer
      ? {
          id: adj.originalOrder.customer.id,
          fullName: adj.originalOrder.customer.fullName,
          phone: adj.originalOrder.customer.phone ?? '',
        } as never
      : null,
    paymentMethod: adj.paymentMethod,
    items,
    orderDiscounts: [],
    subtotal: adj.additionalChargeAmount,
    totalLineDiscount,
    totalTax,
    totalOrderDiscount: '0',
    grandTotal: adj.netAmount,
    amountPaid: adj.amountPaid ?? '0',
    changeGiven: adj.changeGiven ?? '0',
    footerNotice: showFinalSaleNotice
      ? 'Exchange items are final sale — not eligible for return.'
      : undefined,
  };
}
