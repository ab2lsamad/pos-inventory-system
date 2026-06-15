export interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateBrandPayload = Partial<CreateBrandPayload>;

export type { BrandFormData } from '@/schemas/brand';
