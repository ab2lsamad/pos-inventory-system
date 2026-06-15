'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useDebouncedValue } from '@/hooks/shared/useDebouncedValue';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { productKeys } from '@/hooks/products/keys';
import type { Product } from '@/types/product';
import type { PaginatedResponse } from '@/types/shared';

interface UsePosProductSearchArgs {
  search?: string;
  pageSize?: number;
  enabled?: boolean;
}

export function usePosProductSearch({
  search = '',
  pageSize = 24,
  enabled = true,
}: UsePosProductSearchArgs = {}) {
  const debouncedSearch = useDebouncedValue(search, 250);
  const showError = useErrorToast();
  const baseUrl = API_ENDPOINTS.products.list(1, pageSize);
  const url = debouncedSearch
    ? `${baseUrl}&search=${encodeURIComponent(debouncedSearch)}`
    : baseUrl;

  const query = useQuery({
    queryKey: productKeys.list(1, pageSize, debouncedSearch ? { search: debouncedSearch } : undefined),
    enabled,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Product>>(url);
      return res.data;
    },
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load products');
    }
  }, [query.error, showError]);

  return {
    ...query,
    products: query.data?.data ?? [],
  };
}

export interface BarcodeResult {
  product: Product;
  matchedVariant: import('@/types/product').ProductVariant;
}

export function useProductByBarcode() {
  return async (barcode: string): Promise<BarcodeResult> => {
    // The backend responds with { product, matchedVariant } — the variant whose
    // unique barcode matched, alongside its parent product.
    const res = await api.get<BarcodeResult>(
      API_ENDPOINTS.products.byBarcode(barcode),
    );
    const { product } = res.data;
    const matchedVariant =
      res.data.matchedVariant ??
      product.variants.find((v) => v.barcode === barcode && v.isActive) ??
      product.variants.find((v) => v.isActive);
    if (!matchedVariant) {
      throw new Error('No active variant found for this barcode');
    }
    return { product, matchedVariant };
  };
}
