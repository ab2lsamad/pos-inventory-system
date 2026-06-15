import { z } from 'zod';

export const transferItemSchema = z.object({
  variantId: z.string().min(1, 'Select a variant'),
  variantLabel: z.string().optional(),
  quantity: z
    .string()
    .min(1, 'Required')
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
      'Must be a whole number ≥ 1',
    ),
});

export const transferSchema = z
  .object({
    fromStoreId: z.string().min(1, 'Select a source store'),
    toStoreId: z.string().min(1, 'Select a destination store'),
    notes: z.string().optional(),
    items: z.array(transferItemSchema).min(1, 'Add at least one line item'),
  })
  .refine((d) => d.fromStoreId !== d.toStoreId, {
    message: 'Source and destination stores must be different',
    path: ['toStoreId'],
  });

export type TransferFormData = z.infer<typeof transferSchema>;
export type TransferItemFormData = z.infer<typeof transferItemSchema>;

export const receiveTransferSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      quantityReceived: z
        .string()
        .refine(
          (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
          'Must be a whole number ≥ 0',
        ),
    }),
  ),
});

export type ReceiveTransferFormData = z.infer<typeof receiveTransferSchema>;
