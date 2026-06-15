'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Brand, CreateBrandPayload } from '@/types/brand';
import { brandKeys } from './keys';

export function useCreateBrand() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Brand, unknown, CreateBrandPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Brand>(API_ENDPOINTS.brands.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create brand'),
  });
}
