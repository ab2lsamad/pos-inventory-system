'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { SetReorderPayload } from '@/types/inventory';
import { inventoryKeys } from './keys';

export function useSetReorder() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, SetReorderPayload>({
    mutationFn: async (payload) => {
      await api.patch(API_ENDPOINTS.inventory.setReorder, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    onError: (error) => showError(error, 'Failed to update reorder point'),
  });
}
