export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  variantId: string;
  supplierSku?: string | null;
  costPrice: string;
  leadTimeDays?: number | null;
  variant?: {
    id: string;
    name: string;
    sku: string;
    cost: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
  };
}

export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  isActive?: boolean;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export interface UpsertSupplierProductPayload {
  variantId: string;
  supplierSku?: string;
  costPrice: number;
  leadTimeDays?: number;
}

export type UpdateSupplierProductPayload = Partial<UpsertSupplierProductPayload>;

export type { SupplierFormData } from '@/schemas/supplier';
