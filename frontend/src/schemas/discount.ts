import { z } from 'zod';
import { DiscountScope, DiscountType } from '@/types/shared';

export const discountSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Code is required')
      .max(20, 'Max 20 characters')
      .regex(/^[A-Z0-9]+$/, 'Code can only contain uppercase letters and digits'),
    name: z.string().min(1, 'Name is required'),
    type: z.nativeEnum(DiscountType),
    value: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Value must be a valid number (e.g. 10 or 10.00)'),
    scope: z.nativeEnum(DiscountScope),
    variantIds: z.array(z.string()).optional(),
    maxUses: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    { message: 'End date must be after start date', path: ['endsAt'] },
  );

export type DiscountFormData = z.infer<typeof discountSchema>;
