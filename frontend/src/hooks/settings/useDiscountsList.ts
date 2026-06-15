'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Discount } from '@/types/discount';
import type { PaginatedResponse } from '@/types/shared';
import { discountKeys } from './keys';

interface UseDiscountsListParams {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export function useDiscountsList({
  page = 1,
  pageSize = 20,
  includeArchived = false,
}: UseDiscountsListParams = {}) {
  const query = useQuery({
    queryKey: discountKeys.list(page, pageSize, includeArchived),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Discount>>(
        API_ENDPOINTS.discounts.list(page, pageSize, {
          includeArchived: includeArchived || undefined,
        }),
      );
      return res.data;
    },
  });

  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: pageSize, totalPages: 0 },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
