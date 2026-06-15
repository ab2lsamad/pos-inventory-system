import { z } from 'zod';

export const taxRateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rate: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Rate must be a valid number (e.g. 17 or 17.50)')
    .refine((v) => parseFloat(v) >= 0 && parseFloat(v) <= 100, {
      message: 'Rate must be between 0 and 100',
    }),
  isActive: z.boolean(),
});

export type TaxRateFormData = z.infer<typeof taxRateSchema>;
