'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { AttributeValue, UpdateAttributeValuePayload } from '@/types/attribute';
import { attributeKeys } from './keys';

interface UpdateAttributeValueInput {
  valueId: string;
  payload: UpdateAttributeValuePayload;
}

export function useUpdateAttributeValue() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<AttributeValue, unknown, UpdateAttributeValueInput>({
    mutationFn: async ({ valueId, payload }) => {
      const res = await api.patch<AttributeValue>(
        API_ENDPOINTS.attributes.valueById(valueId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update attribute value'),
  });
}
