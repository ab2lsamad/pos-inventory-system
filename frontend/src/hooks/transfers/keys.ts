import type { TransferStatus } from '@/types/transfer';

export const transferKeys = {
  all: ['transfers'] as const,
  list: (
    page: number,
    limit: number,
    filters?: { status?: TransferStatus; fromStoreId?: string; toStoreId?: string },
  ) => ['transfers', 'list', page, limit, filters ?? {}] as const,
  byId: (id: string) => ['transfers', 'detail', id] as const,
};
