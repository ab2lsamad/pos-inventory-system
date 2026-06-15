import { z } from 'zod';
import { requiredString, idSchema } from './shared';

export const categorySchema = z.object({
  code: requiredString('Code')
    .max(32, 'Max 32 characters')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Code may only contain uppercase letters, numbers, dashes and underscores',
    ),
  name: requiredString('Name'),
  description: z.string().trim().optional(),
  parentId: z.union([idSchema, z.literal('')]).optional(),
  taxRateId: z.union([idSchema, z.literal('')]).optional(),
  isActive: z.boolean(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
