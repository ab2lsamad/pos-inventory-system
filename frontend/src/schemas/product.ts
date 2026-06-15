import { z } from 'zod';
import { ProductType } from '@/types/shared';
import { requiredString } from './shared';

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount (e.g. 0.00)');

export const simpleVariantSchema = z.object({
  price: moneyString,
  cost: moneyString,
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

export type SimpleVariantFormData = z.infer<typeof simpleVariantSchema>;

export const variableVariantRowSchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  name: z.string().trim().optional(),
  attributeValueIds: z.array(z.string().uuid()).min(1, 'Select at least one attribute value'),
  price: moneyString,
  cost: moneyString,
  barcode: z.string().trim().min(1, 'Barcode is required'),
  isActive: z.boolean(),
});

export type VariableVariantRow = z.infer<typeof variableVariantRowSchema>;

export const productSchema = z.object({
  name: requiredString('Name'),
  description: z.string().trim().optional(),
  type: z.nativeEnum(ProductType),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  taxRateId: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  // SIMPLE: exactly one variant via flat fields
  simpleVariant: simpleVariantSchema.optional(),
  // VARIABLE: one or more variant rows
  variants: z.array(variableVariantRowSchema).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const variantFormSchema = z.object({
  name: z.string().trim().optional(),
  attributeValueIds: z.array(z.string().uuid()).min(1, 'Select at least one attribute value'),
  price: moneyString,
  cost: moneyString,
  barcode: z.string().trim().min(1, 'Barcode is required'),
  isActive: z.boolean(),
});

export type VariantFormData = z.infer<typeof variantFormSchema>;
