'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { UpdateUserDto, User } from '@/types/user';
import { userKeys } from './keys';

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<User, unknown, { id: string; payload: UpdateUserDto }>({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put<User>(API_ENDPOINTS.users.byId(id), payload);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      void queryClient.invalidateQueries({ queryKey: userKeys.byId(id) });
    },
    onError: (error) => showError(error, 'Failed to update user'),
  });
}
