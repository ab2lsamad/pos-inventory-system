'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { PurchaseOrder } from '@/types/purchase-order';
import { poKeys } from './keys';

export function useCancelPo() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<PurchaseOrder, unknown, string>({
    mutationFn: async (id) => {
      const res = await api.post<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.cancel(id));
      return res.data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: poKeys.all });
      void queryClient.invalidateQueries({ queryKey: poKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to cancel purchase order'),
  });
}
