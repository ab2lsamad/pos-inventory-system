'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { SupplierProduct } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useSupplierProducts(supplierId: string | null) {
  const showError = useErrorToast();
  const query = useQuery<SupplierProduct[]>({
    queryKey: supplierKeys.products(supplierId ?? ''),
    queryFn: async () => {
      const res = await api.get<SupplierProduct[]>(
        API_ENDPOINTS.suppliers.products(supplierId!),
      );
      return res.data;
    },
    enabled: !!supplierId,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load supplier products');
  }, [query.error, showError]);

  return query;
}
