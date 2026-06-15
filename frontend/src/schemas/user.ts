import { z } from 'zod';
import { Role } from '@/types/shared';

export const userSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z.string(),
    phone: z.string().trim().optional(),
    role: z.nativeEnum(Role),
    storeId: z.string().trim(),
    isActive: z.boolean(),
    baseSalary: z.string().trim(),
    commissionPercent: z.string().trim(),
    compensationStartDate: z.string().trim(),
    isCompensationEnabled: z.boolean(),
    editingId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const password = value.password ?? '';

    if (!value.editingId) {
      if (!password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password is required',
        });
      } else {
        if (password.length < 6) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password must be at least 6 characters',
          });
        }
        if (/\s/.test(password)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password cannot contain spaces',
          });
        }
      }
    }

    if (value.role === Role.CASHIER) {
      const salaryNum = Number(value.baseSalary);
      const commissionNum = Number(value.commissionPercent);

      if (value.baseSalary === '' || Number.isNaN(salaryNum)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baseSalary'],
          message: 'Enter a valid monthly salary',
        });
      } else if (salaryNum < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baseSalary'],
          message: 'Monthly salary cannot be negative',
        });
      }

      if (value.commissionPercent === '' || Number.isNaN(commissionNum)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionPercent'],
          message: 'Enter a valid commission percentage',
        });
      } else if (commissionNum < 0 || commissionNum > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionPercent'],
          message: 'Commission percent must be between 0 and 100',
        });
      }
    }
  });

export type UserFormData = z.infer<typeof userSchema>;

export const passwordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/^\S+$/, 'Password cannot contain spaces')
    .regex(/^[A-Za-z0-9!-/:-@[-`{-~]+$/, 'Only letters, numbers and special characters allowed'),
});

export type PasswordFormData = z.infer<typeof passwordSchema>;
