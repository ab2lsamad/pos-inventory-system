'use client';

import { useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Category } from '@/types/category';
import { categoryKeys } from './keys';

interface UseCategoriesQueryArgs {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  enabled?: boolean;
}

export function useCategoriesQuery({
  page = 1,
  pageSize = 10,
  includeArchived = false,
  enabled = true,
}: UseCategoriesQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<Category>({
    queryKey: categoryKeys.list(page, pageSize, includeArchived),
    url: API_ENDPOINTS.categories.list(
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
      showError(query.error, 'Failed to load categories');
    }
  }, [query.error, showError]);

  return query;
}

