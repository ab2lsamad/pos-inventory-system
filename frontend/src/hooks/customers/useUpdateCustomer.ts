'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Customer, UpdateCustomerPayload } from '@/types/customer';
import { customerKeys } from './keys';

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Customer, unknown, { id: string; payload: UpdateCustomerPayload }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<Customer>(API_ENDPOINTS.customers.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update customer'),
  });
}
