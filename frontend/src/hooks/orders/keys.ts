export const orderKeys = {
  all: ['orders'] as const,
  list: (page: number, limit: number, receiptNumber?: number) =>
    ['orders', 'list', page, limit, receiptNumber ?? null] as const,
  byId: (id: string) => ['orders', 'detail', id] as const,
  returnSummary: (id: string) => ['orders', 'return-summary', id] as const,
  adjustment: (id: string) => ['orders', 'adjustment', id] as const,
};
