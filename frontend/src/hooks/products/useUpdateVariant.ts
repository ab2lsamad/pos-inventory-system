'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { ProductVariant, UpdateVariantPayload } from '@/types/product';
import { productKeys } from './keys';

export function useUpdateVariant(productId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<ProductVariant, unknown, { variantId: string; payload: UpdateVariantPayload }>({
    mutationFn: async ({ variantId, payload }) => {
      const res = await api.put<ProductVariant>(
        API_ENDPOINTS.products.variantUpdate(variantId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.byId(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update variant'),
  });
}
