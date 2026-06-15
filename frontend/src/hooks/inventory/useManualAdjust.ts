'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { ManualAdjustPayload } from '@/types/inventory';
import { inventoryKeys } from './keys';

export function useManualAdjust() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, ManualAdjustPayload>({
    mutationFn: async (payload) => {
      await api.post(API_ENDPOINTS.inventory.adjust, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
    onError: (error) => showError(error, 'Failed to adjust inventory'),
  });
}
