import { z } from 'zod';

export const priceSchema = z.coerce.number().nonnegative().finite();
export const positiveIntSchema = z.coerce.number().int().positive();
export const nonNegativeIntSchema = z.coerce.number().int().nonnegative();
export const skuSchema = z.string().min(1).max(64).regex(/^[A-Z0-9._-]+$/i);
export const idSchema = z.string().uuid();
export const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required`);
