export const taxRateKeys = {
  all: ['tax-rates'] as const,
  list: (page: number, limit: number, includeArchived?: boolean) =>
    ['tax-rates', 'list', page, limit, includeArchived ?? false] as const,
  byId: (id: string) => ['tax-rates', 'detail', id] as const,
};

export const discountKeys = {
  all: ['discounts'] as const,
  list: (page: number, limit: number, includeArchived?: boolean) =>
    ['discounts', 'list', page, limit, includeArchived ?? false] as const,
  byId: (id: string) => ['discounts', 'detail', id] as const,
};

export const attributeKeys = {
  all: ['attributes'] as const,
  list: () => ['attributes', 'list'] as const,
  byId: (id: string) => ['attributes', 'detail', id] as const,
};
