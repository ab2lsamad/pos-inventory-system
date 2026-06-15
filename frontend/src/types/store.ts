export interface Store {
  id: string;
  code: string;
  name: string;
  currency: string;
  location?: string;
  phone?: string;
  isActive: boolean;
  archivedAt?: string | null;
  receiptCounter: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorePayload {
  code: string;
  name: string;
  currency?: string;
  location?: string;
  phone?: string;
  isActive?: boolean;
}

export type UpdateStorePayload = Partial<CreateStorePayload>;

export type { StoreFormData } from '@/schemas/store';
