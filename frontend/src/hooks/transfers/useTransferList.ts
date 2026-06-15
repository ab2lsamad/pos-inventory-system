'use client';

import { useEffect } from 'react';
import { usePaginatedQuery } from '@/hooks/shared/usePaginatedQuery';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { StockTransfer, TransferStatus } from '@/types/transfer';
import { transferKeys } from './keys';

interface UseTransferListArgs {
  page?: number;
  pageSize?: number;
  status?: TransferStatus;
  fromStoreId?: string;
  toStoreId?: string;
  enabled?: boolean;
}

export function useTransferList({
  page = 1,
  pageSize = 10,
  status,
  fromStoreId,
  toStoreId,
  enabled = true,
}: UseTransferListArgs = {}) {
  const showError = useErrorToast();

  const extra: Record<string, string> = {};
  if (status) extra.status = status;
  if (fromStoreId) extra.fromStoreId = fromStoreId;
  if (toStoreId) extra.toStoreId = toStoreId;

  const filters = { status, fromStoreId, toStoreId };

  const query = usePaginatedQuery<StockTransfer>({
    queryKey: transferKeys.list(page, pageSize, filters),
    url: API_ENDPOINTS.transfers.list(
      page,
      pageSize,
      Object.keys(extra).length ? extra : undefined,
    ),
    page,
    pageSize,
    enabled,
  });

  useEffect(() => {
    if (query.error) showError(query.error, 'Failed to load transfers');
  }, [query.error, showError]);

  return query;
}
