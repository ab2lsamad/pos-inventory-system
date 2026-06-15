'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { PurchaseOrder, CreatePurchaseOrderPayload } from '@/types/purchase-order';
import { poKeys } from './keys';

export function useCreatePo() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<PurchaseOrder, unknown, CreatePurchaseOrderPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: poKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create purchase order'),
  });
}
