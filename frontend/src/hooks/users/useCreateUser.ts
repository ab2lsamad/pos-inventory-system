'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { CreateUserDto, User } from '@/types/user';
import { userKeys } from './keys';

export function useCreateUser() {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  return useMutation<User, unknown, CreateUserDto>({
    mutationFn: async (payload) => {
      const res = await api.post<User>(API_ENDPOINTS.users.root, payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => showError(error, 'Failed to create user'),
  });
}
