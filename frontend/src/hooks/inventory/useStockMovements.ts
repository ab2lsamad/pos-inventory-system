'use client';

import { useEffect } from 'react';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { StockMovement } from '@/types/inventory';
import { StockMovementType } from '@/types/shared';
import { inventoryKeys } from './keys';

interface UseStockMovementsArgs {
  page?: number;
  pageSize?: number;
  storeId?: string;
  variantId?: string;
  type?: StockMovementType;
  enabled?: boolean;
}

export function useStockMovements({
  page = 1,
  pageSize = 20,
  storeId,
  variantId,
  type,
  enabled = true,
}: UseStockMovementsArgs = {}) {
  const showError = useErrorToast();
  const filters = { storeId, variantId, type };

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (storeId) params.set('storeId', storeId);
  if (variantId) params.set('variantId', variantId);
  if (type) params.set('type', type);

  const query = usePaginatedQuery<StockMovement>({
    queryKey: inventoryKeys.movements({ page, pageSize, ...filters }),
    url: `${API_ENDPOINTS.inventory.movements}?${params.toString()}`,
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load stock movements');
    }
  }, [query.error, showError]);

  return query;
}
