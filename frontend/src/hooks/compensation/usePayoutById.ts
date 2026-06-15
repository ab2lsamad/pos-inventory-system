'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { EmployeeCompensationPayout } from '@/types/compensation';
import { compensationKeys } from './keys';

export function usePayoutById(id: string | undefined) {
  const showError = useErrorToast();
  const query = useQuery<EmployeeCompensationPayout>({
    queryKey: id ? compensationKeys.payoutById(id) : ['compensation', 'payouts', 'unknown'],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<EmployeeCompensationPayout>(
        API_ENDPOINTS.compensation.payoutById(id!),
      );
      return res.data;
    },
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load payout');
    }
  }, [query.error, showError]);

  return query;
}
