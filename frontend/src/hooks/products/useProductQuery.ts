'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Product } from '@/types/product';
import { productKeys } from './keys';

export function useProductQuery(id: string | undefined) {
  return useQuery<Product>({
    queryKey: id ? productKeys.byId(id) : ['products', 'detail', 'unknown'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<Product>(API_ENDPOINTS.products.byId(id!));
      return res.data;
    },
  });
}
