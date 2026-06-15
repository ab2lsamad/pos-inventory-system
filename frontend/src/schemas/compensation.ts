import { z } from 'zod';
import { PayoutStatus } from '@/types/shared';

export const payoutSchema = z
  .object({
    periodStart: z.string().trim().min(1, 'Period start is required'),
    periodEnd: z.string().trim().min(1, 'Period end is required'),
    adjustmentAmount: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || !Number.isNaN(Number(value)),
        'Adjustment must be a number',
      ),
    notes: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.periodStart && value.periodEnd && value.periodEnd < value.periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodEnd'],
        message: 'Period end must be on or after period start',
      });
    }
  });

export type PayoutFormData = z.infer<typeof payoutSchema>;

export const updatePayoutSchema = z.object({
  status: z.nativeEnum(PayoutStatus),
  notes: z.string().trim().optional(),
});

export type UpdatePayoutFormData = z.infer<typeof updatePayoutSchema>;
