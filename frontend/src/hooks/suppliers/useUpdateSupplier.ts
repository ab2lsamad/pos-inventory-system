'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Supplier, UpdateSupplierPayload } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Supplier, unknown, { id: string; payload: UpdateSupplierPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Supplier>(API_ENDPOINTS.suppliers.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      void queryClient.invalidateQueries({ queryKey: supplierKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update supplier'),
  });
}
