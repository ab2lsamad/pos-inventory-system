'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Store } from '@/types/store';
import { storeKeys } from './keys';

export function useStoreQuery(id: string | undefined) {
  return useQuery<Store>({
    queryKey: id ? storeKeys.byId(id) : ['stores', 'detail', 'unknown'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<Store>(API_ENDPOINTS.stores.byId(id!));
      return res.data;
    },
  });
}
