export const brandKeys = {
  all: ['brands'] as const,
  list: (page: number, limit: number, includeArchived?: boolean) =>
    ['brands', 'list', page, limit, includeArchived ?? false] as const,
  byId: (id: string) => ['brands', 'detail', id] as const,
};
