'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';

export interface Salesperson {
  id: string;
  fullName?: string | null;
  email: string;
  storeId?: string | null;
}

export function useSalespeople(storeId?: string, enabled = true) {
  const showError = useErrorToast();
  const query = useQuery<Salesperson[]>({
    queryKey: ['salespeople', storeId ?? 'all'],
    queryFn: async () => {
      const res = await api.get<Salesperson[]>(
        API_ENDPOINTS.users.salespeople(storeId),
      );
      return res.data ?? [];
    },
    enabled,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load salespeople');
  }, [query.error, showError]);

  return query;
}
