'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CreateOrderAdjustmentDto, OrderAdjustment } from '@/types/order';
import { orderKeys } from './keys';

export function useAdjustOrderReturn() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<
    OrderAdjustment,
    unknown,
    { orderId: string; payload: CreateOrderAdjustmentDto }
  >({
    mutationFn: async ({ orderId, payload }) => {
      const res = await api.post<OrderAdjustment>(
        API_ENDPOINTS.orders.adjustments(orderId),
        payload,
      );
      return res.data;
    },
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderKeys.byId(orderId) });
      void queryClient.invalidateQueries({
        queryKey: orderKeys.returnSummary(orderId),
      });
    },
    onError: (error) => showError(error, 'Failed to record return'),
  });
}
