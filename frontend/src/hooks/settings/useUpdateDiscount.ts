'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Discount, UpdateDiscountPayload } from '@/types/discount';
import { discountKeys } from './keys';

interface UpdateDiscountInput {
  id: string;
  payload: UpdateDiscountPayload;
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Discount, unknown, UpdateDiscountInput>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.patch<Discount>(API_ENDPOINTS.discounts.byId(id), payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: discountKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update discount'),
  });
}
