'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { AddVariantPayload, ProductVariant } from '@/types/product';
import { productKeys } from './keys';

export function useAddVariant(productId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<ProductVariant, unknown, AddVariantPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<ProductVariant>(
        API_ENDPOINTS.products.variants(productId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.byId(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => showError(error, 'Failed to add variant'),
  });
}
