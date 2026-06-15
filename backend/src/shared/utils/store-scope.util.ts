import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Shape of the authenticated user injected via the `@CurrentUser()` decorator
 * (populated by JwtStrategy.validate).
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  storeId: string | null;
}

const CROSS_STORE_MESSAGE =
  'You can only access records for your assigned store';

/**
 * Resolve the effective `storeId` filter for a request.
 *
 * - ADMIN: may target any store (or all stores when none is requested).
 * - CASHIER / MANAGER: locked to their own assigned store. A request that
 *   explicitly targets a different store is rejected.
 */
export function resolveStoreScope(
  user: AuthUser,
  requestedStoreId?: string,
): string | undefined {
  if (user.role === Role.ADMIN) {
    return requestedStoreId;
  }
  if (requestedStoreId && requestedStoreId !== user.storeId) {
    throw new ForbiddenException(CROSS_STORE_MESSAGE);
  }
  return user.storeId ?? undefined;
}

/**
 * Assert that the current user may act on a record owned by `recordStoreId`.
 * ADMIN passes unconditionally; everyone else must match their own store.
 */
export function assertStoreAccess(user: AuthUser, recordStoreId: string): void {
  if (user.role === Role.ADMIN) return;
  if (recordStoreId !== user.storeId) {
    throw new ForbiddenException(CROSS_STORE_MESSAGE);
  }
}

/**
 * Assert the current user may act on a record that spans multiple stores
 * (e.g. a stock transfer with a source and destination). ADMIN passes
 * unconditionally; everyone else must be a participant in at least one side.
 */
export function assertStoreInvolved(
  user: AuthUser,
  storeIds: Array<string | null | undefined>,
): void {
  if (user.role === Role.ADMIN) return;
  if (!user.storeId || !storeIds.includes(user.storeId)) {
    throw new ForbiddenException(CROSS_STORE_MESSAGE);
  }
}
