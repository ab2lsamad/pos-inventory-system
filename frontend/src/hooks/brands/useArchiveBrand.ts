'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { brandKeys } from './keys';

export function useArchiveBrand() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.patch(API_ENDPOINTS.brands.archive(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
    onError: (error) => showError(error, 'Failed to archive brand'),
  });
}
