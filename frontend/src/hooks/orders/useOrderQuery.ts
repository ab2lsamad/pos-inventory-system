'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Order, OrderReturnSummary } from '@/types/order';
import { orderKeys } from './keys';

export function useOrderQuery(id: string | undefined) {
  return useQuery<Order>({
    queryKey: id ? orderKeys.byId(id) : ['orders', 'detail', 'unknown'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<Order>(API_ENDPOINTS.orders.byId(id!));
      return res.data;
    },
  });
}

export function useOrderReturnSummaryQuery(id: string | undefined) {
  return useQuery<OrderReturnSummary>({
    queryKey: id
      ? orderKeys.returnSummary(id)
      : ['orders', 'return-summary', 'unknown'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<OrderReturnSummary>(
        API_ENDPOINTS.orders.returnSummary(id!),
      );
      return res.data;
    },
  });
}
