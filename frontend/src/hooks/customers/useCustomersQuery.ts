'use client';

import { useEffect } from 'react';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Customer } from '@/types/customer';
import { customerKeys } from './keys';

interface UseCustomersQueryArgs {
  page?: number;
  pageSize?: number;
  search?: string;
  showArchived?: boolean;
  enabled?: boolean;
}

export function useCustomersQuery({
  page = 1,
  pageSize = 10,
  search,
  showArchived = false,
  enabled = true,
}: UseCustomersQueryArgs = {}) {
  const showError = useErrorToast();
  const extra: Record<string, string> = {};
  if (search) extra.search = search;
  if (showArchived) extra.includeInactive = 'true';
  const query = usePaginatedQuery<Customer>({
    queryKey: customerKeys.list(page, pageSize, search, showArchived),
    url: API_ENDPOINTS.customers.list(page, pageSize, Object.keys(extra).length ? extra : undefined),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load customers');
    }
  }, [query.error, showError]);

  return query;
}

export async function fetchAllCustomers(search?: string): Promise<Customer[]> {
  const url = API_ENDPOINTS.customers.list(1, 50, search ? { search } : undefined);
  const res = await api.get(url);
  return res.data?.data ?? [];
}
