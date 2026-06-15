export const storeKeys = {
  all: ['stores'] as const,
  list: (page: number, limit: number, includeArchived?: boolean) =>
    ['stores', 'list', page, limit, includeArchived ?? false] as const,
  byId: (id: string) => ['stores', 'detail', id] as const,
};
