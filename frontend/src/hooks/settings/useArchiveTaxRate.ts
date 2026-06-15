'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { taxRateKeys } from './keys';

export function useArchiveTaxRate() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.patch(API_ENDPOINTS.taxRates.byId(id), { isActive: false });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
    onError: (error) => showError(error, 'Failed to archive tax rate'),
  });
}
