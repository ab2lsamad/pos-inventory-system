'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { attributeKeys } from './keys';

export function useReorderAttributes() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, { id: string; position: number }[]>({
    mutationFn: async (items) => {
      await api.post(API_ENDPOINTS.attributes.reorder, { items });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to reorder attributes'),
  });
}
