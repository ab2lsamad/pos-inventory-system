'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Store, UpdateStorePayload } from '@/types/store';
import { storeKeys } from './keys';

export function useUpdateStore() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Store, unknown, { id: string; payload: UpdateStorePayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Store>(API_ENDPOINTS.stores.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: storeKeys.all });
      void queryClient.invalidateQueries({ queryKey: storeKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update store'),
  });
}
