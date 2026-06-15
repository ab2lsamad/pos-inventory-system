import type { PurchaseOrderStatus } from '@/types/purchase-order';

export const poKeys = {
  all: ['purchase-orders'] as const,
  list: (
    page: number,
    limit: number,
    filters?: { status?: PurchaseOrderStatus; storeId?: string; supplierId?: string },
  ) => ['purchase-orders', 'list', page, limit, filters ?? {}] as const,
  byId: (id: string) => ['purchase-orders', 'detail', id] as const,
};
