'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Category, UpdateCategoryPayload } from '@/types/category';
import { categoryKeys } from './keys';

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Category, unknown, { id: string; payload: UpdateCategoryPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Category>(API_ENDPOINTS.categories.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update category'),
  });
}
