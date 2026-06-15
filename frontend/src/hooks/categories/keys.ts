export const categoryKeys = {
  all: ['categories'] as const,
  list: (page: number, limit: number, includeArchived?: boolean) =>
    ['categories', 'list', page, limit, includeArchived ?? false] as const,
  byId: (id: string) => ['categories', 'detail', id] as const,
};
