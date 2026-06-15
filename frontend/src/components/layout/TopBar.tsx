'use client';

import { Menu, UserRound } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getRoleVariant } from '@/lib/badge-helpers';

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuthStore();

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const roleVariant = user?.role ? getRoleVariant(user.role) : 'info';

  return (
    <header className="glass-panel sticky top-4 z-30 flex min-h-[var(--topbar-height)] items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu size={18} />
        </Button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Live Operations
          </p>
          <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
            {todayLabel}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-3 rounded-full border border-[var(--border-glass)] bg-white/75 px-2 py-2 sm:px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--navy-soft)] text-[var(--navy)]">
            <UserRound size={18} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {user?.email?.split('@')[0] ?? 'Unknown'}
            </p>
            {user?.role ? <Badge variant={roleVariant}>{user.role}</Badge> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
