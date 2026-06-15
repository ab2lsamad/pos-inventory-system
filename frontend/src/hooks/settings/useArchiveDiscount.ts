'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { discountKeys } from './keys';

export function useArchiveDiscount() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.patch(API_ENDPOINTS.discounts.byId(id), { isActive: false });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: discountKeys.all });
    },
    onError: (error) => showError(error, 'Failed to archive discount'),
  });
}
