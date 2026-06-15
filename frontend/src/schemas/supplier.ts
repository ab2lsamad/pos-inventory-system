import { z } from 'zod';
import { requiredString } from './shared';

export const supplierSchema = z.object({
  name: requiredString('Name'),
  contactPerson: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const supplierProductSchema = z.object({
  variantId: z.string().min(1, 'Select a variant'),
  supplierSku: z.string().trim().optional(),
  costPrice: z
    .string()
    .min(1, 'Cost price is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Must be a valid non-negative number'),
  leadTimeDays: z
    .string()
    .optional()
    .refine(
      (v) => v === '' || v === undefined || (!isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) >= 0),
      'Must be a whole number ≥ 0',
    ),
});

export type SupplierProductFormData = z.infer<typeof supplierProductSchema>;
