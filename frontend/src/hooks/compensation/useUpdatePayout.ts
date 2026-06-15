'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { EmployeeCompensationPayout, UpdatePayoutPayload } from '@/types/compensation';
import { compensationKeys } from './keys';

export function useUpdatePayout() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<EmployeeCompensationPayout, unknown, { id: string } & UpdatePayoutPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.patch<EmployeeCompensationPayout>(
        API_ENDPOINTS.compensation.payoutById(id),
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: compensationKeys.all });
      queryClient.setQueryData(compensationKeys.payoutById(data.id), data);
    },
    onError: (error) => showError(error, 'Failed to update payout'),
  });
}
