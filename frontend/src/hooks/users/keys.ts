export const userKeys = {
  all: ['users'] as const,
  list: (page: number, limit: number) => ['users', 'list', page, limit] as const,
  byId: (id: string) => ['users', 'detail', id] as const,
};
