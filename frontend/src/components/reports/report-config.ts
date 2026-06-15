import { format } from '@/lib/money';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { ReportRow, ReportType } from '@/types/report';

export type CellFormat = 'text' | 'int' | 'money';

export interface ReportColumn {
  key: string;
  header: string;
  format: CellFormat;
  align: 'left' | 'right';
}

export interface ReportDefinition {
  type: ReportType;
  label: string;
  endpointKey: keyof typeof API_ENDPOINTS.reports;
  usesDateRange: boolean;
  paginated: boolean;
  columns: ReportColumn[];
  /** Numeric column keys to sum into a totals footer row (empty = no footer). */
  totalColumns: string[];
  footnote?: string;
}

const intColCount = new Intl.NumberFormat();

export function formatCell(value: unknown, fmt: CellFormat): string {
  if (value === null || value === undefined) return '—';
  if (fmt === 'money') return format('PKR', value as number);
  if (fmt === 'int') return intColCount.format(Number(value));
  return String(value);
}

const t = (key: string, header: string): ReportColumn => ({
  key,
  header,
  format: 'text',
  align: 'left',
});
const i = (key: string, header: string): ReportColumn => ({
  key,
  header,
  format: 'int',
  align: 'right',
});
const m = (key: string, header: string): ReportColumn => ({
  key,
  header,
  format: 'money',
  align: 'right',
});

const SUPPLIER_FOOTNOTE =
  'Each variant is attributed to its lowest-cost supplier; variants with no linked supplier appear as “(no supplier)”.';

