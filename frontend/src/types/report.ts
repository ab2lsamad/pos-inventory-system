export type ReportType =
  | 'summary'
  | 'sales-count'
  | 'product-sales'
  | 'category-sales'
  | 'supplier-sales'
  | 'current-stock'
  | 'store-sales'
  | 'user-sales'
  | 'tax-breakdown';

export interface ReportMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SummaryRow {
  key: string;
  label: string;
  count: number | null;
  total: number;
}

export interface SalesCountRow {
  paymentMethod: string;
  salesCount: number;
  salesTotal: number;
  refundCount: number;
  refundTotal: number;
  balance: number;
}

export interface ProductSalesRow {
  productName: string;
  sku: string;
  qtySold: number;
  gross: number;
  itemDiscount: number;
  orderDiscount: number;
  tax: number;
  net: number;
  qtyRefunded: number;
  refundTotal: number;
  balance: number;
}

export interface CategorySalesRow {
  categoryName: string;
  qtySold: number;
  gross: number;
  itemDiscount: number;
  orderDiscount: number;
  tax: number;
  net: number;
  qtyRefunded: number;
  refundTotal: number;
  balance: number;
}

export interface SupplierSalesRow {
  supplierName: string;
  qtySold: number;
  gross: number;
  itemDiscount: number;
  orderDiscount: number;
  tax: number;
  net: number;
  qtyRefunded: number;
  refundTotal: number;
  balance: number;
}

export interface CurrentStockRow {
  productName: string;
  sku: string;
  supplier: string;
  store: string;
  stockQty: number;
  stockValue: number;
}

export interface StoreSalesRow {
  storeName: string;
  salesCount: number;
  salesTotal: number;
  refundCount: number;
  refundTotal: number;
  balance: number;
}

export interface UserSalesRow {
  cashierName: string;
  salesCount: number;
  salesTotal: number;
  refundCount: number;
  refundTotal: number;
  balance: number;
}

export interface TaxBreakdownRow {
  itemCount: number;
  saleSubtotal: number;
  saleTax: number;
  orderDiscount: number;
  netSales: number;
  refundItemCount: number;
  refundSubtotal: number;
  refundTax: number;
  totalTax: number;
}

export type ReportRow =
  | SummaryRow
  | SalesCountRow
  | ProductSalesRow
  | CategorySalesRow
  | SupplierSalesRow
  | CurrentStockRow
  | StoreSalesRow
  | UserSalesRow
  | TaxBreakdownRow;

export interface ReportResponse {
  startDate?: string;
  endDate?: string;
  generatedAt?: string;
  rows?: SummaryRow[];
  data?: ReportRow[];
  meta?: ReportMeta;
}
