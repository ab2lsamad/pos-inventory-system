'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CreateProductPayload, Product } from '@/types/product';
import { productKeys } from './keys';

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Product, unknown, CreateProductPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Product>(API_ENDPOINTS.products.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create product'),
  });
}
