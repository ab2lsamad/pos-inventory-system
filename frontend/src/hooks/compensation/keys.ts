export const compensationKeys = {
  all: ['compensation'] as const,
  summary: (periodStart: string, periodEnd: string, storeId?: string) =>
    ['compensation', 'summary', periodStart, periodEnd, storeId ?? ''] as const,
  userDetail: (
    userId: string,
    periodStart: string,
    periodEnd: string,
    storeId?: string,
  ) =>
    [
      'compensation',
      'user',
      userId,
      periodStart,
      periodEnd,
      storeId ?? '',
    ] as const,
  payouts: (params?: { userId?: string; periodStart?: string; periodEnd?: string }) =>
    ['compensation', 'payouts', params ?? {}] as const,
  payoutById: (id: string) => ['compensation', 'payouts', id] as const,
};