const ORDER_DISCOUNT_FOOTNOTE =
  'Order-level discounts are allocated across lines in proportion to each line’s subtotal, so Net Sales reconciles with the summary report. Gross is before any discount; Net = Gross − Item Disc. − Order Disc. + Tax.';

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  summary: {
    type: 'summary',
    label: 'Summary',
    endpointKey: 'summary',
    usesDateRange: true,
    paginated: false,
    columns: [t('label', 'Metric'), i('count', 'No. of Sales'), m('total', 'Total (PKR)')],
    totalColumns: [],
  },
  'sales-count': {
    type: 'sales-count',
    label: 'Sales count',
    endpointKey: 'salesCount',
    usesDateRange: true,
    paginated: false,
    columns: [
      t('paymentMethod', 'Payment Method'),
      i('salesCount', 'No. of Sales'),
      m('salesTotal', 'Sales Total'),
      i('refundCount', 'No. of Refunds'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['salesCount', 'salesTotal', 'refundCount', 'refundTotal', 'balance'],
  },
  'product-sales': {
    type: 'product-sales',
    label: 'Product sales',
    endpointKey: 'productSales',
    usesDateRange: true,
    paginated: true,
    columns: [
      t('productName', 'Product'),
      i('qtySold', 'Items Sold'),
      m('gross', 'Gross'),
      m('itemDiscount', 'Item Disc.'),
      m('orderDiscount', 'Order Disc.'),
      m('tax', 'Tax'),
      m('net', 'Net Sales'),
      i('qtyRefunded', 'Items Refunded'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['qtySold', 'gross', 'itemDiscount', 'orderDiscount', 'tax', 'net', 'qtyRefunded', 'refundTotal', 'balance'],
    footnote: ORDER_DISCOUNT_FOOTNOTE,
  },
  'category-sales': {
    type: 'category-sales',
    label: 'Category sales',
    endpointKey: 'categorySales',
    usesDateRange: true,
    paginated: true,
    columns: [
      t('categoryName', 'Category'),
      i('qtySold', 'Items Sold'),
      m('gross', 'Gross'),
      m('itemDiscount', 'Item Disc.'),
      m('orderDiscount', 'Order Disc.'),
      m('tax', 'Tax'),
      m('net', 'Net Sales'),
      i('qtyRefunded', 'Items Refunded'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['qtySold', 'gross', 'itemDiscount', 'orderDiscount', 'tax', 'net', 'qtyRefunded', 'refundTotal', 'balance'],
    footnote: ORDER_DISCOUNT_FOOTNOTE,
  },
  'supplier-sales': {
    type: 'supplier-sales',
    label: 'Supplier sales',
    endpointKey: 'supplierSales',
    usesDateRange: true,
    paginated: true,
    columns: [
      t('supplierName', 'Supplier'),
      i('qtySold', 'Items Sold'),
      m('gross', 'Gross'),
      m('itemDiscount', 'Item Disc.'),
      m('orderDiscount', 'Order Disc.'),
      m('tax', 'Tax'),
      m('net', 'Net Sales'),
      i('qtyRefunded', 'Items Refunded'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['qtySold', 'gross', 'itemDiscount', 'orderDiscount', 'tax', 'net', 'qtyRefunded', 'refundTotal', 'balance'],
    footnote: `${SUPPLIER_FOOTNOTE} ${ORDER_DISCOUNT_FOOTNOTE}`,
  },
  'current-stock': {
    type: 'current-stock',
    label: 'Current stock',
    endpointKey: 'currentStock',
    usesDateRange: false,
    paginated: true,
    columns: [
      t('productName', 'Product'),
      t('supplier', 'Supplier'),
      t('store', 'Store'),
      i('stockQty', 'Stock Qty'),
      m('stockValue', 'Stock Value'),
    ],
    totalColumns: ['stockQty', 'stockValue'],
    footnote: `Live snapshot of current on-hand stock (date range does not apply). ${SUPPLIER_FOOTNOTE}`,
  },
  'store-sales': {
    type: 'store-sales',
    label: 'Store sales',
    endpointKey: 'storeSales',
    usesDateRange: true,
    paginated: false,
    columns: [
      t('storeName', 'Store'),
      i('salesCount', 'No. of Sales'),
      m('salesTotal', 'Sales Total'),
      i('refundCount', 'No. of Refunds'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['salesCount', 'salesTotal', 'refundCount', 'refundTotal', 'balance'],
  },
  'user-sales': {
    type: 'user-sales',
    label: 'User sales',
    endpointKey: 'userSales',
    usesDateRange: true,
    paginated: false,
    columns: [
      t('cashierName', 'Cashier'),
      i('salesCount', 'No. of Sales'),
      m('salesTotal', 'Sales Total'),
      i('refundCount', 'No. of Refunds'),
      m('refundTotal', 'Refund Total'),
      m('balance', 'Balance'),
    ],
    totalColumns: ['salesCount', 'salesTotal', 'refundCount', 'refundTotal', 'balance'],
  },
  'tax-breakdown': {
    type: 'tax-breakdown',
    label: 'Tax breakdown',
    endpointKey: 'taxBreakdown',
    usesDateRange: true,
    paginated: false,
    columns: [
      i('itemCount', 'No. of Items'),
      m('saleSubtotal', 'Sale Subtotal'),
      m('saleTax', 'Sale Tax'),
      m('orderDiscount', 'Order Disc.'),
      m('netSales', 'Net Sales'),
      m('refundSubtotal', 'Refund Subtotal'),
      m('refundTax', 'Refund Tax'),
      m('totalTax', 'Total Tax'),
    ],
    totalColumns: [],
    footnote:
      'Refund tax is pro-rated from the original order line’s tax rate. Tax is charged on the line subtotal before order-level discounts, which apply afterwards; Net Sales = Sale Subtotal + Sale Tax − Order Disc.',
  },
};

export const REPORT_OPTIONS = Object.values(REPORT_DEFINITIONS).map((def) => ({
  value: def.type,
  label: def.label,
}));

/** Sum the configured numeric columns into a single totals row, or null. */
export function computeTotals(
  def: ReportDefinition,
  rows: ReportRow[],
): Record<string, number> | null {
  if (!def.totalColumns.length || !rows.length) return null;
  const totals: Record<string, number> = {};
  for (const key of def.totalColumns) {
    totals[key] = rows.reduce(
      (sum, row) => sum + Number((row as unknown as Record<string, unknown>)[key] ?? 0),
      0,
    );
  }
  return totals;
}
