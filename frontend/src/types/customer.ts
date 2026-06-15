export interface Customer {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & { isActive?: boolean };

export type { CustomerFormData } from '@/schemas/customer';
