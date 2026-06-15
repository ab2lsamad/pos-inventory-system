'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { customerKeys } from './keys';

export function useSetCustomerActive() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, { id: string; isActive: boolean }>({
    mutationFn: async ({ id, isActive }) => {
      await api.put(API_ENDPOINTS.customers.byId(id), { isActive });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update customer'),
  });
}
