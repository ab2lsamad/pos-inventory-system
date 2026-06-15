'use client';

import { useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import type { User } from '@/types/user';
import { userKeys } from './keys';

interface UseUsersQueryArgs {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useUsersQuery({ page = 1, pageSize = 10, enabled = true }: UseUsersQueryArgs = {}) {
  const showError = useErrorToast();
  const query = usePaginatedQuery<User>({
    queryKey: userKeys.list(page, pageSize),
    url: API_ENDPOINTS.users.list(page, pageSize),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load users');
    }
  }, [query.error, showError]);

  return query;
}
