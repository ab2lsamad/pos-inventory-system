'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CompensationDetailResponse } from '@/types/compensation';
import { compensationKeys } from './keys';

interface UseEmployeeCompensationArgs {
  userId: string | undefined;
  periodStart: string;
  periodEnd: string;
  storeId?: string;
}

export function useEmployeeCompensationQuery({
  userId,
  periodStart,
  periodEnd,
  storeId,
}: UseEmployeeCompensationArgs) {
  const showError = useErrorToast();
  const query = useQuery<CompensationDetailResponse>({
    queryKey: userId
      ? compensationKeys.userDetail(userId, periodStart, periodEnd, storeId)
      : ['compensation', 'user', 'unknown'],
    enabled: !!userId && !!periodStart && !!periodEnd,
    queryFn: async () => {
      const res = await api.get<CompensationDetailResponse>(
        API_ENDPOINTS.compensation.userDetail(userId!, periodStart, periodEnd, storeId),
      );
      return res.data;
    },
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load employee compensation');
    }
  }, [query.error, showError]);

  return query;
}
