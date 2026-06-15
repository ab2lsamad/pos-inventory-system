import { z } from 'zod';
import { requiredString } from './shared';

export const customerSchema = z.object({
  name: requiredString('Name'),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
