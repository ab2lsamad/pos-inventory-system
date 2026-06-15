'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Discount, CreateDiscountPayload } from '@/types/discount';
import { discountKeys } from './keys';

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Discount, unknown, CreateDiscountPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Discount>(API_ENDPOINTS.discounts.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: discountKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create discount'),
  });
}
