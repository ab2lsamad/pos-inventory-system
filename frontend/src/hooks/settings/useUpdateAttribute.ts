'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { Attribute, UpdateAttributePayload } from '@/types/attribute';
import { attributeKeys } from './keys';

interface UpdateAttributeInput {
  id: string;
  payload: UpdateAttributePayload;
}

export function useUpdateAttribute() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<Attribute, unknown, UpdateAttributeInput>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.patch<Attribute>(API_ENDPOINTS.attributes.byId(id), payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    },
    onError: (error) => showError(error, 'Failed to update attribute'),
  });
}
