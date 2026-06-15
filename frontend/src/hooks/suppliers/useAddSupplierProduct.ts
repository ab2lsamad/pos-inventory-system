'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { SupplierProduct, UpsertSupplierProductPayload } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useAddSupplierProduct(supplierId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<SupplierProduct, unknown, UpsertSupplierProductPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<SupplierProduct>(
        API_ENDPOINTS.suppliers.products(supplierId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.products(supplierId) });
    },
    onError: (error) => showError(error, 'Failed to link product to supplier'),
  });
}
