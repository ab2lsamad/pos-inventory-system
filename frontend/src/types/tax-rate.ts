export interface TaxRate {
  id: string;
  name: string;
  rate: string;
  isActive: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRatePayload {
  name: string;
  rate: string;
  isActive?: boolean;
}

export type UpdateTaxRatePayload = Partial<CreateTaxRatePayload>;
