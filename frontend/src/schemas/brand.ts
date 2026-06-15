import { z } from 'zod';
import { requiredString } from './shared';

export const brandSchema = z.object({
  name: requiredString('Name'),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type BrandFormData = z.infer<typeof brandSchema>;
