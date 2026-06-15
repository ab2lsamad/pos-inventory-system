'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Customer, CreateCustomerPayload } from '@/types/customer';
import { customerKeys } from './keys';

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Customer, unknown, CreateCustomerPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Customer>(API_ENDPOINTS.customers.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create customer'),
  });
}
