import { DiscountScope, DiscountType } from './shared';

// LINE_ITEM scope only: a variant this discount is pinned to. An empty
// targetVariants array means the discount applies to any variant.
export interface DiscountTargetVariant {
  variantId: string;
  variant: {
    id: string;
    name: string;
    sku: string;
    product: { id: string; name: string };
  };
}

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  value: string;
  scope: DiscountScope;
  maxUses?: number;
  usageCount: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  targetVariants?: DiscountTargetVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountPayload {
  code: string;
  name: string;
  type: DiscountType;
  value: string;
  scope: DiscountScope;
  maxUses?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  // LINE_ITEM scope only. Empty/omitted = applies to any variant.
  variantIds?: string[];
}

export type UpdateDiscountPayload = Partial<CreateDiscountPayload>;
