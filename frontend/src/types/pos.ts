import { DiscountType } from './shared';

export interface CartLineDiscount {
  discountId?: string;
  name: string;
  type: DiscountType;
  value: string;
}

export interface CartLineRunningTotals {
  lineGross: string;
  lineDiscount: string;
  lineTax: string;
  lineNet: string;
}

export interface CartLine {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  attributeChips: { attributeName: string; value: string }[];
  quantity: number;
  unitPrice: string;
  discounts: CartLineDiscount[];
  taxRatePercent: string;
  runningTotals: CartLineRunningTotals;
}

export type { CheckoutFormData } from '@/schemas/pos';
