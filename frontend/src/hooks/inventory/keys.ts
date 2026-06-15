export const inventoryKeys = {
  all: ['inventory'] as const,
  levels: (filters?: Record<string, unknown>) =>
    ['inventory', 'levels', filters ?? {}] as const,
  movements: (filters?: Record<string, unknown>) =>
    ['inventory', 'movements', filters ?? {}] as const,
};
