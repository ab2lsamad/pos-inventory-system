'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { TaxRate, UpdateTaxRatePayload } from '@/types/tax-rate';
import { taxRateKeys } from './keys';

interface UpdateTaxRateInput {
  id: string;
  payload: UpdateTaxRatePayload;
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<TaxRate, unknown, UpdateTaxRateInput>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.patch<TaxRate>(API_ENDPOINTS.taxRates.byId(id), payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update tax rate'),
  });
}
