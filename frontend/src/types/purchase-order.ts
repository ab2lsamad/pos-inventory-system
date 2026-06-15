import type { PurchaseOrderStatus } from './shared';

export type { PurchaseOrderStatus };

export interface PoSupplier {
  id: string;
  name: string;
}

export interface PoStore {
  id: string;
  name: string;
  code: string;
  currency: string;
}

export interface PoCreatedBy {
  id: string;
  email: string;
  fullName: string;
}

export interface PoVariant {
  id: string;
  name: string;
  sku: string;
  product: { id: string; name: string };
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  variantId: string;
  variant?: PoVariant;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
  subtotal: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: PoSupplier;
  store: PoStore;
  status: PurchaseOrderStatus;
  expectedAt?: string | null;
  receivedAt?: string | null;
  subtotal: string;
  taxTotal: string;
  shippingCost: string;
  grandTotal: string;
  currency: string;
  notes?: string | null;
  createdBy: PoCreatedBy;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
}

export interface CreatePoItemPayload {
  variantId: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  storeId: string;
  expectedAt?: string;
  shippingCost?: number;
  taxTotal?: number;
  notes?: string;
  items: CreatePoItemPayload[];
}

export interface ReceivePoItemPayload {
  itemId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderPayload {
  items: ReceivePoItemPayload[];
}
