'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { attributeKeys } from './keys';

export function useDeleteAttribute() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.delete(API_ENDPOINTS.attributes.byId(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to delete attribute'),
  });
}
