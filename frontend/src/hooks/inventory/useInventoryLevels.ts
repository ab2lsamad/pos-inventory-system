'use client';

import { useEffect } from 'react';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { InventoryLevel } from '@/types/inventory';
import { inventoryKeys } from './keys';

interface UseInventoryLevelsArgs {
  page?: number;
  pageSize?: number;
  storeId?: string;
  search?: string;
  lowStockOnly?: boolean;
  enabled?: boolean;
}

export function useInventoryLevels({
  page = 1,
  pageSize = 20,
  storeId,
  search,
  lowStockOnly,
  enabled = true,
}: UseInventoryLevelsArgs = {}) {
  const showError = useErrorToast();
  const filters = { storeId, search, lowStockOnly };

  const query = usePaginatedQuery<InventoryLevel>({
    queryKey: inventoryKeys.levels({ page, pageSize, ...filters }),
    url: API_ENDPOINTS.inventory.levelsList({
      page,
      limit: pageSize,
      storeId,
      search,
      lowStockOnly: lowStockOnly || undefined,
    }),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load inventory levels');
    }
  }, [query.error, showError]);

  return query;
}
