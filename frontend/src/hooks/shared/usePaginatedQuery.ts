'use client';

import { useQuery, keepPreviousData, type QueryKey } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse, PaginationMeta } from '@/types/shared';

const emptyMeta = (page: number, pageSize: number): PaginationMeta => ({
  total: 0,
  page,
  limit: pageSize,
  totalPages: 1,
});

interface UsePaginatedQueryArgs {
  queryKey: QueryKey;
  url: string;
  page: number;
  pageSize: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  queryKey,
  url,
  page,
  pageSize,
  enabled,
}: UsePaginatedQueryArgs) {
  const query = useQuery<PaginatedResponse<T>>({
    queryKey,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<T>>(url);
      return res.data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    ...query,
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? emptyMeta(page, pageSize),
  };
}
