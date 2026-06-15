'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Attribute } from '@/types/attribute';
import { attributeKeys } from './keys';

export function useAttributesList() {
  const query = useQuery({
    queryKey: attributeKeys.list(),
    queryFn: async () => {
      const res = await api.get<Attribute[]>(API_ENDPOINTS.attributes.root);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
