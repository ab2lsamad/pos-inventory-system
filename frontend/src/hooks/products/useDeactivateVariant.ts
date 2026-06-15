'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { ProductVariant } from '@/types/product';
import { productKeys } from './keys';

export function useDeactivateVariant(productId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<ProductVariant, unknown, string>({
    mutationFn: async (variantId) => {
      const res = await api.patch<ProductVariant>(
        API_ENDPOINTS.products.variantDeactivate(variantId),
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.byId(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => showError(error, 'Failed to deactivate variant'),
  });
}
