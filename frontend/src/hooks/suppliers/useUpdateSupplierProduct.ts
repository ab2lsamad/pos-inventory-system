'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { SupplierProduct, UpdateSupplierProductPayload } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useUpdateSupplierProduct(supplierId: string) {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<
    SupplierProduct,
    unknown,
    { variantId: string; payload: UpdateSupplierProductPayload }
  >({
    mutationFn: async ({ variantId, payload }) => {
      const res = await api.put<SupplierProduct>(
        API_ENDPOINTS.suppliers.productById(supplierId, variantId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.products(supplierId) });
    },
    onError: (error) => showError(error, 'Failed to update supplier product'),
  });
}
