'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Product, UpdateProductPayload } from '@/types/product';
import { productKeys } from './keys';

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Product, unknown, { id: string; payload: UpdateProductPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Product>(API_ENDPOINTS.products.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: productKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update product'),
  });
}
