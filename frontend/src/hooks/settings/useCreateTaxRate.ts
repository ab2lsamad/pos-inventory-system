'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { TaxRate, CreateTaxRatePayload } from '@/types/tax-rate';
import { taxRateKeys } from './keys';

export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<TaxRate, unknown, CreateTaxRatePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<TaxRate>(API_ENDPOINTS.taxRates.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create tax rate'),
  });
}
