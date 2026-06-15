'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Supplier, CreateSupplierPayload } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Supplier, unknown, CreateSupplierPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Supplier>(API_ENDPOINTS.suppliers.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create supplier'),
  });
}
