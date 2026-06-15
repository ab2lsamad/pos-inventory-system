'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  canWriteOnRoute,
  getDefaultRouteForRole,
} from '@/lib/route-access';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Guards a write-only page (create/edit screens). Users whose role lacks write
 * access on the current route are redirected to their default landing page.
 * Read access alone (e.g. a cashier viewing /products) is not enough to render
 * the wrapped form.
 */
export default function WriteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, user } = useAuthStore();
  const allowed = canWriteOnRoute(user?.role, pathname);

  useEffect(() => {
    if (isLoading || !user) return;
    if (!allowed) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [allowed, isLoading, router, user]);

  if (isLoading || !user || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return <>{children}</>;
}
