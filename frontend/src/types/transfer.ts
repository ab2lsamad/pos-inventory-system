import type { TransferStatus } from './shared';

export type { TransferStatus };

export interface TransferStore {
  id: string;
  name: string;
  code: string;
}

export interface TransferCreatedBy {
  id: string;
  email: string;
  fullName: string;
}

export interface TransferVariant {
  id: string;
  name: string;
  sku: string;
  product: { id: string; name: string };
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  variantId: string;
  variant?: TransferVariant;
  quantity: number;
  quantityReceived: number;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromStore: TransferStore;
  toStore: TransferStore;
  status: TransferStatus;
  shippedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  createdBy: TransferCreatedBy;
  createdAt: string;
  updatedAt: string;
  items: StockTransferItem[];
}

export interface CreateTransferItemPayload {
  variantId: string;
  quantity: number;
}

export interface CreateTransferPayload {
  fromStoreId: string;
  toStoreId: string;
  notes?: string;
  items: CreateTransferItemPayload[];
}

export interface ReceiveTransferItemPayload {
  itemId: string;
  quantityReceived: number;
}

export interface ReceiveTransferPayload {
  items: ReceiveTransferItemPayload[];
}
