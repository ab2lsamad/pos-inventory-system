'use client';

import { useEffect } from 'react';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchase-order';
import { poKeys } from './keys';

interface UsePoListArgs {
  page?: number;
  pageSize?: number;
  status?: PurchaseOrderStatus;
  storeId?: string;
  supplierId?: string;
  enabled?: boolean;
}

export function usePoList({
  page = 1,
  pageSize = 10,
  status,
  storeId,
  supplierId,
  enabled = true,
}: UsePoListArgs = {}) {
  const showError = useErrorToast();

  const extra: Record<string, string> = {};
  if (status) extra.status = status;
  if (storeId) extra.storeId = storeId;
  if (supplierId) extra.supplierId = supplierId;

  const filters = { status, storeId, supplierId };

  const query = usePaginatedQuery<PurchaseOrder>({
    queryKey: poKeys.list(page, pageSize, filters),
    url: API_ENDPOINTS.purchaseOrders.list(
      page,
      pageSize,
      Object.keys(extra).length ? extra : undefined,
    ),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load purchase orders');
  }, [query.error, showError]);

  return query;
}
