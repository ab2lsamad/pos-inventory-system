export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (page: number, limit: number, search?: string) =>
    ['suppliers', 'list', page, limit, search ?? ''] as const,
  byId: (id: string) => ['suppliers', 'detail', id] as const,
  products: (supplierId: string) => ['suppliers', 'products', supplierId] as const,
};
