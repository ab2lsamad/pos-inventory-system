import { StockMovementType } from './shared';

export type { StockMovementType };

export interface InventoryLevel {
  id: string;
  storeId: string;
  store?: { id: string; name: string; code: string };
  variantId: string;
  variant?: {
    id: string;
    sku: string;
    name: string;
    product?: { id: string; name: string };
  };
  quantity: number;
  reserved: number;
  reorderPoint: number;
  reorderQty?: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  storeId: string;
  store?: { id: string; name: string; code: string };
  variantId: string;
  variant?: {
    id: string;
    sku: string;
    name: string;
    product?: { id: string; name: string };
  };
  type: StockMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  user?: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface ManualAdjustPayload {
  storeId: string;
  variantId: string;
  delta: number;
  reason: string;
}

export interface RecordCountPayload {
  storeId: string;
  variantId: string;
  countedQuantity: number;
}

export interface SetReorderPayload {
  storeId: string;
  variantId: string;
  reorderPoint: number;
  reorderQty?: number;
}
