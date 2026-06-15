import { z } from 'zod';
import { requiredString } from './shared';

export const storeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Code must be 2–8 characters')
    .max(8, 'Code must be 2–8 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, digits, or hyphens'),
  name: requiredString('Name'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase (e.g. PKR, USD)'),
  location: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

export type StoreFormData = z.infer<typeof storeSchema>;
