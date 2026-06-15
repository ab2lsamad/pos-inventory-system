'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { StockTransfer, CreateTransferPayload } from '@/types/transfer';
import { transferKeys } from './keys';

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<StockTransfer, unknown, CreateTransferPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<StockTransfer>(API_ENDPOINTS.transfers.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transferKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create transfer'),
  });
}
