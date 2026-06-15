import { z } from 'zod';
import { DiscountType, PaymentMethod } from '@/types/shared';

const moneyStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount');

const discountPayloadSchema = z.object({
  discountId: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.nativeEnum(DiscountType),
  value: moneyStringSchema,
});

export const checkoutItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  discounts: z.array(discountPayloadSchema).optional(),
});

export const checkoutSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  amountPaid: moneyStringSchema,
  changeGiven: moneyStringSchema,
  customerId: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
  items: z.array(checkoutItemSchema).min(1, 'Cart is empty'),
  discounts: z.array(discountPayloadSchema).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
