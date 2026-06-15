'use client';

import { useEffect } from 'react';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Supplier } from '@/types/supplier';
import { supplierKeys } from './keys';

interface UseSuppliersQueryArgs {
  page?: number;
  pageSize?: number;
  search?: string;
  enabled?: boolean;
}

export function useSuppliersQuery({
  page = 1,
  pageSize = 10,
  search,
  enabled = true,
}: UseSuppliersQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<Supplier>({
    queryKey: supplierKeys.list(page, pageSize, search),
    url: API_ENDPOINTS.suppliers.list(page, pageSize, search ? { search } : undefined),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load suppliers');
  }, [query.error, showError]);

  return query;
}
