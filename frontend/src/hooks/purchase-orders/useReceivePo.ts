'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { PurchaseOrder, ReceivePurchaseOrderPayload } from '@/types/purchase-order';
import { poKeys } from './keys';

export function useReceivePo() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<PurchaseOrder, unknown, { id: string; payload: ReceivePurchaseOrderPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.post<PurchaseOrder>(
        API_ENDPOINTS.purchaseOrders.receive(id),
        payload,
      );
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.all });
      void queryClient.invalidateQueries({ queryKey: poKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to receive purchase order'),
  });
}
