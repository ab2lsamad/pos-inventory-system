'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { attributeKeys } from './keys';

interface ReorderAttributeValuesInput {
  attributeId: string;
  items: { id: string; position: number }[];
}

export function useReorderAttributeValues() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<void, unknown, ReorderAttributeValuesInput>({
    mutationFn: async ({ attributeId, items }) => {
      await api.post(API_ENDPOINTS.attributes.reorderValues(attributeId), { items });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to reorder attribute values'),
  });
}
