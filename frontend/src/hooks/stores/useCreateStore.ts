'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CreateStorePayload, Store } from '@/types/store';
import { storeKeys } from './keys';

export function useCreateStore() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Store, unknown, CreateStorePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Store>(API_ENDPOINTS.stores.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create store'),
  });
}
