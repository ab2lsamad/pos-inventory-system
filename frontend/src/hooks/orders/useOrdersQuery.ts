'use client';

import { useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Order } from '@/types/order';
import { orderKeys } from './keys';

interface UseOrdersQueryArgs {
  page?: number;
  pageSize?: number;
  receiptNumber?: number;
  enabled?: boolean;
}

export function useOrdersQuery({
  page = 1,
  pageSize = 10,
  receiptNumber,
  enabled = true,
}: UseOrdersQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<Order>({
    queryKey: orderKeys.list(page, pageSize, receiptNumber),
    url: API_ENDPOINTS.orders.list(page, pageSize, { receiptNumber }),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load orders');
    }
  }, [query.error, showError]);

  return query;
}
