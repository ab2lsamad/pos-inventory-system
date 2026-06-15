'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { canAccessPath, getDefaultRouteForRole } from '@/lib/route-access';
import Sidebar from '@/components/layout/Sidebar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrate, isLoading, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    if (!canAccessPath(user.role, pathname)) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (user && !canAccessPath(user.role, pathname)) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="gradient-bg h-screen overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex h-full w-full items-stretch gap-4">
        <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="mb-3 flex-none lg:hidden">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </Button>
          </div>
          <main className="animate-fade-in flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
