export const productKeys = {
  all: ['products'] as const,
  list: (page: number, limit: number, filters?: Record<string, unknown>) =>
    ['products', 'list', page, limit, filters ?? {}] as const,
  byId: (id: string) => ['products', 'detail', id] as const,
  byBarcode: (barcode: string) => ['products', 'barcode', barcode] as const,
};
