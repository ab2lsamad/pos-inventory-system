import { z } from 'zod';

export const poItemSchema = z.object({
  variantId: z.string().min(1, 'Select a variant'),
  variantLabel: z.string().optional(),
  quantityOrdered: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Must be a whole number ≥ 1'),
  unitCost: z
    .string()
    .min(1, 'Required')
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Must be a valid non-negative number'),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  storeId: z.string().min(1, 'Select a store'),
  expectedAt: z.string().optional(),
  shippingCost: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      'Must be a valid non-negative number',
    ),
  taxTotal: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      'Must be a valid non-negative number',
    ),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one line item'),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
export type PoItemFormData = z.infer<typeof poItemSchema>;

export const receivePoSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      quantityReceived: z
        .string()
        .refine(
          (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
          'Must be a whole number ≥ 0',
        ),
    }),
  ),
});

export type ReceivePoFormData = z.infer<typeof receivePoSchema>;
