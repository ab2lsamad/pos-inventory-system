'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { EmployeeCompensationPayout } from '@/types/compensation';
import { compensationKeys } from './keys';

interface CreatePayoutPayload {
  userId: string;
  periodStart: string;
  periodEnd: string;
  adjustmentAmount: number;
  notes?: string;
}

export function useCreatePayout() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<EmployeeCompensationPayout, unknown, CreatePayoutPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<EmployeeCompensationPayout>(
        API_ENDPOINTS.compensation.payouts(),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: compensationKeys.all });
    },
    onError: (error) => showError(error, 'Failed to save payout snapshot'),
  });
}
