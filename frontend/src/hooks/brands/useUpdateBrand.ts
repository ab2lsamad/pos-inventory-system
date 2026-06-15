'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Brand, UpdateBrandPayload } from '@/types/brand';
import { brandKeys } from './keys';

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Brand, unknown, { id: string; payload: UpdateBrandPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Brand>(API_ENDPOINTS.brands.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: brandKeys.all });
      void queryClient.invalidateQueries({ queryKey: brandKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update brand'),
  });
}
