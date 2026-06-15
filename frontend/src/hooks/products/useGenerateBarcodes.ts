'use client';

import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';

/**
 * Fetch `count` unique, system-generated EAN-13 barcodes from the backend.
 * Uniqueness is guaranteed server-side against existing variants.
 */
export function useGenerateBarcodes() {
  const showError = useErrorToast();

  return useMutation<string[], unknown, number>({
    mutationFn: async (count: number) => {
      const res = await api.get<{ barcodes: string[] }>(
        API_ENDPOINTS.products.generateBarcodes(count),
      );
      return res.data.barcodes;
    },
    onError: (error) => showError(error, 'Failed to generate barcodes'),
  });
}
