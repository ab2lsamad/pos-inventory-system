import { z } from 'zod';

export const manualAdjustSchema = z.object({
  storeId: z.string().uuid('Store is required'),
  variantId: z.string().uuid('Variant is required'),
  deltaStr: z
    .string()
    .min(1, 'Delta is required')
    .refine((v) => /^-?\d+$/.test(v.trim()), 'Must be a whole number')
    .refine((v) => Number(v.trim()) !== 0, 'Delta cannot be zero'),
  reason: z.string().trim().min(1, 'Reason is required'),
});

export type ManualAdjustFormData = z.infer<typeof manualAdjustSchema>;

export const recordCountSchema = z.object({
  storeId: z.string().uuid('Store is required'),
  variantId: z.string().uuid('Variant is required'),
  countedQuantityStr: z
    .string()
    .min(1, 'Counted quantity is required')
    .refine((v) => /^\d+$/.test(v.trim()), 'Must be a non-negative whole number'),
});

export type RecordCountFormData = z.infer<typeof recordCountSchema>;

export const setReorderSchema = z.object({
  reorderPointStr: z
    .string()
    .min(1, 'Reorder point is required')
    .refine((v) => /^\d+$/.test(v.trim()), 'Must be a non-negative whole number'),
  reorderQtyStr: z
    .string()
    .refine(
      (v) => v.trim() === '' || /^\d+$/.test(v.trim()),
      'Must be a non-negative whole number',
    ),
});

export type SetReorderFormData = z.infer<typeof setReorderSchema>;
