'use client';

import { useEffect } from 'react';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Store } from '@/types/store';
import { storeKeys } from './keys';

interface UseStoresQueryArgs {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  enabled?: boolean;
}

export function useStoresQuery({
  page = 1,
  pageSize = 10,
  includeArchived = false,
  enabled = true,
}: UseStoresQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<Store>({
    queryKey: storeKeys.list(page, pageSize, includeArchived),
    url: API_ENDPOINTS.stores.list(page, pageSize, includeArchived ? { includeArchived: true } : undefined),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load stores');
    }
  }, [query.error, showError]);

  return query;
}

export async function fetchAllStores(limit = 100): Promise<Store[]> {
  const res = await api.get(API_ENDPOINTS.stores.list(1, limit));
  return res.data?.data ?? [];
}
