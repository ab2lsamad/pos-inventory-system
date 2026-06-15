import type { Store } from './store';
import type { Customer } from './customer';
import {
  OrderAdjustmentStatus,
  OrderAdjustmentType,
  OrderStatus,
  PaymentMethod,
} from './shared';

export interface OrderItemDiscount {
  id: string;
  orderItemId: string;
  discountId?: string | null;
  description: string;
  amount: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  unitCostSnapshot?: string | null;
  discountAmount: string;
  taxAmount: string;
  subtotal: string;
  total: string;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  variantSkuSnapshot?: string | null;
  variantBarcodeSnapshot?: string | null;
  itemDiscounts: OrderItemDiscount[];
}

export interface OrderDiscount {
  id: string;
  orderId: string;
  discountId?: string | null;
  description: string;
  amount: string;
}

export interface OrderAdjustmentReturnItem {
  id: string;
  adjustmentId: string;
  orderItemId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  restock: boolean;
  productNameSnapshot?: string | null;
  variantSkuSnapshot?: string | null;
  variantBarcodeSnapshot?: string | null;
  createdAt: string;
}

export interface OrderAdjustmentSaleItemDiscount {
  id: string;
  adjustmentSaleItemId: string;
  discountId?: string | null;
  description: string;
  amount: string;
}

export interface OrderAdjustmentSaleItem {
  id: string;
  adjustmentId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  subtotal: string;
  total: string;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  variantSkuSnapshot?: string | null;
  variantBarcodeSnapshot?: string | null;
  itemDiscounts: OrderAdjustmentSaleItemDiscount[];
  createdAt: string;
}

export interface OrderAdjustment {
  id: string;
  originalOrderId: string;
  originalOrder?: {
    id: string;
    receiptNumber: number;
    createdAt: string;
    customer?: { id: string; fullName: string; phone?: string } | null;
  };
  storeId: string;
  store?: Store;
  cashierId: string;
  cashier?: { id: string; fullName?: string; email: string };
  salespersonId?: string | null;
  salesperson?: { id: string; fullName?: string; email: string } | null;
  type: OrderAdjustmentType;
  status: OrderAdjustmentStatus;
  paymentMethod: PaymentMethod;
  refundAmount: string;
  additionalChargeAmount: string;
  netAmount: string;
  amountPaid?: string | null;
  changeGiven?: string | null;
  notes?: string | null;
  returnItems: OrderAdjustmentReturnItem[];
  saleItems: OrderAdjustmentSaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderReturnSummaryItem {
  id: string;
  orderItemId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName?: string | null;
  variantSku?: string | null;
  barcode?: string | null;
  unitPrice: string;
  effectiveUnitRefund: string;
  subtotal: string;
  soldQuantity: number;
  returnedQuantity: number;
  remainingReturnableQuantity: number;
}

export interface OrderReturnSummary {
  orderId: string;
  receiptNumber: number;
  storeId: string;
  cashierId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: string;
  grandTotal: string;
  refundedTotal: string;
  createdAt: string;
  items: OrderReturnSummaryItem[];
}

export interface Order {
  id: string;
  receiptNumber: number;
  storeId: string;
  store?: Store;
  cashierId: string;
  cashier?: { id: string; fullName?: string; email: string };
  salespersonId?: string | null;
  salesperson?: { id: string; fullName?: string; email: string } | null;
  customerId?: string | null;
  customer?: Customer | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  amountPaid: string;
  changeGiven: string;
  refundedTotal: string;
  currency: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  items: OrderItem[];
  discounts: OrderDiscount[];
  _count?: { adjustments: number };
  createdAt: string;
  updatedAt: string;
}

export interface OrderDiscountPayload {
  discountId?: string;
  description: string;
  amount: number;
}

export interface CreateOrderItemPayload {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  discounts?: OrderDiscountPayload[];
}

export interface CreateOrderPayload {
  storeId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerId?: string;
  salespersonId?: string;
  notes?: string;
  items: CreateOrderItemPayload[];
  discounts?: OrderDiscountPayload[];
}

export interface CreateOrderAdjustmentSaleItemDiscountPayload {
  discountId?: string;
  description: string;
  amount: number;
}

export interface CreateOrderAdjustmentSaleItemPayload {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  discounts?: CreateOrderAdjustmentSaleItemDiscountPayload[];
}

export interface CreateOrderAdjustmentDto {
  storeId: string;
  paymentMethod: PaymentMethod;
  amountPaid?: string;
  notes?: string;
  returns?: { orderItemId: string; quantity: number; restock: boolean }[];
  newItems?: CreateOrderAdjustmentSaleItemPayload[];
}

export type {
  OrderAdjustReturnFormData,
  OrderAdjustSaleFormData,
} from '@/schemas/order';
