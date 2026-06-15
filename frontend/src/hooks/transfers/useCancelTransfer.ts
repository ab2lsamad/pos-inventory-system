'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { StockTransfer } from '@/types/transfer';
import { transferKeys } from './keys';

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<StockTransfer, unknown, string>({
    mutationFn: async (id) => {
      const res = await api.post<StockTransfer>(API_ENDPOINTS.transfers.cancel(id));
      return res.data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: transferKeys.all });
      void queryClient.invalidateQueries({ queryKey: transferKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to cancel transfer'),
  });
}
