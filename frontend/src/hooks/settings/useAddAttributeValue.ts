'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { AttributeValue, AddAttributeValuePayload } from '@/types/attribute';
import { attributeKeys } from './keys';

interface AddAttributeValueInput {
  attributeId: string;
  payload: AddAttributeValuePayload;
}

export function useAddAttributeValue() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<AttributeValue, unknown, AddAttributeValueInput>({
    mutationFn: async ({ attributeId, payload }) => {
      const res = await api.post<AttributeValue>(
        API_ENDPOINTS.attributes.addValue(attributeId),
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to add attribute value'),
  });
}
