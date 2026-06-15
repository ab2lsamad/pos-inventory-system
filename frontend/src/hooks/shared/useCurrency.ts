'use client';

import { useAuthStore } from '@/store/auth-store';
import { useStoreQuery } from '@/hooks/stores/useStoreQuery';

/**
 * The current store's currency code (e.g. "PKR", "USD"), resolved from the
 * logged-in user's store. Falls back to "PKR" — the same default the POS
 * CartPanel uses — when there is no store context.
 */
export function useCurrency(): string {
  const storeId = useAuthStore((s) => s.user?.storeId);
  const { data: store } = useStoreQuery(storeId);
  return store?.currency ?? 'PKR';
}
