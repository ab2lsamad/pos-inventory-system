'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Category, CreateCategoryPayload } from '@/types/category';
import { categoryKeys } from './keys';

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Category, unknown, CreateCategoryPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Category>(API_ENDPOINTS.categories.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create category'),
  });
}
