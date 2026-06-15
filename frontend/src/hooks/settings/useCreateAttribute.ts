'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Attribute, CreateAttributePayload } from '@/types/attribute';
import { attributeKeys } from './keys';

export function useCreateAttribute() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Attribute, unknown, CreateAttributePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<Attribute>(API_ENDPOINTS.attributes.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create attribute'),
  });
}
