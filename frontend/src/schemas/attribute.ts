import { z } from 'zod';

export const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Max 50 characters'),
  isActive: z.boolean(),
});

export type AttributeFormData = z.infer<typeof attributeSchema>;

export const attributeValueSchema = z.object({
  value: z.string().min(1, 'Value is required').max(100, 'Max 100 characters'),
});

export type AttributeValueFormData = z.infer<typeof attributeValueSchema>;
