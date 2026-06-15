'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { orderKeys } from '@/hooks/orders/keys';
import type { CreateOrderPayload, Order } from '@/types/order';

export function useCheckout() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Order, unknown, CreateOrderPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Order>(API_ENDPOINTS.orders.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => showError(error, 'Checkout failed'),
  });
}
