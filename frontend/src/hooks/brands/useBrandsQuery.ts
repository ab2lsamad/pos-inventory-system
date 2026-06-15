'use client';

import { useEffect } from 'react';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Brand } from '@/types/brand';
import { brandKeys } from './keys';

interface UseBrandsQueryArgs {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  enabled?: boolean;
}

export function useBrandsQuery({
  page = 1,
  pageSize = 10,
  includeArchived = false,
  enabled = true,
}: UseBrandsQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<Brand>({
    queryKey: brandKeys.list(page, pageSize, includeArchived),
    url: API_ENDPOINTS.brands.list(
      page,
      pageSize,
      includeArchived ? { includeArchived: true } : undefined,
    ),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load brands');
    }
  }, [query.error, showError]);

  return query;
}

export async function fetchAllBrands(limit = 100): Promise<Brand[]> {
  const res = await api.get(API_ENDPOINTS.brands.list(1, limit));
  return res.data?.data ?? [];
}
