'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import Badge from '@/components/ui/Badge';
import { getRoleVariant } from '@/lib/badge-helpers';
import { getVisibleRoutes } from '@/lib/route-access';
import {
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Package,
  Tags,
  Store,
  Users,
  ShoppingBag,
  WalletCards,
  X,
  LogOut,
  Layers,
  UserRound,
  Warehouse,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LINK_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/pos': ShoppingCart,
  '/orders': ListOrdered,
  '/products': Package,
  '/categories': Tags,
  '/brands': Layers,
  '/customers': UserRound,
  '/inventory': Warehouse,
  '/suppliers': Truck,
  '/purchase-orders': ClipboardList,
  '/transfers': ArrowLeftRight,
  '/stores': Store,
  '/users': Users,
  '/compensation': WalletCards,
  '/reports': BarChart2,
  '/settings': Settings,
};

const NAV_GROUPS = [
  { label: null, hrefs: ['/dashboard'] },
  { label: 'Operations', hrefs: ['/pos', '/orders', '/inventory', '/transfers', '/purchase-orders'] },
  { label: 'Catalog', hrefs: ['/products', '/categories', '/brands'] },
  { label: 'Directory', hrefs: ['/customers', '/suppliers', '/users', '/stores'] },
  { label: 'Admin', hrefs: ['/compensation', '/reports', '/settings'] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClose,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isActive: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-2xl transition ${
        collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
      } ${
        isActive
          ? 'bg-[var(--accent)] text-white'
          : 'text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon size={16} className={isActive ? 'text-white' : 'text-current'} />
      {!collapsed && (
        <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-current'}`}>
          {label}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onClose, collapsed }: { onClose?: () => void; collapsed: boolean }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const visibleHrefs = new Set(getVisibleRoutes(user?.role).map((r) => r.href));
  const routeMap = Object.fromEntries(getVisibleRoutes(user?.role).map((r) => [r.href, r]));

  const initials = user?.role?.slice(0, 2).toUpperCase() || 'User';
  const roleVariant = user?.role ? getRoleVariant(user.role) : 'info';

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-b border-[var(--border-glass)] px-4 py-4 ${
          collapsed ? 'flex-col gap-2' : 'justify-between'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
            <ShoppingBag size={18} />
          </div>
          {!collapsed && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Retail
              </p>
              <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                Pulse POS
              </h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-white/70 hover:text-[var(--text-primary)] lg:block"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-white/70 hover:text-[var(--text-primary)] lg:hidden"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => {
          const groupLinks = group.hrefs
            .filter((href) => visibleHrefs.has(href))
            .map((href) => ({
              ...routeMap[href],
              icon: LINK_ICONS[href] ?? LayoutDashboard,
            }));

          if (groupLinks.length === 0) return null;

          return (
            <React.Fragment key={gi}>
              {gi > 0 && (
                <hr className="my-1.5 border-[var(--border-glass)]" />
              )}
              <div>
                {group.label && !collapsed ? (
                  <p className="mb-0.5 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {groupLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      isActive={pathname.startsWith(link.href)}
                      onClose={onClose}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border-glass)] px-3 py-3">
        {collapsed ? (
          <div className="mb-2 flex justify-center">
            <div
              title={user?.role}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]"
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="mb-2 px-3 py-2">
            {user?.role ? (
              <div className="mb-1">
                <Badge variant={roleVariant}>{user.role}</Badge>
              </div>
            ) : null}
            <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
          </div>
        )}
        <button
          type="button"
          title={collapsed ? 'Logout' : undefined}
          className={`w-full rounded-2xl px-3 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] ${
            collapsed ? 'flex justify-center' : 'flex items-center gap-2'
          }`}
          onClick={() => {
            logout();
            toast.success('Logged out');
            onClose?.();
          }}
        >
          <LogOut size={16} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <>
      <aside
        className={`glass-panel hidden h-full overflow-hidden transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <aside className="glass-panel absolute left-3 top-3 h-[calc(100vh-1.5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden">
            <SidebarContent onClose={onClose} collapsed={false} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
