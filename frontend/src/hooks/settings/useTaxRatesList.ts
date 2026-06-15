'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { TaxRate } from '@/types/tax-rate';
import type { PaginatedResponse } from '@/types/shared';
import { taxRateKeys } from './keys';

interface UseTaxRatesListParams {
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export function useTaxRatesList({
  page = 1,
  pageSize = 20,
  includeArchived = false,
}: UseTaxRatesListParams = {}) {
  const query = useQuery({
    queryKey: taxRateKeys.list(page, pageSize, includeArchived),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TaxRate>>(
        API_ENDPOINTS.taxRates.list(page, pageSize, {
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
