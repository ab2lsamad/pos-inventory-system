export const customerKeys = {
  all: ['customers'] as const,
  list: (page: number, limit: number, search?: string, showArchived?: boolean) =>
    ['customers', 'list', page, limit, search ?? '', showArchived ?? false] as const,
  byId: (id: string) => ['customers', 'detail', id] as const,
};
