'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Supplier } from '@/types/supplier';
import { supplierKeys } from './keys';

export function useSupplierById(id: string | null) {
  const showError = useErrorToast();
  const query = useQuery<Supplier>({
    queryKey: supplierKeys.byId(id ?? ''),
    queryFn: async () => {
      const res = await api.get<Supplier>(API_ENDPOINTS.suppliers.byId(id!));
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load supplier');
  }, [query.error, showError]);

  return query;
}
