'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { parseApiError } from '@/lib/api-utils';

export function useErrorToast() {
  return useCallback((error: unknown, fallback: string) => {
    const message = parseApiError(error, fallback);
    toast.error(message);
    return message;
  }, []);
}
