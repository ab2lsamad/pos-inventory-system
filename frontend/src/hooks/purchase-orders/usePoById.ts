'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { PurchaseOrder } from '@/types/purchase-order';
import { poKeys } from './keys';

export function usePoById(id: string | null) {
  const showError = useErrorToast();
  const query = useQuery<PurchaseOrder>({
    queryKey: poKeys.byId(id ?? ''),
    queryFn: async () => {
      const res = await api.get<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.byId(id!));
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load purchase order');
  }, [query.error, showError]);

  return query;
}
