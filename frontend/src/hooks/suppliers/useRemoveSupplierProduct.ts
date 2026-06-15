'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { supplierKeys } from './keys';

export function useRemoveSupplierProduct(supplierId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, string>({
    mutationFn: async (variantId) => {
      await api.delete(API_ENDPOINTS.suppliers.productById(supplierId, variantId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.products(supplierId) });
    },
    onError: (error) => showError(error, 'Failed to remove product from supplier'),
  });
}
