import type { Category } from './category';
import type { Brand } from './brand';
import type { TaxRate } from './tax-rate';
import { ProductType } from './shared';

export type { ProductType };

export interface VariantAttributeValue {
  attributeValue: {
    id: string;
    value: string;
    attribute: { id: string; name: string };
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: string;
  cost: string;
  isActive: boolean;
  attributeValues: VariantAttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  type: ProductType;
  brandId?: string;
  brand?: Brand;
  taxRateId?: string;
  taxRate?: TaxRate;
  categoryId?: string;
  category?: Category;
  variants: ProductVariant[];
  variantCount?: number;
  isActive: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getVariantAttributeMap(variant: ProductVariant): Record<string, string> {
  const map: Record<string, string> = {};
  for (const av of variant.attributeValues) {
    map[av.attributeValue.attribute.name] = av.attributeValue.value;
  }
  return map;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  type: ProductType;
  categoryId?: string;
  brandId?: string;
  taxRateId?: string;
  variants: VariantPayload[];
}

export interface VariantPayload {
  name?: string;
  barcode?: string;
  price: string;
  cost: string;
  attributeValueIds?: string[];
}

export interface AddVariantPayload {
  name?: string;
  barcode?: string;
  price: string;
  cost: string;
  attributeValueIds: string[];
}

export interface UpdateVariantPayload {
  name?: string;
  barcode?: string;
  price?: string;
  cost?: string;
  isActive?: boolean;
  attributeValueIds?: string[];
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  taxRateId?: string;
  isActive?: boolean;
}
