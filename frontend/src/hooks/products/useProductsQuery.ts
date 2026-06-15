'use client';

import { useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Product } from '@/types/product';
import { productKeys } from './keys';

interface UseProductsQueryArgs {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  // Pass the expanded set (selected + descendants) so a parent-category filter
  // surfaces products tagged with any descendant. The hook joins them into a
  // single comma-separated query param.
  categoryIds?: string[];
  brandId?: string;
  includeArchived?: boolean;
  enabled?: boolean;
}

export function useProductsQuery({
  page = 1,
  pageSize = 10,
  search,
  type,
  categoryIds,
  brandId,
  includeArchived = false,
  enabled = true,
}: UseProductsQueryArgs = {}) {
  const showError = useErrorToast();

  const extra: Record<string, string | boolean> = {};
  if (search) extra.search = search;
  if (type) extra.type = type;
  if (categoryIds && categoryIds.length > 0) extra.categoryIds = categoryIds.join(',');
  if (brandId) extra.brandId = brandId;
  if (includeArchived) extra.includeArchived = true;

  const filters = {
    search,
    type,
    categoryIds: categoryIds?.slice().sort().join(',') ?? '',
    brandId,
    includeArchived,
  };

  const query = usePaginatedQuery<Product>({
    queryKey: productKeys.list(page, pageSize, filters),
    url: API_ENDPOINTS.products.list(
      page,
      pageSize,
      Object.keys(extra).length ? extra : undefined,
    ),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load products');
    }
  }, [query.error, showError]);

  return query;
}
