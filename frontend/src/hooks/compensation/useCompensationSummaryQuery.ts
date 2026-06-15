'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CompensationSummaryResponse } from '@/types/compensation';
import { compensationKeys } from './keys';

interface UseCompensationSummaryArgs {
  periodStart: string;
  periodEnd: string;
  storeId?: string;
  enabled?: boolean;
}

export function useCompensationSummaryQuery({
  periodStart,
  periodEnd,
  storeId,
  enabled = true,
}: UseCompensationSummaryArgs) {
  const showError = useErrorToast();
  const query = useQuery<CompensationSummaryResponse>({
    queryKey: compensationKeys.summary(periodStart, periodEnd, storeId),
    enabled: enabled && !!periodStart && !!periodEnd,
    queryFn: async () => {
      const res = await api.get<CompensationSummaryResponse>(
        API_ENDPOINTS.compensation.summary(periodStart, periodEnd, storeId),
      );
      return res.data;
    },
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load compensation summary');
    }
  }, [query.error, showError]);

  return query;
}
