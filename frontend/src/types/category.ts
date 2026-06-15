export interface CategoryParent {
  id: string;
  name: string;
}

export interface CategoryTaxRate {
  id: string;
  name: string;
  rate: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: CategoryParent;
  taxRateId?: string;
  taxRate?: CategoryTaxRate;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  taxRateId?: string;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export type { CategoryFormData } from '@/schemas/category';
