'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { OrderAdjustment } from '@/types/order';
import { orderKeys } from './keys';

export function useAdjustmentQuery(adjustmentId: string | undefined) {
  return useQuery<OrderAdjustment>({
    queryKey: adjustmentId
      ? orderKeys.adjustment(adjustmentId)
      : ['orders', 'adjustment', 'unknown'],
    enabled: !!adjustmentId,
    queryFn: async () => {
      const res = await api.get<OrderAdjustment>(
        API_ENDPOINTS.orders.adjustmentById(adjustmentId!),
      );
      return res.data;
    },
  });
}
