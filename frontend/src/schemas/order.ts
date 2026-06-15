import { z } from 'zod';
import { PaymentMethod } from '@/types/shared';
import { positiveIntSchema } from './shared';

export const orderAdjustReturnItemSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: positiveIntSchema,
  restock: z.boolean(),
});

export const orderAdjustSaleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: positiveIntSchema,
});

const moneyStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount');

export const orderAdjustReturnSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  amountPaid: moneyStringSchema.optional(),
  changeGiven: moneyStringSchema.optional(),
  notes: z.string().trim(),
  returns: z
    .array(orderAdjustReturnItemSchema)
    .min(1, 'Select at least one item to return'),
});

export const orderAdjustSaleSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  amountPaid: moneyStringSchema.optional(),
  changeGiven: moneyStringSchema.optional(),
  notes: z.string().trim(),
  returns: z.array(orderAdjustReturnItemSchema),
  newItems: z
    .array(orderAdjustSaleItemSchema)
    .min(1, 'Add at least one item to the adjustment'),
});

export type OrderAdjustReturnFormData = z.infer<typeof orderAdjustReturnSchema>;
export type OrderAdjustSaleFormData = z.infer<typeof orderAdjustSaleSchema>;
