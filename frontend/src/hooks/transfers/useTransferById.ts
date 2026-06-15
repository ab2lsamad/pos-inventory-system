'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { StockTransfer } from '@/types/transfer';
import { transferKeys } from './keys';

export function useTransferById(id: string | null) {
  const showError = useErrorToast();
  const query = useQuery<StockTransfer>({
    queryKey: transferKeys.byId(id ?? ''),
    queryFn: async () => {
      const res = await api.get<StockTransfer>(API_ENDPOINTS.transfers.byId(id!));
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load transfer');
  }, [query.error, showError]);

  return query;
}
